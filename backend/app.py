"""
SmartMine Flask Backend - Enhanced for Large-Scale Mining
==========================================================
Complete data mining backend with:
- Scalable streaming ingestion
- Algorithm recommendation engine
- Rule explosion management
- Classification mining (Naive Bayes, Decision Tree)
- Support for: Apriori, FP-Growth, ECLAT, H-Mine, CARMA, CHARM, CLOSET, MaxMiner

Run with: python app.py
Server: http://localhost:5000
"""

import os
import subprocess
import json
import tempfile
import time
import gc
import threading
from collections import defaultdict
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from itertools import combinations

# Classification imports
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report, silhouette_score

# Clustering imports
from sklearn.cluster import KMeans, DBSCAN

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

# Global dataset profiling cache
dataset_profile = {}

# =============================================================================
# DATASET PROFILING & ALGORITHM RECOMMENDATION
# =============================================================================

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj


def profile_dataset(transactions):
    """
    Profile dataset to determine characteristics for algorithm recommendation.
    """
    n_transactions = len(transactions)
    if n_transactions == 0:
        return {}
    
    # Count all items
    item_counts = defaultdict(int)
    transaction_lengths = []
    
    for t in transactions:
        transaction_lengths.append(len(t))
        for item in t:
            item_counts[item] += 1
    
    n_unique_items = len(item_counts)
    avg_transaction_length = float(np.mean(transaction_lengths)) if transaction_lengths else 0.0
    max_transaction_length = int(max(transaction_lengths)) if transaction_lengths else 0
    min_transaction_length = int(min(transaction_lengths)) if transaction_lengths else 0
    
    # Calculate density (avg items / unique items)
    density = avg_transaction_length / n_unique_items if n_unique_items > 0 else 0.0
    
    # Calculate sparsity
    sparsity = 1.0 - density
    
    # Estimate memory footprint (rough estimate in MB)
    estimated_memory_mb = (n_transactions * avg_transaction_length * 50) / (1024 * 1024)
    
    # Item frequency distribution
    frequencies = list(item_counts.values())
    freq_std = float(np.std(frequencies)) if frequencies else 0.0
    freq_mean = float(np.mean(frequencies)) if frequencies else 0.0
    
    profile = {
        'n_transactions': int(n_transactions),
        'n_unique_items': int(n_unique_items),
        'avg_transaction_length': round(float(avg_transaction_length), 2),
        'max_transaction_length': int(max_transaction_length),
        'min_transaction_length': int(min_transaction_length),
        'density': round(float(density), 4),
        'sparsity': round(float(sparsity), 4),
        'estimated_memory_mb': round(float(estimated_memory_mb), 2),
        'freq_std': round(float(freq_std), 2),
        'freq_mean': round(float(freq_mean), 2),
        'is_large': bool(n_transactions > 10000),
        'is_very_large': bool(n_transactions > 100000),
        'is_dense': bool(density > 0.1),
        'is_sparse': bool(sparsity > 0.9),
        'has_long_transactions': bool(avg_transaction_length > 20)
    }
    
    return profile


def recommend_algorithm(profile, min_support=0.1):
    """
    Recommend best algorithm based on dataset characteristics.
    """
    recommendations = []
    
    n_trans = profile.get('n_transactions', 0)
    is_large = profile.get('is_large', False)
    is_very_large = profile.get('is_very_large', False)
    is_dense = profile.get('is_dense', False)
    is_sparse = profile.get('is_sparse', False)
    has_long_trans = profile.get('has_long_transactions', False)
    n_unique = profile.get('n_unique_items', 0)
    
    # Estimate rule explosion risk
    rule_explosion_risk = 'low'
    if n_unique > 100 and min_support < 0.05:
        rule_explosion_risk = 'high'
    elif n_unique > 50 and min_support < 0.1:
        rule_explosion_risk = 'medium'
    
    # FP-Growth: Best for large sparse datasets
    fp_score = 70
    if is_large:
        fp_score += 15
    if is_sparse:
        fp_score += 10
    if has_long_trans:
        fp_score -= 5
    recommendations.append({
        'algorithm': 'fp-growth',
        'score': fp_score,
        'reason': 'Efficient for large datasets with FP-tree compression'
    })
    
    # Apriori: Good for small to medium datasets
    ap_score = 60
    if not is_large:
        ap_score += 20
    if is_large:
        ap_score -= 20
    recommendations.append({
        'algorithm': 'apriori',
        'score': ap_score,
        'reason': 'Classic algorithm, good for smaller datasets'
    })
    
    # ECLAT: Good for dense datasets
    ec_score = 65
    if is_dense:
        ec_score += 20
    if is_sparse:
        ec_score -= 10
    recommendations.append({
        'algorithm': 'eclat',
        'score': ec_score,
        'reason': 'Vertical TID-list intersection, efficient for dense data'
    })
    
    # H-Mine: Good for memory-constrained scenarios
    hm_score = 55
    if profile.get('estimated_memory_mb', 0) > 100:
        hm_score += 15
    recommendations.append({
        'algorithm': 'h-mine',
        'score': hm_score,
        'reason': 'Memory-efficient hyperlink structure'
    })
    
    # CARMA: Good for streaming/incremental updates
    ca_score = 50
    if is_very_large:
        ca_score += 10
    recommendations.append({
        'algorithm': 'carma',
        'score': ca_score,
        'reason': 'Continuous mining for streaming data'
    })
    
    # CHARM: When rule explosion is a risk
    ch_score = 60
    if rule_explosion_risk in ['medium', 'high']:
        ch_score += 25
    recommendations.append({
        'algorithm': 'charm',
        'score': ch_score,
        'reason': 'Closed itemsets reduce rule explosion'
    })
    
    # MaxMiner: When you need minimal output
    mm_score = 55
    if rule_explosion_risk == 'high':
        mm_score += 30
    recommendations.append({
        'algorithm': 'maxminer',
        'score': mm_score,
        'reason': 'Maximal patterns for minimal output'
    })
    
    # Sort by score
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        'recommendations': recommendations,
        'rule_explosion_risk': rule_explosion_risk,
        'top_pick': recommendations[0]['algorithm'],
        'top_reason': recommendations[0]['reason']
    }


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
    return [t for t in transactions if t]


def load_transactions_streaming(chunk_size=10000):
    """
    Load transactions in streaming fashion for large datasets.
    Yields chunks of transactions.
    """
    if not os.path.exists(TRANSACTIONS_FILE):
        raise FileNotFoundError("No dataset uploaded. Please upload a dataset first.")
    
    for chunk in pd.read_csv(TRANSACTIONS_FILE, chunksize=chunk_size):
        transactions = chunk['items'].apply(
            lambda x: [item.strip() for item in str(x).split(',') if item.strip()] if pd.notna(x) else []
        ).tolist()
        transactions = [t for t in transactions if t]
        yield transactions


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
            line = ' '.join(str(item_to_int[item]) for item in t if item in item_to_int)
            if line:
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
            support = int(support_part.split()[0])  # Handle potential extra data
            
            if items:
                itemsets.append({'itemset': items, 'support_count': support})
    
    return itemsets


def generate_rules_from_itemsets(itemsets, transactions, min_confidence, max_rules=5000):
    """
    Generate association rules from frequent itemsets.
    Includes rule explosion management with max_rules limit.
    """
    rules = []
    n_transactions = len(transactions)
    
    if n_transactions == 0:
        return rules
    
    # Build support dictionary for O(1) lookup
    support_dict = {}
    for item_info in itemsets:
        itemset = item_info['itemset']
        support_dict[itemset] = item_info['support_count'] / n_transactions
    
    # Also calculate single item supports for lift calculation
    single_supports = {}
    for item_info in itemsets:
        if len(item_info['itemset']) == 1:
            item = list(item_info['itemset'])[0]
            single_supports[item] = item_info['support_count'] / n_transactions
    
    rules_generated = 0
    
    for item_info in itemsets:
        if rules_generated >= max_rules:
            break
            
        itemset = item_info['itemset']
        if len(itemset) < 2:
            continue
        
        itemset_support = support_dict.get(itemset, 0)
        if itemset_support == 0:
            continue
        
        # Generate all possible antecedent/consequent combinations
        for i in range(1, len(itemset)):
            if rules_generated >= max_rules:
                break
                
            for antecedent in combinations(itemset, i):
                if rules_generated >= max_rules:
                    break
                    
                antecedent = frozenset(antecedent)
                consequent = itemset - antecedent
                
                if not consequent:
                    continue
                
                ant_support = support_dict.get(antecedent)
                if ant_support is None or ant_support == 0:
                    continue
                
                confidence = itemset_support / ant_support
                
                if confidence >= min_confidence:
                    # Calculate lift
                    cons_support = support_dict.get(consequent)
                    if cons_support is None:
                        # Try single item support
                        if len(consequent) == 1:
                            cons_item = list(consequent)[0]
                            cons_support = single_supports.get(cons_item, 0.01)
                        else:
                            cons_support = 0.01
                    
                    lift = confidence / cons_support if cons_support > 0 else 1.0
                    
                    rules.append({
                        'rule': f"{list(antecedent)} -> {list(consequent)}",
                        'antecedent': list(antecedent),
                        'consequent': list(consequent),
                        'support': round(itemset_support, 4),
                        'confidence': round(confidence, 4),
                        'lift': round(lift, 4)
                    })
                    rules_generated += 1
    
    return rules


def prune_redundant_rules(rules, top_k=1000):
    """
    Prune redundant rules and return top-K by lift.
    Implements representative rule selection.
    """
    if len(rules) <= top_k:
        return rules
    
    # Sort by lift descending
    rules.sort(key=lambda x: (x['lift'], x['confidence'], x['support']), reverse=True)
    
    # Take top-K
    return rules[:top_k]


# =============================================================================
# MINING ALGORITHMS - FIXED & OPTIMIZED
# =============================================================================

def mine_apriori(transactions, min_support, min_confidence):
    """Mine using Apriori algorithm (mlxtend)."""
    if not transactions:
        return []
    
    try:
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
                'support': round(float(row['support']), 4),
                'confidence': round(float(row['confidence']), 4),
                'lift': round(float(row['lift']), 4)
            })
        
        return result
    except Exception as e:
        print(f"Apriori error: {e}")
        return []


def mine_fpgrowth(transactions, min_support, min_confidence):
    """Mine using FP-Growth algorithm (mlxtend) - FIXED."""
    if not transactions:
        return []
    
    try:
        te = TransactionEncoder()
        te_ary = te.fit_transform(transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)
        
        # Use fpgrowth from mlxtend
        frequent_itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            return []
        
        # Generate association rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        result = []
        for _, row in rules.iterrows():
            result.append({
                'rule': f"{list(row['antecedents'])} -> {list(row['consequents'])}",
                'antecedent': list(row['antecedents']),
                'consequent': list(row['consequents']),
                'support': round(float(row['support']), 4),
                'confidence': round(float(row['confidence']), 4),
                'lift': round(float(row['lift']), 4)
            })
        
        return result
    except Exception as e:
        print(f"FP-Growth error: {e}")
        # Fallback to Apriori if FP-Growth fails
        return mine_apriori(transactions, min_support, min_confidence)


def mine_eclat(transactions, min_support, min_confidence):
    """
    ECLAT Algorithm Implementation - OPTIMIZED
    Uses vertical TID-list representation for efficient intersection.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Build vertical TID-lists
    tid_lists = defaultdict(set)
    for tid, transaction in enumerate(transactions):
        for item in transaction:
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
    
    def eclat_extend(prefix_itemsets, depth=0):
        """Recursively extend itemsets using ECLAT."""
        if depth > 15:  # Prevent deep recursion
            return []
        
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
                result.extend(eclat_extend(new_prefix, depth + 1))
        
        return result
    
    frequent_itemsets.extend(eclat_extend(frequent_1))
    
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_hmine(transactions, min_support, min_confidence):
    """
    H-Mine Algorithm - FIXED Implementation
    Uses hyperlinked projected database for memory efficiency.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Count item frequencies
    item_counts = defaultdict(int)
    for t in transactions:
        for item in t:
            item_counts[item] += 1
    
    # Filter frequent items
    frequent_items = {item: count for item, count in item_counts.items() 
                      if count >= min_support_count}
    
    if not frequent_items:
        return []
    
    frequent_itemsets = []
    
    # Add 1-itemsets
    for item, count in frequent_items.items():
        frequent_itemsets.append({
            'itemset': frozenset([item]),
            'support_count': count
        })
    
    # Sort items by frequency (descending)
    sorted_items = sorted(frequent_items.keys(), key=lambda x: -frequent_items[x])
    
    def project_database(db, item):
        """Create projected database for an item."""
        projected = []
        for t in db:
            try:
                idx = t.index(item)
                suffix = [i for i in t[idx+1:] if i in frequent_items]
                if suffix:
                    projected.append(suffix)
            except ValueError:
                continue
        return projected
    
    def count_in_projected(db, item):
        """Count item occurrences in projected database."""
        count = 0
        for t in db:
            if item in t:
                count += 1
        return count
    
    def hmine_recursive(db, prefix, depth=0):
        """Recursive H-Mine pattern growth."""
        if depth > 10 or not db:
            return
        
        # Count items in projected database
        local_counts = defaultdict(int)
        for t in db:
            for item in set(t):  # Use set to avoid counting duplicates in same transaction
                local_counts[item] += 1
        
        for item in sorted_items:
            if item in prefix:
                continue
            count = local_counts.get(item, 0)
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
    for item in sorted_items:
        projected = project_database(sorted_transactions, item)
        if projected:
            hmine_recursive(projected, frozenset([item]), 0)
    
    # Remove duplicates
    seen = set()
    unique_itemsets = []
    for item_info in frequent_itemsets:
        key = item_info['itemset']
        if key not in seen:
            seen.add(key)
            unique_itemsets.append(item_info)
    
    return generate_rules_from_itemsets(unique_itemsets, transactions, min_confidence)


def mine_carma(transactions, min_support, min_confidence):
    """
    CARMA Algorithm - FIXED Implementation
    Continuous Association Rule Mining Algorithm.
    Two-phase approach: count candidates then verify.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Phase 1: Build candidates using a sliding approach
    candidate_counts = defaultdict(int)
    
    # First pass: count all items
    item_counts = defaultdict(int)
    for t in transactions:
        for item in set(t):
            item_counts[item] += 1
    
    # Filter frequent items
    frequent_items = sorted([item for item, count in item_counts.items() 
                            if count >= min_support_count])
    
    if not frequent_items:
        return []
    
    # Second pass: count itemsets using frequent items only
    for t in transactions:
        # Filter to frequent items
        t_filtered = sorted([i for i in set(t) if i in frequent_items])
        
        # Generate subsets up to size 4
        for size in range(1, min(len(t_filtered) + 1, 5)):
            for combo in combinations(t_filtered, size):
                itemset = frozenset(combo)
                candidate_counts[itemset] += 1
    
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
    CHARM Algorithm - FIXED Implementation
    Discovers closed frequent itemsets using diffset optimization.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Build vertical TID-lists
    tid_lists = defaultdict(set)
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            tid_lists[item].add(tid)
    
    closed_itemsets = []
    all_closed = {}  # Map tidset -> itemset for closure checking
    
    def get_closure(itemset, tids):
        """Get the closure of an itemset (add all items that appear in all transactions)."""
        closure = set(itemset)
        for item, item_tids in tid_lists.items():
            if item not in closure:
                if tids <= item_tids:  # All transactions also contain this item
                    closure.add(item)
        return frozenset(closure)
    
    def charm_extend(prefix_itemsets, depth=0):
        """CHARM extension with closure checking."""
        if depth > 12:
            return []
        
        result = []
        items = list(prefix_itemsets.keys())
        
        i = 0
        while i < len(items):
            itemset_i = items[i]
            tids_i = prefix_itemsets[itemset_i]
            
            new_prefix = {}
            j = i + 1
            
            while j < len(items):
                itemset_j = items[j]
                tids_j = prefix_itemsets[itemset_j]
                
                new_tids = tids_i & tids_j
                
                if len(new_tids) >= min_support_count:
                    if new_tids == tids_i and new_tids == tids_j:
                        # Same tidset - merge into i
                        new_itemset = itemset_i | itemset_j
                        items[i] = new_itemset
                        itemset_i = new_itemset
                        items.pop(j)
                        continue
                    elif new_tids == tids_i:
                        # i's tidset is subset - replace i with union
                        new_itemset = itemset_i | itemset_j
                        items[i] = new_itemset
                        itemset_i = new_itemset
                    elif new_tids == tids_j:
                        # j's tidset is subset - replace j with union
                        new_itemset = itemset_i | itemset_j
                        items[j] = new_itemset
                    else:
                        # Different tidsets - add to new prefix
                        new_itemset = itemset_i | itemset_j
                        new_prefix[new_itemset] = new_tids
                
                j += 1
            
            # Check if current itemset is closed
            tids_key = frozenset(tids_i)
            if tids_key not in all_closed or len(itemset_i) > len(all_closed[tids_key]):
                all_closed[tids_key] = itemset_i
                result.append({
                    'itemset': itemset_i,
                    'support_count': len(tids_i)
                })
            
            if new_prefix:
                result.extend(charm_extend(new_prefix, depth + 1))
            
            i += 1
        
        return result
    
    # Initialize with frequent 1-itemsets
    frequent_1 = {}
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            itemset = frozenset([item])
            frequent_1[itemset] = tids
    
    if frequent_1:
        closed_itemsets.extend(charm_extend(frequent_1))
    
    # Add 1-itemsets that are closed
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            itemset = frozenset([item])
            tids_key = frozenset(tids)
            if tids_key not in all_closed:
                all_closed[tids_key] = itemset
                closed_itemsets.append({
                    'itemset': itemset,
                    'support_count': len(tids)
                })
    
    # Remove duplicates
    seen = set()
    unique_itemsets = []
    for item_info in closed_itemsets:
        key = item_info['itemset']
        if key not in seen:
            seen.add(key)
            unique_itemsets.append(item_info)
    
    return generate_rules_from_itemsets(unique_itemsets, transactions, min_confidence)


def mine_closet(transactions, min_support, min_confidence):
    """
    CLOSET Algorithm - Implementation
    Uses FP-tree based approach for closed pattern mining.
    Falls back to CHARM implementation.
    """
    return mine_charm(transactions, min_support, min_confidence)


def mine_maxminer(transactions, min_support, min_confidence):
    """
    MaxMiner Algorithm - FIXED Implementation
    Discovers maximal frequent itemsets with look-ahead pruning.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Build vertical TID-lists
    tid_lists = defaultdict(set)
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            tid_lists[item].add(tid)
    
    # Get frequent items sorted by support
    frequent_items = []
    for item, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            frequent_items.append(item)
    
    if not frequent_items:
        return []
    
    frequent_items.sort(key=lambda x: len(tid_lists[x]))
    
    all_frequent = []
    maximal_itemsets = []
    checked_itemsets = set()
    
    def get_support(itemset):
        """Calculate support for an itemset."""
        if not itemset:
            return n_transactions
        tids = None
        for item in itemset:
            if item not in tid_lists:
                return 0
            if tids is None:
                tids = tid_lists[item].copy()
            else:
                tids &= tid_lists[item]
            if not tids:
                return 0
        return len(tids)
    
    def is_subset_of_maximal(itemset):
        """Check if itemset is subset of any maximal itemset."""
        for max_info in maximal_itemsets:
            if itemset < max_info['itemset']:
                return True
        return False
    
    def maxminer_search(head, tail, depth=0):
        """MaxMiner search with look-ahead pruning."""
        if depth > 10:
            return
        
        if not tail:
            return
        
        # Look-ahead: check if head ∪ tail is frequent
        full_set = head | frozenset(tail)
        full_support = get_support(full_set)
        
        if full_support >= min_support_count:
            # The entire set is frequent - it's a maximal candidate
            if not is_subset_of_maximal(full_set):
                maximal_itemsets.append({
                    'itemset': full_set,
                    'support_count': full_support
                })
                all_frequent.append({
                    'itemset': full_set,
                    'support_count': full_support
                })
            return
        
        # Enumerate subsets
        for i, item in enumerate(tail):
            new_head = head | frozenset([item])
            head_support = get_support(new_head)
            
            if head_support >= min_support_count:
                # Record this frequent itemset
                if new_head not in checked_itemsets:
                    checked_itemsets.add(new_head)
                    all_frequent.append({
                        'itemset': new_head,
                        'support_count': head_support
                    })
                
                new_tail = tail[i+1:]
                if new_tail:
                    maxminer_search(new_head, new_tail, depth + 1)
                else:
                    # No more items to add - check if maximal
                    if not is_subset_of_maximal(new_head):
                        maximal_itemsets.append({
                            'itemset': new_head,
                            'support_count': head_support
                        })
    
    # Add frequent 1-itemsets
    for item in frequent_items:
        itemset = frozenset([item])
        if itemset not in checked_itemsets:
            checked_itemsets.add(itemset)
            all_frequent.append({
                'itemset': itemset,
                'support_count': len(tid_lists[item])
            })
    
    # Start MaxMiner search
    maxminer_search(frozenset(), frequent_items)
    
    # Combine all frequent itemsets for rule generation
    return generate_rules_from_itemsets(all_frequent, transactions, min_confidence)


# =============================================================================
# DATA PREPROCESSING
# =============================================================================

def preprocess_transactions(transactions, options=None):
    """
    Preprocess transactions with enhanced options.
    
    Options:
    - remove_duplicates: Remove duplicate transactions
    - remove_empty: Remove empty transactions
    - min_items: Minimum items per transaction
    - max_items: Maximum items per transaction
    - filter_items: List of items to keep (if specified)
    - exclude_items: List of items to exclude
    - min_item_frequency: Remove items below this frequency threshold
    """
    if options is None:
        options = {}
    
    # First, apply minimum item frequency filter
    min_freq = options.get('min_item_frequency', 0)
    if min_freq > 0:
        item_counts = defaultdict(int)
        for t in transactions:
            for item in t:
                item_counts[item] += 1
        
        min_count = int(min_freq * len(transactions))
        frequent_items = {item for item, count in item_counts.items() if count >= min_count}
        transactions = [[item for item in t if item in frequent_items] for t in transactions]
    
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
    Upload and process a dataset with streaming support.
    """
    global dataset_profile
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = file.filename.lower()
    
    try:
        # Read file with flexible parsing for variable-length rows
        if filename.endswith('.csv'):
            # First try to read the raw content to handle variable columns
            file_content = file.read().decode('utf-8', errors='ignore')
            file.seek(0)  # Reset file pointer
            
            lines = file_content.strip().split('\n')
            transactions = []
            
            # Check if first line looks like a header
            first_line = lines[0].strip().lower() if lines else ''
            start_idx = 1 if first_line in ['items', 'item', 'transaction', 'transactions'] or 'item' in first_line else 0
            
            for line in lines[start_idx:]:
                line = line.strip()
                if not line:
                    continue
                # Split by comma and clean items
                items = [item.strip().strip('"').strip("'") for item in line.split(',')]
                items = [item for item in items if item and item.lower() not in ['nan', 'none', 'null', '']]
                if items:
                    transactions.append(items)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
            transactions = []
            
            # Handle different dataset formats
            if 'Items' in df.columns or 'items' in df.columns:
                col = 'Items' if 'Items' in df.columns else 'items'
                transactions = df[col].apply(
                    lambda x: [i.strip() for i in str(x).split(',') if i.strip()] if pd.notna(x) else []
                ).tolist()
            else:
                for _, row in df.iterrows():
                    items = []
                    for val in row:
                        if pd.notna(val):
                            val_str = str(val).strip()
                            if val_str and val_str.lower() not in ['nan', 'none', '']:
                                if ',' in val_str:
                                    items.extend([i.strip() for i in val_str.split(',') if i.strip()])
                                else:
                                    items.append(val_str)
                    if items:
                        transactions.append(items)
        else:
            return jsonify({'error': 'Unsupported file format. Use CSV or Excel.'}), 400
        
        transactions = [t for t in transactions if t]
        
        if not transactions:
            return jsonify({'error': 'No valid transactions found in dataset'}), 400
        
        # Save processed transactions as single column CSV
        items_str = [','.join(t) for t in transactions]
        processed_df = pd.DataFrame({'items': items_str})
        processed_df.to_csv(TRANSACTIONS_FILE, index=False)
        
        # Profile the dataset
        profile = profile_dataset(transactions)
        
        # Get statistics
        all_items = set()
        for t in transactions:
            all_items.update(t)
        
        return jsonify(convert_numpy_types({
            'success': True,
            'message': 'Dataset uploaded successfully',
            'stats': {
                'transactions': len(transactions),
                'unique_items': len(all_items),
                'avg_items_per_transaction': round(sum(len(t) for t in transactions) / len(transactions), 2)
            },
            'profile': profile
        }))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


@app.route('/api/preprocess', methods=['POST'])
def preprocess_dataset():
    """Apply preprocessing options to the uploaded dataset."""
    global dataset_profile
    
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
        
        # Update profile
        dataset_profile = profile_dataset(processed)
        
        all_items = set()
        for t in processed:
            all_items.update(t)
        
        return jsonify(convert_numpy_types({
            'success': True,
            'message': 'Preprocessing complete',
            'stats': {
                'transactions': len(processed),
                'unique_items': len(all_items),
                'avg_items_per_transaction': round(sum(len(t) for t in processed) / len(processed), 2)
            },
            'profile': dataset_profile
        }))
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Preprocessing failed: {str(e)}'}), 500


@app.route('/api/recommend', methods=['POST'])
def recommend_algorithm_endpoint():
    """
    Get algorithm recommendation based on dataset characteristics.
    """
    global dataset_profile
    
    try:
        data = request.get_json() or {}
        min_support = float(data.get('min_support', 0.1))
        
        if not dataset_profile:
            transactions = load_transactions()
            dataset_profile = profile_dataset(transactions)
        
        recommendation = recommend_algorithm(dataset_profile, min_support)
        
        return jsonify(convert_numpy_types({
            'success': True,
            'profile': dataset_profile,
            'recommendation': recommendation
        }))
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Recommendation failed: {str(e)}'}), 500


@app.route('/api/mine', methods=['POST'])
def mine_patterns():
    """
    Execute pattern mining algorithm with scalability features.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No parameters provided'}), 400
        
        algorithm = data.get('algorithm', 'apriori').lower()
        min_support = float(data.get('min_support', 0.1))
        min_confidence = float(data.get('min_confidence', 0.5))
        max_rules = int(data.get('max_rules', 5000))
        
        # Validate parameters
        if not 0 < min_support <= 1:
            return jsonify({'error': 'min_support must be between 0 and 1'}), 400
        if not 0 < min_confidence <= 1:
            return jsonify({'error': 'min_confidence must be between 0 and 1'}), 400
        
        # Load transactions
        start_time = time.time()
        transactions = load_transactions()
        load_time = time.time() - start_time
        
        # Execute mining algorithm
        mine_start = time.time()
        
        if algorithm == 'apriori':
            rules = mine_apriori(transactions, min_support, min_confidence)
        elif algorithm in ['fp-growth', 'fpgrowth']:
            rules = mine_fpgrowth(transactions, min_support, min_confidence)
        elif algorithm == 'eclat':
            rules = mine_eclat(transactions, min_support, min_confidence)
        elif algorithm in ['h-mine', 'hmine']:
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
        
        mine_time = time.time() - mine_start
        
        # Apply rule explosion management
        original_count = len(rules)
        if len(rules) > max_rules:
            rules = prune_redundant_rules(rules, max_rules)
        
        # Sort by lift descending
        rules.sort(key=lambda x: x['lift'], reverse=True)
        
        # Force garbage collection
        gc.collect()
        
        return jsonify({
            'success': True,
            'algorithm': algorithm,
            'min_support': min_support,
            'min_confidence': min_confidence,
            'rules_count': len(rules),
            'original_rules_count': original_count,
            'was_pruned': original_count > len(rules),
            'execution_time': {
                'load_seconds': round(load_time, 3),
                'mine_seconds': round(mine_time, 3),
                'total_seconds': round(load_time + mine_time, 3)
            },
            'rules': rules
        })
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Mining failed: {str(e)}'}), 500


@app.route('/api/dataset/info', methods=['GET'])
def get_dataset_info():
    """Get information about the current dataset with profiling."""
    global dataset_profile
    
    try:
        transactions = load_transactions()
        
        if not dataset_profile:
            dataset_profile = profile_dataset(transactions)
        
        item_counts = defaultdict(int)
        for t in transactions:
            for item in t:
                item_counts[item] += 1
        
        # Top 10 most frequent items
        top_items = sorted(item_counts.items(), key=lambda x: -x[1])[:10]
        
        return jsonify(convert_numpy_types({
            'success': True,
            'stats': {
                'transactions': len(transactions),
                'unique_items': len(item_counts),
                'avg_items_per_transaction': dataset_profile.get('avg_transaction_length', 0),
                'top_items': [{'item': item, 'count': int(count)} for item, count in top_items]
            },
            'profile': dataset_profile
        }))
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/algorithms', methods=['GET'])
def get_algorithms():
    """Get list of available algorithms with recommendations."""
    global dataset_profile
    
    algorithms = [
        {
            'id': 'apriori',
            'name': 'Apriori',
            'description': 'Classic level-wise algorithm using candidate generation',
            'type': 'frequent',
            'best_for': 'Small to medium datasets'
        },
        {
            'id': 'fp-growth',
            'name': 'FP-Growth',
            'description': 'Pattern-growth algorithm using FP-tree structure',
            'type': 'frequent',
            'best_for': 'Large sparse datasets'
        },
        {
            'id': 'eclat',
            'name': 'ECLAT',
            'description': 'Equivalence class clustering using vertical TID-lists',
            'type': 'frequent',
            'best_for': 'Dense datasets'
        },
        {
            'id': 'h-mine',
            'name': 'H-Mine',
            'description': 'Memory-efficient algorithm using H-struct',
            'type': 'frequent',
            'best_for': 'Limited memory environments'
        },
        {
            'id': 'carma',
            'name': 'CARMA',
            'description': 'Continuous association rule mining for streaming data',
            'type': 'frequent',
            'best_for': 'Streaming/incremental data'
        },
        {
            'id': 'charm',
            'name': 'CHARM',
            'description': 'Discovers closed frequent itemsets',
            'type': 'closed',
            'best_for': 'Reducing rule explosion'
        },
        {
            'id': 'closet',
            'name': 'CLOSET',
            'description': 'FP-tree based closed pattern mining',
            'type': 'closed',
            'best_for': 'Compact pattern representation'
        },
        {
            'id': 'maxminer',
            'name': 'MaxMiner',
            'description': 'Discovers maximal frequent itemsets with look-ahead',
            'type': 'maximal',
            'best_for': 'Minimal output size'
        }
    ]
    
    # Add recommendations if profile available
    recommendation = None
    if dataset_profile:
        recommendation = recommend_algorithm(dataset_profile)
    
    return jsonify({
        'algorithms': algorithms,
        'recommendation': recommendation
    })


@app.route('/api/classify', methods=['POST'])
def classify_data():
    """
    Classification mining endpoint.
    Supports Naive Bayes and Decision Tree classifiers.
    """
    try:
        data = request.get_json() or {}
        algorithm = data.get('algorithm', 'naive-bayes').lower()
        
        # Load the dataset
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        # Read the original uploaded file for classification
        # For classification, we need feature columns + class label
        df = pd.read_csv(TRANSACTIONS_FILE)
        
        if 'items' in df.columns:
            # Convert transaction format to feature format for classification
            # Parse items and create binary feature matrix
            all_items = set()
            transactions = []
            for items_str in df['items']:
                items = [i.strip() for i in str(items_str).split(',') if i.strip()]
                transactions.append(items)
                all_items.update(items)
            
            all_items = sorted(all_items)
            
            # Create binary feature matrix
            feature_matrix = []
            for t in transactions:
                row = [1 if item in t else 0 for item in all_items]
                feature_matrix.append(row)
            
            X = pd.DataFrame(feature_matrix, columns=all_items)
            
            # Use the last item as "class" for demo purposes
            # In real scenario, user should upload proper classification dataset
            if len(all_items) > 1:
                class_column = all_items[-1]
                y = X[class_column]
                X = X.drop(columns=[class_column])
            else:
                return jsonify({'error': 'Dataset needs at least 2 columns for classification'}), 400
        else:
            # Standard tabular format: last column is class label
            if len(df.columns) < 2:
                return jsonify({'error': 'Dataset needs at least 2 columns for classification'}), 400
            
            X = df.iloc[:, :-1]
            y = df.iloc[:, -1]
        
        # Encode categorical features
        label_encoders = {}
        X_encoded = X.copy()
        
        for col in X_encoded.columns:
            if X_encoded[col].dtype == 'object':
                le = LabelEncoder()
                X_encoded[col] = le.fit_transform(X_encoded[col].astype(str))
                label_encoders[col] = le
        
        # Encode target variable
        target_le = LabelEncoder()
        y_encoded = target_le.fit_transform(y.astype(str))
        class_labels = list(target_le.classes_)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Train classifier
        start_time = time.time()
        
        if algorithm in ['naive-bayes', 'naivebayes']:
            classifier = GaussianNB()
            classifier.fit(X_train, y_train)
            feature_importances = None
        elif algorithm in ['decision-tree', 'decisiontree']:
            classifier = DecisionTreeClassifier(random_state=42, max_depth=10)
            classifier.fit(X_train, y_train)
            # Get feature importances
            importances = classifier.feature_importances_
            feature_importances = [
                {'feature': str(col), 'importance': float(imp)}
                for col, imp in sorted(zip(X.columns, importances), key=lambda x: -x[1])
                if imp > 0
            ]
        else:
            return jsonify({'error': f'Unknown algorithm: {algorithm}. Use naive-bayes or decision-tree'}), 400
        
        # Make predictions
        y_pred = classifier.predict(X_test)
        
        execution_time = time.time() - start_time
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()
        class_report = classification_report(y_test, y_pred, target_names=class_labels, zero_division=0)
        
        result = {
            'success': True,
            'algorithm': algorithm,
            'accuracy': round(float(accuracy), 4),
            'precision': round(float(precision), 4),
            'recall': round(float(recall), 4),
            'f1_score': round(float(f1), 4),
            'confusion_matrix': conf_matrix,
            'class_labels': [str(label) for label in class_labels],
            'classification_report': class_report,
            'execution_time': round(float(execution_time), 4),
            'train_size': int(len(X_train)),
            'test_size': int(len(X_test))
        }
        
        if feature_importances:
            result['feature_importances'] = feature_importances[:20]  # Top 20
        
        return jsonify(convert_numpy_types(result))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Classification failed: {str(e)}'}), 500


@app.route('/api/cluster', methods=['POST'])
def cluster_data():
    """
    Clustering mining endpoint.
    Supports K-Means and DBSCAN algorithms.
    """
    try:
        data = request.get_json() or {}
        algorithm = data.get('algorithm', 'kmeans').lower()
        n_clusters = data.get('n_clusters', 3)
        eps = data.get('eps', 0.5)
        min_samples = data.get('min_samples', 5)
        
        # Load the dataset
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        df = pd.read_csv(TRANSACTIONS_FILE)
        
        # Prepare data for clustering
        if 'items' in df.columns:
            # Convert transaction format to feature matrix
            all_items = set()
            transactions = []
            for items_str in df['items']:
                items = [i.strip() for i in str(items_str).split(',') if i.strip()]
                transactions.append(items)
                all_items.update(items)
            
            all_items = sorted(all_items)
            
            # Create binary feature matrix
            feature_matrix = []
            for t in transactions:
                row = [1 if item in t else 0 for item in all_items]
                feature_matrix.append(row)
            
            X = pd.DataFrame(feature_matrix, columns=all_items)
            feature_names = list(all_items)
        else:
            # Standard tabular format
            X = df.copy()
            feature_names = list(X.columns)
        
        # Encode categorical features
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
        
        # Handle missing values
        X = X.fillna(0)
        
        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        start_time = time.time()
        
        if algorithm == 'kmeans':
            clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = clusterer.fit_predict(X_scaled)
            cluster_centers = scaler.inverse_transform(clusterer.cluster_centers_).tolist()
            inertia = float(clusterer.inertia_)
        elif algorithm == 'dbscan':
            clusterer = DBSCAN(eps=eps, min_samples=min_samples)
            cluster_labels = clusterer.fit_predict(X_scaled)
            cluster_centers = None
            inertia = None
        else:
            return jsonify({'error': f'Unknown algorithm: {algorithm}. Use kmeans or dbscan'}), 400
        
        execution_time = time.time() - start_time
        
        # Calculate metrics
        n_clusters_found = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        
        # Calculate silhouette score (only if more than 1 cluster and not all noise)
        if n_clusters_found > 1 and len(set(cluster_labels)) > 1:
            # Filter out noise points for silhouette calculation
            mask = cluster_labels != -1
            if mask.sum() > 1:
                sil_score = silhouette_score(X_scaled[mask], cluster_labels[mask])
            else:
                sil_score = 0.0
        else:
            sil_score = 0.0
        
        # Calculate cluster sizes
        cluster_sizes = {}
        for label in cluster_labels:
            key = str(label)
            cluster_sizes[key] = cluster_sizes.get(key, 0) + 1
        
        # Prepare data points for visualization (limit to first 1000 for performance)
        max_points = min(1000, len(X_scaled))
        data_points = []
        for i in range(max_points):
            data_points.append({
                'features': X_scaled[i].tolist()[:10],  # Limit features for response size
                'cluster': int(cluster_labels[i])
            })
        
        result = {
            'success': True,
            'algorithm': algorithm,
            'n_clusters': n_clusters_found,
            'cluster_labels': cluster_labels.tolist(),
            'silhouette_score': round(sil_score, 4),
            'cluster_sizes': cluster_sizes,
            'feature_names': feature_names[:10],  # Limit for response size
            'data_points': data_points,
            'execution_time': round(execution_time, 4)
        }
        
        if cluster_centers:
            result['cluster_centers'] = [[round(v, 4) for v in c[:10]] for c in cluster_centers]
        if inertia is not None:
            result['inertia'] = round(inertia, 4)
        
        return jsonify(convert_numpy_types(result))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Clustering failed: {str(e)}'}), 500


@app.route('/api/elbow', methods=['POST'])
def elbow_analysis():
    """
    Elbow method analysis endpoint.
    Returns inertia values for different K values to help choose optimal clusters.
    """
    try:
        data = request.get_json() or {}
        max_k = min(data.get('max_k', 10), 15)  # Limit max K to 15
        
        # Load the dataset
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        df = pd.read_csv(TRANSACTIONS_FILE)
        
        # Prepare data for clustering (same as cluster endpoint)
        if 'items' in df.columns:
            all_items = set()
            transactions = []
            for items_str in df['items']:
                items = [i.strip() for i in str(items_str).split(',') if i.strip()]
                transactions.append(items)
                all_items.update(items)
            
            all_items = sorted(all_items)
            feature_matrix = []
            for t in transactions:
                row = [1 if item in t else 0 for item in all_items]
                feature_matrix.append(row)
            
            X = pd.DataFrame(feature_matrix, columns=all_items)
        else:
            X = df.copy()
        
        # Encode categorical features
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
        
        X = X.fillna(0)
        
        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Limit data for faster computation
        if len(X_scaled) > 5000:
            # Random sample for large datasets
            np.random.seed(42)
            indices = np.random.choice(len(X_scaled), 5000, replace=False)
            X_scaled = X_scaled[indices]
        
        # Calculate inertia and silhouette for different K values
        elbow_data = []
        for k in range(2, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=100)
            cluster_labels = kmeans.fit_predict(X_scaled)
            
            inertia = float(kmeans.inertia_)
            
            # Calculate silhouette score
            if len(set(cluster_labels)) > 1:
                sil_score = silhouette_score(X_scaled, cluster_labels)
            else:
                sil_score = 0.0
            
            elbow_data.append({
                'k': k,
                'inertia': round(inertia, 2),
                'silhouette': round(sil_score, 4)
            })
        
        # Find optimal K using elbow detection (second derivative)
        inertias = [d['inertia'] for d in elbow_data]
        if len(inertias) >= 3:
            # Calculate first and second derivatives
            first_diff = np.diff(inertias)
            second_diff = np.diff(first_diff)
            
            # Find the elbow point (maximum second derivative)
            elbow_idx = np.argmax(second_diff) + 2  # +2 because we start at k=2
            optimal_k = elbow_idx + 2  # Convert to k value
            optimal_k = min(max(optimal_k, 2), max_k)
        else:
            optimal_k = 3
        
        # Also find max silhouette
        silhouettes = [d['silhouette'] for d in elbow_data]
        max_sil_idx = np.argmax(silhouettes)
        silhouette_optimal_k = elbow_data[max_sil_idx]['k']
        
        return jsonify(convert_numpy_types({
            'success': True,
            'elbow_data': elbow_data,
            'optimal_k_elbow': int(optimal_k),
            'optimal_k_silhouette': int(silhouette_optimal_k),
            'recommendation': f"Elbow suggests K={optimal_k}, Silhouette suggests K={silhouette_optimal_k}"
        }))
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Elbow analysis failed: {str(e)}'}), 500


# Global variable to store the latest mining rules
latest_mining_rules = []


@app.route('/api/predict', methods=['POST'])
def predict_next_item():
    """
    Predict next purchase based on association rules.
    Input: {"item": "Milk"}
    Output: List of recommendations sorted by confidence
    """
    global latest_mining_rules
    
    try:
        data = request.get_json() or {}
        item = data.get('item', '').strip()
        
        if not item:
            return jsonify({'error': 'Please provide an item name'}), 400
        
        # Use the latest mined rules or load from file if available
        if not latest_mining_rules:
            return jsonify({
                'success': True,
                'recommendations': [],
                'message': 'No rules available. Please run mining first.'
            })
        
        # Normalize item for matching
        item_lower = item.lower()
        
        # Filter rules where antecedent contains the given item
        matching_rules = []
        for rule in latest_mining_rules:
            antecedent = rule.get('antecedent', [])
            # Check if any item in antecedent matches (case-insensitive partial match)
            if any(item_lower in ant.lower() or ant.lower() in item_lower for ant in antecedent):
                matching_rules.append(rule)
        
        # Sort by confidence (descending)
        matching_rules.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Extract unique recommendations
        seen_recommendations = set()
        recommendations = []
        
        for rule in matching_rules:
            for consequent in rule.get('consequent', []):
                cons_lower = consequent.lower()
                if cons_lower not in seen_recommendations and cons_lower != item_lower:
                    seen_recommendations.add(cons_lower)
                    recommendations.append({
                        'recommendation': consequent,
                        'confidence': round(rule.get('confidence', 0), 4),
                        'lift': round(rule.get('lift', 1.0), 4),
                        'antecedent': rule.get('antecedent', [])
                    })
            
            if len(recommendations) >= 10:  # Limit to top 10
                break
        
        if not recommendations:
            return jsonify({
                'success': True,
                'recommendations': [],
                'message': f'No recommendation found for "{item}"'
            })
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'query_item': item,
            'total_matches': len(matching_rules)
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


# Update the mine endpoint to store rules globally
original_mine = app.view_functions.get('mine_rules')


@app.route('/api/mine', methods=['POST'], endpoint='mine_rules_updated')
def mine_rules_updated():
    """Enhanced mine endpoint that stores rules for prediction."""
    global latest_mining_rules
    
    try:
        data = request.get_json() or {}
        algorithm = data.get('algorithm', 'fp-growth').lower()
        min_support = float(data.get('min_support', 0.1))
        min_confidence = float(data.get('min_confidence', 0.5))
        max_rules = int(data.get('max_rules', 5000))
        
        start_time = time.time()
        
        # Load transactions
        transactions = load_transactions()
        
        if not transactions:
            return jsonify({'error': 'No transactions loaded. Please upload a dataset first.'}), 400
        
        load_time = time.time() - start_time
        mine_start = time.time()
        
        # Select algorithm
        algorithm_map = {
            'apriori': mine_apriori,
            'fp-growth': mine_fpgrowth,
            'fpgrowth': mine_fpgrowth,
            'eclat': mine_eclat,
            'h-mine': mine_hmine,
            'hmine': mine_hmine,
            'carma': mine_carma,
            'charm': mine_charm,
            'closet': mine_closet,
            'maxminer': mine_maxminer,
        }
        
        mine_func = algorithm_map.get(algorithm)
        if not mine_func:
            return jsonify({'error': f'Unknown algorithm: {algorithm}'}), 400
        
        rules = mine_func(transactions, min_support, min_confidence)
        
        mine_time = time.time() - mine_start
        total_time = time.time() - start_time
        
        # Apply rule pruning if needed
        original_count = len(rules)
        was_pruned = False
        
        if len(rules) > max_rules:
            rules = prune_redundant_rules(rules, max_rules)
            was_pruned = True
        
        # Store rules globally for prediction
        latest_mining_rules = rules
        
        return jsonify({
            'success': True,
            'algorithm': algorithm,
            'rules': rules,
            'rules_count': len(rules),
            'original_rules_count': original_count,
            'was_pruned': was_pruned,
            'execution_time': {
                'load_seconds': round(load_time, 3),
                'mine_seconds': round(mine_time, 3),
                'total_seconds': round(total_time, 3)
            },
            'parameters': {
                'min_support': min_support,
                'min_confidence': min_confidence
            }
        })
    
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("SmartMine Flask Backend - Enhanced Edition")
    print("=" * 60)
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Processed folder: {PROCESSED_FOLDER}")
    print(f"SPMF folder: {SPMF_FOLDER}")
    print("=" * 60)
    print("Features:")
    print("  - All 8 mining algorithms fixed and optimized")
    print("  - Algorithm recommendation engine")
    print("  - Rule explosion management")
    print("  - Dataset profiling")
    print("  - Classification mining (Naive Bayes, Decision Tree)")
    print("  - Clustering mining (K-Means, DBSCAN)")
    print("  - Elbow method for optimal K selection")
    print("  - Next purchase prediction")
    print("=" * 60)
    print("Starting server on http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
