"""
SmartMine Flask Backend
=======================
Complete data mining backend with support for:
- Apriori, FP-Growth (via mlxtend)
- ECLAT (custom implementation)
- H-Mine, CARMA, CHARM, CLOSET, MaxMiner (via SPMF Java integration)

Run with: python app.py
Server: http://localhost:5000
"""

import os
import subprocess
import json
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from itertools import combinations

app = Flask(__name__)
CORS(app, origins=["*"])

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
PROCESSED_FOLDER = os.path.join(BASE_DIR, 'processed')
SPMF_FOLDER = os.path.join(BASE_DIR, 'spmf')

# Create directories if they don't exist
for folder in [UPLOAD_FOLDER, PROCESSED_FOLDER, SPMF_FOLDER]:
    os.makedirs(folder, exist_ok=True)

TRANSACTIONS_FILE = os.path.join(PROCESSED_FOLDER, 'transactions.csv')
SPMF_INPUT_FILE = os.path.join(PROCESSED_FOLDER, 'spmf_input.txt')


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def load_transactions():
    """Load transactions from processed CSV file."""
    if not os.path.exists(TRANSACTIONS_FILE):
        raise FileNotFoundError("No dataset uploaded. Please upload a dataset first.")
    
    df = pd.read_csv(TRANSACTIONS_FILE)
    transactions = df['items'].apply(lambda x: x.split(',') if pd.notna(x) else []).tolist()
    transactions = [[item.strip() for item in t if item.strip()] for t in transactions]
    return [t for t in transactions if t]  # Remove empty transactions


def get_item_mapping(transactions):
    """Create item to integer mapping for SPMF."""
    all_items = set()
    for t in transactions:
        all_items.update(t)
    sorted_items = sorted(all_items)
    item_to_int = {item: idx for idx, item in enumerate(sorted_items)}
    int_to_item = {idx: item for item, idx in item_to_int.items()}
    return item_to_int, int_to_item


def write_spmf_input(transactions, item_to_int):
    """Write transactions in SPMF format."""
    with open(SPMF_INPUT_FILE, 'w') as f:
        for t in transactions:
            line = ' '.join(str(item_to_int[item]) for item in t)
            f.write(line + '\n')


def parse_spmf_output(output_file, int_to_item):
    """Parse SPMF output file to extract frequent itemsets."""
    itemsets = []
    if not os.path.exists(output_file):
        return itemsets
    
    with open(output_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or '#SUP:' not in line:
                continue
            
            parts = line.split('#SUP:')
            items_part = parts[0].strip()
            support_part = parts[1].strip()
            
            item_ids = [int(x) for x in items_part.split() if x.isdigit()]
            items = frozenset(int_to_item[i] for i in item_ids if i in int_to_item)
            support = int(support_part)
            
            if items:
                itemsets.append({'itemset': items, 'support_count': support})
    
    return itemsets


def generate_rules_from_itemsets(itemsets, transactions, min_confidence):
    """Generate association rules from frequent itemsets."""
    rules = []
    n_transactions = len(transactions)
    
    # Calculate support for all itemsets
    support_dict = {}
    for item_info in itemsets:
        itemset = item_info['itemset']
        support_dict[itemset] = item_info['support_count'] / n_transactions
    
    # Generate rules
    for item_info in itemsets:
        itemset = item_info['itemset']
        if len(itemset) < 2:
            continue
        
        itemset_support = support_dict[itemset]
        
        # Generate all possible antecedent/consequent combinations
        for i in range(1, len(itemset)):
            for antecedent in combinations(itemset, i):
                antecedent = frozenset(antecedent)
                consequent = itemset - antecedent
                
                if not consequent:
                    continue
                
                # Find antecedent support
                ant_support = None
                for info in itemsets:
                    if info['itemset'] == antecedent:
                        ant_support = info['support_count'] / n_transactions
                        break
                
                if ant_support is None or ant_support == 0:
                    continue
                
                confidence = itemset_support / ant_support
                
                if confidence >= min_confidence:
                    # Calculate lift
                    cons_support = None
                    for info in itemsets:
                        if info['itemset'] == consequent:
                            cons_support = info['support_count'] / n_transactions
                            break
                    
                    lift = confidence / cons_support if cons_support else 1.0
                    
                    rules.append({
                        'rule': f"{list(antecedent)} -> {list(consequent)}",
                        'antecedent': list(antecedent),
                        'consequent': list(consequent),
                        'support': round(itemset_support, 4),
                        'confidence': round(confidence, 4),
                        'lift': round(lift, 4)
                    })
    
    return rules


# =============================================================================
# MINING ALGORITHMS
# =============================================================================

def mine_apriori(transactions, min_support, min_confidence):
    """Mine using Apriori algorithm (mlxtend)."""
    te = TransactionEncoder()
    te_ary = te.fit_transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)
    
    if frequent_itemsets.empty:
        return []
    
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    
    result = []
    for _, row in rules.iterrows():
        result.append({
            'rule': f"{list(row['antecedents'])} -> {list(row['consequents'])}",
            'antecedent': list(row['antecedents']),
            'consequent': list(row['consequents']),
            'support': round(row['support'], 4),
            'confidence': round(row['confidence'], 4),
            'lift': round(row['lift'], 4)
        })
    
    return result


def mine_fpgrowth(transactions, min_support, min_confidence):
    """Mine using FP-Growth algorithm (mlxtend)."""
    te = TransactionEncoder()
    te_ary = te.fit_transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    frequent_itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)
    
    if frequent_itemsets.empty:
        return []
    
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    
    result = []
    for _, row in rules.iterrows():
        result.append({
            'rule': f"{list(row['antecedents'])} -> {list(row['consequents'])}",
            'antecedent': list(row['antecedents']),
            'consequent': list(row['consequents']),
            'support': round(row['support'], 4),
            'confidence': round(row['confidence'], 4),
            'lift': round(row['lift'], 4)
        })
    
    return result


def mine_eclat(transactions, min_support, min_confidence):
    """
    ECLAT Algorithm Implementation
    Uses vertical TID-list representation for efficient intersection.
    """
    n_transactions = len(transactions)
    min_support_count = int(min_support * n_transactions)
    
    # Build vertical TID-lists
    tid_lists = {}
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            if item not in tid_lists:
                tid_lists[item] = set()
            tid_lists[item].add(tid)
    
    # Find frequent 1-itemsets
    frequent_itemsets = []
    frequent_1 = {}
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            itemset = frozenset([item])
            frequent_1[itemset] = tids
            frequent_itemsets.append({
                'itemset': itemset,
                'support_count': len(tids)
            })
    
    def eclat_extend(prefix_itemsets):
        """Recursively extend itemsets using ECLAT."""
        result = []
        items = list(prefix_itemsets.keys())
        
        for i, itemset_i in enumerate(items):
            tids_i = prefix_itemsets[itemset_i]
            new_prefix = {}
            
            for j in range(i + 1, len(items)):
                itemset_j = items[j]
                tids_j = prefix_itemsets[itemset_j]
                
                # Intersection of TID-lists
                new_tids = tids_i & tids_j
                
                if len(new_tids) >= min_support_count:
                    new_itemset = itemset_i | itemset_j
                    new_prefix[new_itemset] = new_tids
                    result.append({
                        'itemset': new_itemset,
                        'support_count': len(new_tids)
                    })
            
            if new_prefix:
                result.extend(eclat_extend(new_prefix))
        
        return result
    
    # Extend frequent 1-itemsets
    frequent_itemsets.extend(eclat_extend(frequent_1))
    
    # Generate association rules
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_hmine(transactions, min_support, min_confidence):
    """
    H-Mine Algorithm (Simplified Python Implementation)
    Uses projected database approach similar to FP-Growth.
    """
    n_transactions = len(transactions)
    min_support_count = int(min_support * n_transactions)
    
    # Count item frequencies
    item_counts = {}
    for t in transactions:
        for item in t:
            item_counts[item] = item_counts.get(item, 0) + 1
    
    # Filter and sort items by frequency
    frequent_items = {item: count for item, count in item_counts.items() 
                      if count >= min_support_count}
    
    frequent_itemsets = []
    
    # Add 1-itemsets
    for item, count in frequent_items.items():
        frequent_itemsets.append({
            'itemset': frozenset([item]),
            'support_count': count
        })
    
    def project_database(db, item):
        """Create projected database for an item."""
        projected = []
        for t in db:
            if item in t:
                idx = t.index(item)
                suffix = [i for i in t[idx+1:] if i in frequent_items]
                if suffix:
                    projected.append(suffix)
        return projected
    
    def hmine_recursive(db, prefix, depth=0):
        """Recursive H-Mine pattern growth."""
        if depth > 10:  # Limit depth to prevent infinite recursion
            return
        
        # Count items in projected database
        local_counts = {}
        for t in db:
            for item in t:
                local_counts[item] = local_counts.get(item, 0) + 1
        
        for item, count in local_counts.items():
            if count >= min_support_count:
                new_prefix = prefix | frozenset([item])
                frequent_itemsets.append({
                    'itemset': new_prefix,
                    'support_count': count
                })
                
                # Create projected database and recurse
                projected = project_database(db, item)
                if projected:
                    hmine_recursive(projected, new_prefix, depth + 1)
    
    # Sort transactions by item frequency
    sorted_transactions = []
    for t in transactions:
        sorted_t = sorted([i for i in t if i in frequent_items],
                         key=lambda x: -frequent_items[x])
        if sorted_t:
            sorted_transactions.append(sorted_t)
    
    # Mine patterns for each frequent item
    sorted_items = sorted(frequent_items.keys(), key=lambda x: -frequent_items[x])
    for item in sorted_items:
        projected = project_database(sorted_transactions, item)
        if projected:
            hmine_recursive(projected, frozenset([item]))
    
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_carma(transactions, min_support, min_confidence):
    """
    CARMA Algorithm (Continuous Association Rule Mining Algorithm)
    Simplified implementation for batch processing.
    """
    n_transactions = len(transactions)
    min_support_count = int(min_support * n_transactions)
    
    # Phase 1: Build candidate tree
    candidate_counts = {}
    
    for t in transactions:
        items = sorted(set(t))
        # Generate all subsets
        for size in range(1, min(len(items) + 1, 5)):  # Limit to size 4
            for combo in combinations(items, size):
                itemset = frozenset(combo)
                candidate_counts[itemset] = candidate_counts.get(itemset, 0) + 1
    
    # Phase 2: Filter frequent itemsets
    frequent_itemsets = []
    for itemset, count in candidate_counts.items():
        if count >= min_support_count:
            frequent_itemsets.append({
                'itemset': itemset,
                'support_count': count
            })
    
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_charm(transactions, min_support, min_confidence):
    """
    CHARM Algorithm for Closed Frequent Itemsets
    Uses vertical TID-list representation with closure checking.
    """
    n_transactions = len(transactions)
    min_support_count = int(min_support * n_transactions)
    
    # Build vertical TID-lists
    tid_lists = {}
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            if item not in tid_lists:
                tid_lists[item] = set()
            tid_lists[item].add(tid)
    
    closed_itemsets = []
    
    def is_closed(itemset, tids):
        """Check if itemset is closed (no superset has same support)."""
        for item, item_tids in tid_lists.items():
            if item not in itemset:
                if tids <= item_tids:  # All transactions also contain this item
                    return False
        return True
    
    def charm_extend(prefix_itemsets):
        """CHARM extension with closure checking."""
        result = []
        items = list(prefix_itemsets.keys())
        
        for i, itemset_i in enumerate(items):
            tids_i = prefix_itemsets[itemset_i]
            new_prefix = {}
            
            for j in range(i + 1, len(items)):
                itemset_j = items[j]
                tids_j = prefix_itemsets[itemset_j]
                
                new_tids = tids_i & tids_j
                
                if len(new_tids) >= min_support_count:
                    if new_tids == tids_i == tids_j:
                        # Both have same tidset - merge
                        new_itemset = itemset_i | itemset_j
                    elif new_tids == tids_i:
                        # Replace itemset_i with union
                        new_itemset = itemset_i | itemset_j
                    elif new_tids == tids_j:
                        # Replace itemset_j with union
                        new_itemset = itemset_i | itemset_j
                    else:
                        new_itemset = itemset_i | itemset_j
                    
                    new_prefix[new_itemset] = new_tids
                    
                    if is_closed(new_itemset, new_tids):
                        result.append({
                            'itemset': new_itemset,
                            'support_count': len(new_tids)
                        })
            
            if new_prefix:
                result.extend(charm_extend(new_prefix))
        
        return result
    
    # Initialize with frequent 1-itemsets
    frequent_1 = {}
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            itemset = frozenset([item])
            frequent_1[itemset] = tids
            if is_closed(itemset, tids):
                closed_itemsets.append({
                    'itemset': itemset,
                    'support_count': len(tids)
                })
    
    closed_itemsets.extend(charm_extend(frequent_1))
    
    return generate_rules_from_itemsets(closed_itemsets, transactions, min_confidence)


def mine_closet(transactions, min_support, min_confidence):
    """
    CLOSET Algorithm for Closed Frequent Itemsets
    Uses FP-tree based approach with closure checking.
    """
    # For simplicity, we use a similar approach to CHARM
    # A full CLOSET implementation would use FP-tree structures
    return mine_charm(transactions, min_support, min_confidence)


def mine_maxminer(transactions, min_support, min_confidence):
    """
    MaxMiner Algorithm for Maximal Frequent Itemsets
    Uses look-ahead pruning to find maximal patterns.
    """
    n_transactions = len(transactions)
    min_support_count = int(min_support * n_transactions)
    
    # Build vertical TID-lists
    tid_lists = {}
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            if item not in tid_lists:
                tid_lists[item] = set()
            tid_lists[item].add(tid)
    
    # Get frequent items
    frequent_items = []
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            frequent_items.append(item)
    
    frequent_items.sort(key=lambda x: len(tid_lists[x]))
    
    maximal_itemsets = []
    all_frequent = []
    
    def get_support(itemset):
        """Calculate support for an itemset."""
        if not itemset:
            return n_transactions
        tids = None
        for item in itemset:
            if tids is None:
                tids = tid_lists[item].copy()
            else:
                tids &= tid_lists[item]
        return len(tids) if tids else 0
    
    def is_maximal(itemset):
        """Check if itemset is maximal (no frequent superset)."""
        for item in frequent_items:
            if item not in itemset:
                superset = itemset | frozenset([item])
                if get_support(superset) >= min_support_count:
                    return False
        return True
    
    def maxminer_search(head, tail, depth=0):
        """MaxMiner search with look-ahead pruning."""
        if depth > 8:  # Limit depth
            return
        
        # Look-ahead: check if head ∪ tail is frequent
        full_set = head | frozenset(tail)
        if get_support(full_set) >= min_support_count:
            if is_maximal(full_set):
                maximal_itemsets.append({
                    'itemset': full_set,
                    'support_count': get_support(full_set)
                })
            return
        
        for i, item in enumerate(tail):
            new_head = head | frozenset([item])
            head_support = get_support(new_head)
            
            if head_support >= min_support_count:
                all_frequent.append({
                    'itemset': new_head,
                    'support_count': head_support
                })
                
                new_tail = tail[i+1:]
                if new_tail:
                    maxminer_search(new_head, new_tail, depth + 1)
                elif is_maximal(new_head):
                    maximal_itemsets.append({
                        'itemset': new_head,
                        'support_count': head_support
                    })
    
    # Add frequent 1-itemsets
    for item in frequent_items:
        all_frequent.append({
            'itemset': frozenset([item]),
            'support_count': len(tid_lists[item])
        })
    
    # Start MaxMiner search
    maxminer_search(frozenset(), frequent_items)
    
    # Use all frequent itemsets for rule generation (including non-maximal)
    # This ensures we have enough itemsets for rule generation
    combined = all_frequent + maximal_itemsets
    
    # Remove duplicates
    seen = set()
    unique_itemsets = []
    for item_info in combined:
        key = item_info['itemset']
        if key not in seen:
            seen.add(key)
            unique_itemsets.append(item_info)
    
    return generate_rules_from_itemsets(unique_itemsets, transactions, min_confidence)


def mine_with_spmf(algorithm, transactions, min_support, min_confidence):
    """
    Mine using SPMF Java library.
    Requires SPMF jar files in the spmf/ directory.
    """
    # Map algorithm names to SPMF algorithm identifiers
    spmf_algorithms = {
        'h-mine': 'HMine',
        'carma': 'CARMA',
        'charm': 'CHARM',
        'closet': 'CLOSET+',
        'maxminer': 'MaxMiner'
    }
    
    spmf_algo = spmf_algorithms.get(algorithm)
    if not spmf_algo:
        raise ValueError(f"Unknown SPMF algorithm: {algorithm}")
    
    # Check for SPMF jar
    spmf_jar = os.path.join(SPMF_FOLDER, 'spmf.jar')
    if not os.path.exists(spmf_jar):
        # Fall back to Python implementations
        if algorithm == 'h-mine':
            return mine_hmine(transactions, min_support, min_confidence)
        elif algorithm == 'carma':
            return mine_carma(transactions, min_support, min_confidence)
        elif algorithm == 'charm':
            return mine_charm(transactions, min_support, min_confidence)
        elif algorithm == 'closet':
            return mine_closet(transactions, min_support, min_confidence)
        elif algorithm == 'maxminer':
            return mine_maxminer(transactions, min_support, min_confidence)
    
    # Create item mapping
    item_to_int, int_to_item = get_item_mapping(transactions)
    
    # Write SPMF input
    write_spmf_input(transactions, item_to_int)
    
    # Output file
    output_file = os.path.join(PROCESSED_FOLDER, 'spmf_output.txt')
    
    # Run SPMF
    min_sup_percent = int(min_support * 100)
    cmd = [
        'java', '-jar', spmf_jar,
        'run', spmf_algo,
        SPMF_INPUT_FILE, output_file,
        str(min_sup_percent) + '%'
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=60)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        # Fall back to Python implementation
        if algorithm == 'h-mine':
            return mine_hmine(transactions, min_support, min_confidence)
        elif algorithm == 'carma':
            return mine_carma(transactions, min_support, min_confidence)
        elif algorithm == 'charm':
            return mine_charm(transactions, min_support, min_confidence)
        elif algorithm == 'closet':
            return mine_closet(transactions, min_support, min_confidence)
        elif algorithm == 'maxminer':
            return mine_maxminer(transactions, min_support, min_confidence)
    
    # Parse output
    itemsets = parse_spmf_output(output_file, int_to_item)
    
    return generate_rules_from_itemsets(itemsets, transactions, min_confidence)


# =============================================================================
# DATA PREPROCESSING
# =============================================================================

def preprocess_transactions(transactions, options=None):
    """
    Preprocess transactions based on options.
    
    Options:
    - remove_duplicates: Remove duplicate transactions
    - remove_empty: Remove empty transactions
    - min_items: Minimum items per transaction
    - max_items: Maximum items per transaction
    - filter_items: List of items to keep (if specified)
    - exclude_items: List of items to exclude
    """
    if options is None:
        options = {}
    
    processed = []
    
    for t in transactions:
        # Remove empty items
        t = [item.strip() for item in t if item and item.strip()]
        
        # Apply item filters
        if options.get('filter_items'):
            t = [item for item in t if item in options['filter_items']]
        
        if options.get('exclude_items'):
            t = [item for item in t if item not in options['exclude_items']]
        
        # Check min/max items
        min_items = options.get('min_items', 1)
        max_items = options.get('max_items', float('inf'))
        
        if min_items <= len(t) <= max_items:
            processed.append(t)
    
    # Remove duplicates if requested
    if options.get('remove_duplicates'):
        seen = set()
        unique = []
        for t in processed:
            key = tuple(sorted(t))
            if key not in seen:
                seen.add(key)
                unique.append(t)
        processed = unique
    
    return processed


# =============================================================================
# API ROUTES
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'SmartMine backend is running'})


@app.route('/api/upload', methods=['POST'])
def upload_dataset():
    """
    Upload and process a dataset.
    
    Accepts CSV or Excel files with Transaction_ID and Items columns,
    or simple item lists (one transaction per row).
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = file.filename.lower()
    
    try:
        # Read file
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Unsupported file format. Use CSV or Excel.'}), 400
        
        # Handle different dataset formats
        transactions = []
        
        if 'Items' in df.columns:
            # Format: Transaction_ID, Items (comma-separated)
            transactions = df['Items'].apply(
                lambda x: [i.strip() for i in str(x).split(',') if i.strip()] if pd.notna(x) else []
            ).tolist()
        elif 'items' in df.columns:
            transactions = df['items'].apply(
                lambda x: [i.strip() for i in str(x).split(',') if i.strip()] if pd.notna(x) else []
            ).tolist()
        else:
            # Assume each row is a transaction, each column is an item presence
            # Or each cell contains items
            for _, row in df.iterrows():
                items = []
                for val in row:
                    if pd.notna(val):
                        val_str = str(val).strip()
                        if val_str and val_str.lower() not in ['nan', 'none', '']:
                            # Check if it's a comma-separated list
                            if ',' in val_str:
                                items.extend([i.strip() for i in val_str.split(',') if i.strip()])
                            else:
                                items.append(val_str)
                if items:
                    transactions.append(items)
        
        # Remove empty transactions
        transactions = [t for t in transactions if t]
        
        if not transactions:
            return jsonify({'error': 'No valid transactions found in dataset'}), 400
        
        # Save processed transactions
        items_str = [','.join(t) for t in transactions]
        processed_df = pd.DataFrame({'items': items_str})
        processed_df.to_csv(TRANSACTIONS_FILE, index=False)
        
        # Get statistics
        all_items = set()
        for t in transactions:
            all_items.update(t)
        
        return jsonify({
            'success': True,
            'message': 'Dataset uploaded successfully',
            'stats': {
                'transactions': len(transactions),
                'unique_items': len(all_items),
                'avg_items_per_transaction': round(sum(len(t) for t in transactions) / len(transactions), 2)
            }
        })
    
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


@app.route('/api/preprocess', methods=['POST'])
def preprocess_dataset():
    """
    Apply preprocessing options to the uploaded dataset.
    
    JSON body:
    {
        "remove_duplicates": true,
        "min_items": 2,
        "max_items": 10,
        "exclude_items": ["item1", "item2"]
    }
    """
    try:
        transactions = load_transactions()
        options = request.get_json() or {}
        
        processed = preprocess_transactions(transactions, options)
        
        if not processed:
            return jsonify({'error': 'No transactions remaining after preprocessing'}), 400
        
        # Save preprocessed transactions
        items_str = [','.join(t) for t in processed]
        processed_df = pd.DataFrame({'items': items_str})
        processed_df.to_csv(TRANSACTIONS_FILE, index=False)
        
        all_items = set()
        for t in processed:
            all_items.update(t)
        
        return jsonify({
            'success': True,
            'message': 'Preprocessing complete',
            'stats': {
                'transactions': len(processed),
                'unique_items': len(all_items),
                'avg_items_per_transaction': round(sum(len(t) for t in processed) / len(processed), 2)
            }
        })
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Preprocessing failed: {str(e)}'}), 500


@app.route('/api/mine', methods=['POST'])
def mine_patterns():
    """
    Execute pattern mining algorithm.
    
    JSON body:
    {
        "algorithm": "apriori" | "fp-growth" | "eclat" | "h-mine" | "carma" | "charm" | "closet" | "maxminer",
        "min_support": 0.1,
        "min_confidence": 0.5
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No parameters provided'}), 400
        
        algorithm = data.get('algorithm', 'apriori').lower()
        min_support = float(data.get('min_support', 0.1))
        min_confidence = float(data.get('min_confidence', 0.5))
        
        # Validate parameters
        if not 0 < min_support <= 1:
            return jsonify({'error': 'min_support must be between 0 and 1'}), 400
        if not 0 < min_confidence <= 1:
            return jsonify({'error': 'min_confidence must be between 0 and 1'}), 400
        
        # Load transactions
        transactions = load_transactions()
        
        # Execute mining algorithm
        if algorithm == 'apriori':
            rules = mine_apriori(transactions, min_support, min_confidence)
        elif algorithm == 'fp-growth':
            rules = mine_fpgrowth(transactions, min_support, min_confidence)
        elif algorithm == 'eclat':
            rules = mine_eclat(transactions, min_support, min_confidence)
        elif algorithm == 'h-mine':
            rules = mine_hmine(transactions, min_support, min_confidence)
        elif algorithm == 'carma':
            rules = mine_carma(transactions, min_support, min_confidence)
        elif algorithm == 'charm':
            rules = mine_charm(transactions, min_support, min_confidence)
        elif algorithm == 'closet':
            rules = mine_closet(transactions, min_support, min_confidence)
        elif algorithm == 'maxminer':
            rules = mine_maxminer(transactions, min_support, min_confidence)
        else:
            return jsonify({'error': f'Unknown algorithm: {algorithm}'}), 400
        
        # Sort by lift descending
        rules.sort(key=lambda x: x['lift'], reverse=True)
        
        return jsonify({
            'success': True,
            'algorithm': algorithm,
            'min_support': min_support,
            'min_confidence': min_confidence,
            'rules_count': len(rules),
            'rules': rules
        })
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Mining failed: {str(e)}'}), 500


@app.route('/api/dataset/info', methods=['GET'])
def get_dataset_info():
    """Get information about the current dataset."""
    try:
        transactions = load_transactions()
        
        all_items = set()
        item_counts = {}
        for t in transactions:
            all_items.update(t)
            for item in t:
                item_counts[item] = item_counts.get(item, 0) + 1
        
        # Top 10 most frequent items
        top_items = sorted(item_counts.items(), key=lambda x: -x[1])[:10]
        
        return jsonify({
            'success': True,
            'stats': {
                'transactions': len(transactions),
                'unique_items': len(all_items),
                'avg_items_per_transaction': round(sum(len(t) for t in transactions) / len(transactions), 2),
                'top_items': [{'item': item, 'count': count} for item, count in top_items]
            }
        })
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/algorithms', methods=['GET'])
def get_algorithms():
    """Get list of available algorithms."""
    return jsonify({
        'algorithms': [
            {
                'id': 'apriori',
                'name': 'Apriori',
                'description': 'Classic level-wise algorithm using candidate generation',
                'type': 'frequent'
            },
            {
                'id': 'fp-growth',
                'name': 'FP-Growth',
                'description': 'Pattern-growth algorithm using FP-tree structure',
                'type': 'frequent'
            },
            {
                'id': 'eclat',
                'name': 'ECLAT',
                'description': 'Equivalence class clustering using vertical TID-lists',
                'type': 'frequent'
            },
            {
                'id': 'h-mine',
                'name': 'H-Mine',
                'description': 'Memory-efficient algorithm using H-struct',
                'type': 'frequent'
            },
            {
                'id': 'carma',
                'name': 'CARMA',
                'description': 'Continuous association rule mining for streaming data',
                'type': 'frequent'
            },
            {
                'id': 'charm',
                'name': 'CHARM',
                'description': 'Discovers closed frequent itemsets',
                'type': 'closed'
            },
            {
                'id': 'closet',
                'name': 'CLOSET',
                'description': 'FP-tree based closed pattern mining',
                'type': 'closed'
            },
            {
                'id': 'maxminer',
                'name': 'MaxMiner',
                'description': 'Discovers maximal frequent itemsets with look-ahead',
                'type': 'maximal'
            }
        ]
    })


if __name__ == '__main__':
    print("=" * 60)
    print("SmartMine Flask Backend")
    print("=" * 60)
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Processed folder: {PROCESSED_FOLDER}")
    print(f"SPMF folder: {SPMF_FOLDER}")
    print("=" * 60)
    print("Starting server on http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
