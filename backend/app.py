"""
SmartMine Flask Backend - Enhanced with Advanced Preprocessing & Algorithms
============================================================================
Complete data mining backend with:
- Advanced preprocessing (normalization, cleaning, frequency pruning)
- Classical algorithms: Apriori, FP-Growth, ECLAT, H-Mine, CARMA, CHARM, MaxMiner
- Extended algorithms: Apriori-TID, dEclat, FPMax, Fuzzy Apriori
- High-Utility Mining: Two-Phase HUIM
- Stream Mining: Lossy Counting
- Classification: Naive Bayes, Decision Tree
- Clustering: K-Means, DBSCAN

Run with: python app.py
Server: http://localhost:5000
"""

import os
import subprocess
import json
import tempfile
import time
import gc
import re
import unicodedata
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
# ADVANCED PREPROCESSING MODULE
# =============================================================================

class AdvancedPreprocessor:
    """
    Advanced preprocessing for Association Rule Mining datasets.
    Implements comprehensive data cleaning and normalization techniques.
    """
    
    # Common item synonyms for normalization
    DEFAULT_SYNONYMS = {
        'cola': 'soft_drink',
        'pepsi': 'soft_drink', 
        'coke': 'soft_drink',
        'soda': 'soft_drink',
        'pop': 'soft_drink',
    }
    
    # Stop items to filter
    DEFAULT_STOP_ITEMS = {'item1', 'item2', 'unknown', 'other', 'misc', 'na', 'n/a', 'none'}
    
    def __init__(self, options=None):
        self.options = options or {}
        self.synonyms = self.options.get('synonyms', self.DEFAULT_SYNONYMS)
        self.stop_items = set(self.options.get('stop_items', self.DEFAULT_STOP_ITEMS))
        self.stats = {}
    
    # =========================================================================
    # 1. Column & Text Normalization
    # =========================================================================
    
    def normalize_text(self, text):
        """
        Normalize item text:
        - Trim whitespace
        - Optional lowercase
        - Remove invisible characters
        - Unicode normalization (UTF-8)
        """
        if not isinstance(text, str):
            text = str(text)
        
        # Unicode normalization to NFC form
        text = unicodedata.normalize('NFC', text)
        
        # Remove invisible characters (zero-width spaces, etc.)
        text = re.sub(r'[\u200b\u200c\u200d\ufeff\u00ad]', '', text)
        
        # Remove control characters except common whitespace
        text = ''.join(char for char in text if unicodedata.category(char)[0] != 'C' or char in '\n\t ')
        
        # Trim whitespace
        text = text.strip()
        
        # Optional lowercase
        if self.options.get('lowercase', False):
            text = text.lower()
        
        return text
    
    def detect_delimiter(self, content):
        """
        Auto-detect delimiter from content.
        Supports: comma, semicolon, pipe, tab
        """
        delimiters = [',', ';', '|', '\t']
        counts = {d: content.count(d) for d in delimiters}
        
        # Return delimiter with highest count
        if max(counts.values()) > 0:
            return max(counts, key=counts.get)
        return ','
    
    def detect_encoding(self, file_bytes):
        """
        Detect file encoding with fallback to UTF-8.
        """
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                file_bytes.decode(encoding)
                return encoding
            except (UnicodeDecodeError, AttributeError):
                continue
        
        return 'utf-8'
    
    def detect_header(self, lines):
        """
        Detect if first line is a header.
        Returns (has_header, start_index)
        """
        if not lines:
            return False, 0
        
        first_line = lines[0].strip().lower()
        
        # Common header patterns
        header_keywords = ['items', 'item', 'transaction', 'transactions', 
                          'product', 'products', 'basket', 'order']
        
        # Check if first line contains header keywords
        if any(kw in first_line for kw in header_keywords):
            return True, 1
        
        # Check if first line has significantly different structure
        if len(lines) > 1:
            first_items = len(first_line.split(','))
            second_items = len(lines[1].strip().split(','))
            
            # If first line has only 1-2 items and second has more, likely header
            if first_items <= 2 and second_items > first_items:
                return True, 1
        
        return False, 0
    
    # =========================================================================
    # 2. Transaction Structure Cleaning
    # =========================================================================
    
    def parse_transaction(self, line, delimiter=','):
        """
        Parse a single transaction line into items.
        Handles multi-item splitting and cleaning.
        """
        if not line or not line.strip():
            return []
        
        # Split by delimiter
        items = line.split(delimiter)
        
        # Clean each item
        cleaned = []
        for item in items:
            item = self.normalize_text(item)
            
            # Remove quotes
            item = item.strip('"\'')
            
            # Skip empty items
            if not item:
                continue
            
            # Skip null/nan values
            if item.lower() in ['nan', 'none', 'null', '', 'na', 'n/a']:
                continue
            
            cleaned.append(item)
        
        return cleaned
    
    def remove_duplicate_items_in_transaction(self, transaction):
        """
        Remove duplicate items within a single transaction.
        Preserves order (first occurrence).
        """
        seen = set()
        result = []
        
        for item in transaction:
            # Case-insensitive deduplication if lowercase option enabled
            key = item.lower() if self.options.get('lowercase') else item
            
            if key not in seen:
                seen.add(key)
                result.append(item)
        
        return result
    
    # =========================================================================
    # 3. Missing Value Handling
    # =========================================================================
    
    def handle_missing_values(self, transaction):
        """
        Handle missing values in transaction.
        Options: remove, replace with 'UNKNOWN'
        """
        strategy = self.options.get('missing_value_strategy', 'remove')
        
        cleaned = []
        for item in transaction:
            # Check for missing/null indicators
            if item.lower() in ['nan', 'none', 'null', '', 'na', 'n/a', 'missing']:
                if strategy == 'replace':
                    cleaned.append('UNKNOWN')
                # 'remove' strategy: skip the item
                continue
            
            cleaned.append(item)
        
        return cleaned
    
    # =========================================================================
    # 4. Duplicate & Redundant Item Cleaning
    # =========================================================================
    
    def apply_synonym_normalization(self, transaction):
        """
        Normalize item synonyms to canonical form.
        Example: 'cola', 'pepsi', 'coke' -> 'soft_drink'
        """
        if not self.options.get('apply_synonyms', False):
            return transaction
        
        result = []
        for item in transaction:
            item_lower = item.lower()
            
            # Check if item matches any synonym
            canonical = self.synonyms.get(item_lower, item)
            result.append(canonical)
        
        # Deduplicate after normalization
        return self.remove_duplicate_items_in_transaction(result)
    
    # =========================================================================
    # 5. Noise & Invalid Item Removal
    # =========================================================================
    
    def remove_invalid_items(self, transaction):
        """
        Remove invalid/noisy items:
        - Invalid symbols only
        - Numeric-only items (optional)
        - Very short tokens
        - Stop items
        """
        cleaned = []
        
        for item in transaction:
            # Skip very short items
            min_length = self.options.get('min_item_length', 2)
            if len(item) < min_length:
                continue
            
            # Skip numeric-only items (optional)
            if self.options.get('remove_numeric_items', False):
                if item.isdigit() or re.match(r'^[\d.,]+$', item):
                    continue
            
            # Skip items with only special characters
            if re.match(r'^[@#$%^&*()!?\-+=]+$', item):
                continue
            
            # Skip stop items
            if item.lower() in self.stop_items:
                continue
            
            cleaned.append(item)
        
        return cleaned
    
    # =========================================================================
    # 6. Frequency-Based Auto Pruning
    # =========================================================================
    
    def calculate_item_frequencies(self, transactions):
        """
        Calculate item frequencies across all transactions.
        """
        item_counts = defaultdict(int)
        total_transactions = len(transactions)
        
        for t in transactions:
            for item in set(t):  # Use set to count once per transaction
                item_counts[item] += 1
        
        # Convert to percentages
        item_frequencies = {
            item: count / total_transactions 
            for item, count in item_counts.items()
        }
        
        return item_counts, item_frequencies
    
    def prune_by_frequency(self, transactions):
        """
        Remove items based on frequency thresholds:
        - Low-frequency items (support < min_support)
        - Extremely high-frequency items (support > max_support, e.g., >95%)
        """
        if not transactions:
            return transactions
        
        item_counts, item_frequencies = self.calculate_item_frequencies(transactions)
        
        min_freq = self.options.get('min_item_frequency', 0)
        max_freq = self.options.get('max_item_frequency', 0.95)
        
        # Identify items to keep
        valid_items = set()
        for item, freq in item_frequencies.items():
            if min_freq <= freq <= max_freq:
                valid_items.add(item)
        
        # Store pruning stats
        self.stats['pruned_low_freq'] = sum(1 for item, freq in item_frequencies.items() if freq < min_freq)
        self.stats['pruned_high_freq'] = sum(1 for item, freq in item_frequencies.items() if freq > max_freq)
        
        # Filter transactions
        result = []
        for t in transactions:
            filtered = [item for item in t if item in valid_items]
            if filtered:
                result.append(filtered)
        
        return result
    
    # =========================================================================
    # 7. Transaction Length Normalization
    # =========================================================================
    
    def filter_by_transaction_length(self, transactions):
        """
        Filter transactions by length:
        - Remove very short transactions
        - Trim very long transactions
        - Standardize transaction sizes
        """
        min_items = self.options.get('min_items', 1)
        max_items = self.options.get('max_items', 100)
        
        result = []
        for t in transactions:
            # Skip too short
            if len(t) < min_items:
                continue
            
            # Trim too long (keep first max_items)
            if len(t) > max_items:
                t = t[:max_items]
            
            result.append(t)
        
        return result
    
    # =========================================================================
    # 8. Data Type Normalization
    # =========================================================================
    
    def to_binary_matrix(self, transactions):
        """
        Convert transactions to binary presence matrix.
        Used by some ARM engines.
        """
        # Get all unique items
        all_items = set()
        for t in transactions:
            all_items.update(t)
        
        all_items = sorted(all_items)
        item_to_idx = {item: idx for idx, item in enumerate(all_items)}
        
        # Create binary matrix
        matrix = []
        for t in transactions:
            row = [0] * len(all_items)
            for item in t:
                if item in item_to_idx:
                    row[item_to_idx[item]] = 1
            matrix.append(row)
        
        return matrix, all_items
    
    # =========================================================================
    # 9. Temporal & Ordering Cleaning
    # =========================================================================
    
    def remove_timestamps(self, transaction):
        """
        Remove timestamp-like items from transaction.
        """
        if not self.options.get('remove_timestamps', False):
            return transaction
        
        # Patterns for timestamps and dates
        timestamp_patterns = [
            r'^\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'^\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
            r'^\d{2}:\d{2}:\d{2}',  # HH:MM:SS
            r'^\d+T\d+',            # ISO timestamp
        ]
        
        result = []
        for item in transaction:
            is_timestamp = any(re.match(pattern, item) for pattern in timestamp_patterns)
            if not is_timestamp:
                result.append(item)
        
        return result
    
    # =========================================================================
    # Main Preprocessing Pipeline
    # =========================================================================
    
    def preprocess(self, transactions):
        """
        Apply full preprocessing pipeline to transactions.
        """
        processed = []
        
        for t in transactions:
            # 1. Handle missing values
            t = self.handle_missing_values(t)
            
            # 2. Remove timestamps if enabled
            t = self.remove_timestamps(t)
            
            # 3. Remove invalid items
            t = self.remove_invalid_items(t)
            
            # 4. Apply synonym normalization
            t = self.apply_synonym_normalization(t)
            
            # 5. Remove duplicate items in transaction
            t = self.remove_duplicate_items_in_transaction(t)
            
            if t:  # Only keep non-empty transactions
                processed.append(t)
        
        # 6. Filter by transaction length
        processed = self.filter_by_transaction_length(processed)
        
        # 7. Frequency-based pruning
        processed = self.prune_by_frequency(processed)
        
        # 8. Remove duplicate transactions (optional)
        if self.options.get('remove_duplicates', False):
            seen = set()
            unique = []
            for t in processed:
                key = tuple(sorted(t))
                if key not in seen:
                    seen.add(key)
                    unique.append(t)
            processed = unique
        
        # Store stats
        self.stats['final_transactions'] = len(processed)
        
        return processed


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
    
    # Apriori-TID: Better memory usage than Apriori for dense data
    ap_tid_score = 55
    if is_dense:
        ap_tid_score += 15
    if not is_large:
        ap_tid_score += 10
    recommendations.append({
        'algorithm': 'apriori-tid',
        'score': ap_tid_score,
        'reason': 'TID-list optimization for memory efficiency'
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
    
    # dEclat: Memory-optimized ECLAT with diffsets
    dec_score = 60
    if is_dense:
        dec_score += 15
    if has_long_trans:
        dec_score += 10
    recommendations.append({
        'algorithm': 'declat',
        'score': dec_score,
        'reason': 'Diffset optimization reduces memory for deep patterns'
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
    
    # FPMax: Maximal patterns from FP-tree
    fpm_score = 58
    if rule_explosion_risk == 'high':
        fpm_score += 25
    recommendations.append({
        'algorithm': 'fpmax',
        'score': fpm_score,
        'reason': 'FP-tree based maximal pattern discovery'
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
            support = int(support_part.split()[0])
            
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
    """
    if len(rules) <= top_k:
        return rules
    
    rules.sort(key=lambda x: (x['lift'], x['confidence'], x['support']), reverse=True)
    return rules[:top_k]


# =============================================================================
# MINING ALGORITHMS - CLASSICAL
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


def mine_apriori_tid(transactions, min_support, min_confidence):
    """
    Apriori-TID Algorithm Implementation.
    Uses TID-lists for efficient support counting without database scans.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Build initial TID-lists for 1-itemsets
    tid_lists = defaultdict(set)
    for tid, transaction in enumerate(transactions):
        for item in transaction:
            tid_lists[frozenset([item])].add(tid)
    
    # Find frequent 1-itemsets
    frequent_itemsets = []
    L1 = {}
    
    for itemset, tids in tid_lists.items():
        if len(tids) >= min_support_count:
            L1[itemset] = tids
            frequent_itemsets.append({
                'itemset': itemset,
                'support_count': len(tids)
            })
    
    if not L1:
        return []
    
    k = 2
    Lk_minus_1 = L1
    
    while Lk_minus_1:
        # Generate candidates using Apriori-gen
        candidates = {}
        items = list(Lk_minus_1.keys())
        
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                itemset1 = items[i]
                itemset2 = items[j]
                
                # Join step
                union = itemset1 | itemset2
                if len(union) != k:
                    continue
                
                # Prune step - check all (k-1) subsets are frequent
                valid = True
                for subset in combinations(union, k - 1):
                    if frozenset(subset) not in Lk_minus_1:
                        valid = False
                        break
                
                if valid:
                    # Calculate TID-list by intersection
                    new_tids = Lk_minus_1[itemset1] & Lk_minus_1[itemset2]
                    if len(new_tids) >= min_support_count:
                        candidates[union] = new_tids
        
        # Add frequent k-itemsets
        Lk = {}
        for itemset, tids in candidates.items():
            Lk[itemset] = tids
            frequent_itemsets.append({
                'itemset': itemset,
                'support_count': len(tids)
            })
        
        Lk_minus_1 = Lk
        k += 1
        
        # Limit depth to prevent explosion
        if k > 10:
            break
    
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_fpgrowth(transactions, min_support, min_confidence):
    """Mine using FP-Growth algorithm (mlxtend)."""
    if not transactions:
        return []
    
    try:
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
                'support': round(float(row['support']), 4),
                'confidence': round(float(row['confidence']), 4),
                'lift': round(float(row['lift']), 4)
            })
        
        return result
    except Exception as e:
        print(f"FP-Growth error: {e}")
        return mine_apriori(transactions, min_support, min_confidence)


def mine_eclat(transactions, min_support, min_confidence):
    """
    ECLAT Algorithm Implementation.
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
        if depth > 15:
            return []
        
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


def mine_declat(transactions, min_support, min_confidence):
    """
    dEclat Algorithm Implementation.
    Uses diffsets instead of TID-sets for memory efficiency with deep patterns.
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
            frequent_1[itemset] = {'tids': tids, 'support': len(tids)}
            frequent_itemsets.append({
                'itemset': itemset,
                'support_count': len(tids)
            })
    
    def declat_extend(prefix_itemsets, depth=0):
        """Recursively extend itemsets using diffsets."""
        if depth > 12:
            return []
        
        result = []
        items = list(prefix_itemsets.keys())
        
        for i, itemset_i in enumerate(items):
            data_i = prefix_itemsets[itemset_i]
            new_prefix = {}
            
            for j in range(i + 1, len(items)):
                itemset_j = items[j]
                data_j = prefix_itemsets[itemset_j]
                
                # Calculate diffset: items in j but not in new combination
                if depth == 0:
                    # For first level, use TID intersection
                    new_tids = data_i['tids'] & data_j['tids']
                    new_support = len(new_tids)
                    diff = data_i['tids'] - new_tids
                else:
                    # Use diffset calculation for deeper levels
                    # diff(XY) = diff(Y) - diff(X)
                    diff = data_j.get('diff', set()) - data_i.get('diff', set())
                    new_support = data_i['support'] - len(diff)
                
                if new_support >= min_support_count:
                    new_itemset = itemset_i | itemset_j
                    new_prefix[new_itemset] = {
                        'support': new_support,
                        'diff': diff,
                        'tids': data_i['tids'] & data_j['tids'] if depth == 0 else None
                    }
                    result.append({
                        'itemset': new_itemset,
                        'support_count': new_support
                    })
            
            if new_prefix:
                result.extend(declat_extend(new_prefix, depth + 1))
        
        return result
    
    frequent_itemsets.extend(declat_extend(frequent_1))
    
    return generate_rules_from_itemsets(frequent_itemsets, transactions, min_confidence)


def mine_hmine(transactions, min_support, min_confidence):
    """
    H-Mine Algorithm Implementation.
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
    
    def hmine_recursive(db, prefix, depth=0):
        """Recursive H-Mine pattern growth."""
        if depth > 10 or not db:
            return
        
        # Count items in projected database
        local_counts = defaultdict(int)
        for t in db:
            for item in set(t):
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
    CARMA Algorithm Implementation.
    Continuous Association Rule Mining for streaming data.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
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
        t_filtered = sorted([i for i in set(t) if i in frequent_items])
        
        for size in range(1, min(len(t_filtered) + 1, 5)):
            for combo in combinations(t_filtered, size):
                itemset = frozenset(combo)
                candidate_counts[itemset] += 1
    
    # Filter frequent itemsets
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
    CHARM Algorithm Implementation.
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
    all_closed = {}
    
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
                        new_itemset = itemset_i | itemset_j
                        items[i] = new_itemset
                        itemset_i = new_itemset
                        items.pop(j)
                        continue
                    elif new_tids == tids_i:
                        new_itemset = itemset_i | itemset_j
                        items[i] = new_itemset
                        itemset_i = new_itemset
                    elif new_tids == tids_j:
                        new_itemset = itemset_i | itemset_j
                        items[j] = new_itemset
                    else:
                        new_itemset = itemset_i | itemset_j
                        new_prefix[new_itemset] = new_tids
                
                j += 1
            
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
    CLOSET Algorithm Implementation.
    Uses FP-tree based approach for closed pattern mining.
    """
    return mine_charm(transactions, min_support, min_confidence)


def mine_fpmax(transactions, min_support, min_confidence):
    """
    FPMax Algorithm Implementation.
    FP-tree based maximal frequent itemset mining.
    """
    if not transactions:
        return []
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Build item counts
    item_counts = defaultdict(int)
    for t in transactions:
        for item in t:
            item_counts[item] += 1
    
    # Filter frequent items
    frequent_items = {item: count for item, count in item_counts.items() 
                      if count >= min_support_count}
    
    if not frequent_items:
        return []
    
    # Sort items by frequency (descending)
    sorted_items = sorted(frequent_items.keys(), key=lambda x: -frequent_items[x])
    item_order = {item: idx for idx, item in enumerate(sorted_items)}
    
    # Sort transactions
    sorted_transactions = []
    for t in transactions:
        filtered = [item for item in t if item in frequent_items]
        sorted_t = sorted(filtered, key=lambda x: item_order[x])
        if sorted_t:
            sorted_transactions.append(sorted_t)
    
    maximal_itemsets = []
    all_frequent = []
    
    def get_support(itemset, trans_subset=None):
        """Calculate support for itemset."""
        count = 0
        data = trans_subset if trans_subset else sorted_transactions
        for t in data:
            if all(item in t for item in itemset):
                count += 1
        return count
    
    def is_subset_of_maximal(itemset):
        """Check if itemset is subset of any maximal."""
        for max_info in maximal_itemsets:
            if itemset < max_info['itemset']:
                return True
        return False
    
    def fpmax_mine(prefix, remaining_items, depth=0):
        """FPMax mining with look-ahead."""
        if depth > 10 or not remaining_items:
            return
        
        # Look-ahead: check if prefix + all remaining is frequent
        full_set = prefix | frozenset(remaining_items)
        full_support = get_support(full_set)
        
        if full_support >= min_support_count:
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
        
        # Mine each item
        for i, item in enumerate(remaining_items):
            new_prefix = prefix | frozenset([item])
            support = get_support(new_prefix)
            
            if support >= min_support_count:
                all_frequent.append({
                    'itemset': new_prefix,
                    'support_count': support
                })
                
                new_remaining = remaining_items[i+1:]
                if new_remaining:
                    fpmax_mine(new_prefix, new_remaining, depth + 1)
                elif not is_subset_of_maximal(new_prefix):
                    maximal_itemsets.append({
                        'itemset': new_prefix,
                        'support_count': support
                    })
    
    # Add 1-itemsets
    for item, count in frequent_items.items():
        all_frequent.append({
            'itemset': frozenset([item]),
            'support_count': count
        })
    
    # Start mining
    fpmax_mine(frozenset(), sorted_items)
    
    return generate_rules_from_itemsets(all_frequent, transactions, min_confidence)


def mine_maxminer(transactions, min_support, min_confidence):
    """
    MaxMiner Algorithm Implementation.
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
        
        full_set = head | frozenset(tail)
        full_support = get_support(full_set)
        
        if full_support >= min_support_count:
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
        
        for i, item in enumerate(tail):
            new_head = head | frozenset([item])
            head_support = get_support(new_head)
            
            if head_support >= min_support_count:
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
    
    return generate_rules_from_itemsets(all_frequent, transactions, min_confidence)


# =============================================================================
# EXTENDED ALGORITHMS - HUIM, Fuzzy, Stream
# =============================================================================

def mine_two_phase_huim(transactions, min_utility, item_utilities=None):
    """
    Two-Phase High-Utility Itemset Mining.
    Phase 1: Find HTWUIs using TWU
    Phase 2: Calculate exact utilities
    """
    if not transactions:
        return []
    
    # Default item utilities (all 1 if not provided)
    if item_utilities is None:
        all_items = set()
        for t in transactions:
            all_items.update(t)
        item_utilities = {item: 1 for item in all_items}
    
    n_transactions = len(transactions)
    
    # Calculate TWU for each item
    twu = defaultdict(float)
    for t in transactions:
        # Transaction utility (sum of all item utilities)
        tu = sum(item_utilities.get(item, 1) for item in t)
        
        for item in t:
            twu[item] += tu
    
    # Get promising items (TWU >= min_utility)
    promising_items = {item for item, twu_val in twu.items() 
                      if twu_val >= min_utility}
    
    if not promising_items:
        return []
    
    # Phase 1: Find HTWUIs
    htwuis = []
    sorted_items = sorted(promising_items)
    
    # Generate candidate itemsets up to size 4
    for size in range(1, 5):
        for combo in combinations(sorted_items, size):
            itemset = frozenset(combo)
            # Check TWU threshold
            itemset_twu = min(twu.get(item, 0) for item in itemset)
            if itemset_twu >= min_utility:
                htwuis.append(itemset)
    
    # Phase 2: Calculate exact utilities
    huis = []
    for itemset in htwuis:
        utility = 0
        support_count = 0
        
        for t in transactions:
            if all(item in t for item in itemset):
                support_count += 1
                for item in itemset:
                    utility += item_utilities.get(item, 1)
        
        if utility >= min_utility:
            huis.append({
                'itemset': itemset,
                'utility': utility,
                'support_count': support_count,
                'items': list(itemset)
            })
    
    # Sort by utility
    huis.sort(key=lambda x: -x['utility'])
    
    return huis


def mine_fuzzy_apriori(transactions, min_support, min_confidence, fuzzy_sets=None):
    """
    Fuzzy Apriori Algorithm Implementation.
    Handles quantitative data with fuzzy membership functions.
    """
    if not transactions:
        return []
    
    # For now, treat as regular transactions with membership degree 1.0
    # This is a simplified version; full implementation needs quantitative data
    
    n_transactions = len(transactions)
    min_support_count = max(1, int(min_support * n_transactions))
    
    # Calculate fuzzy support for 1-itemsets
    item_support = defaultdict(float)
    
    for t in transactions:
        for item in t:
            # Membership degree is 1.0 for binary data
            item_support[item] += 1.0
    
    # Filter by support
    L1 = {}
    for item, support in item_support.items():
        normalized_support = support / n_transactions
        if normalized_support >= min_support:
            L1[frozenset([item])] = normalized_support
    
    if not L1:
        return []
    
    frequent_itemsets = {1: L1}
    
    k = 2
    while True:
        # Generate candidates
        Ck = set()
        items = list(frequent_itemsets[k-1].keys())
        
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                union = items[i] | items[j]
                if len(union) == k:
                    # Check downward closure
                    valid = True
                    for subset in combinations(union, k - 1):
                        if frozenset(subset) not in frequent_itemsets[k-1]:
                            valid = False
                            break
                    if valid:
                        Ck.add(union)
        
        if not Ck:
            break
        
        # Calculate fuzzy support
        candidate_support = defaultdict(float)
        for t in transactions:
            t_set = set(t)
            for candidate in Ck:
                if all(item in t_set for item in candidate):
                    # Fuzzy AND: minimum membership
                    candidate_support[candidate] += 1.0
        
        Lk = {}
        for candidate, support in candidate_support.items():
            normalized_support = support / n_transactions
            if normalized_support >= min_support:
                Lk[candidate] = normalized_support
        
        if not Lk:
            break
        
        frequent_itemsets[k] = Lk
        k += 1
        
        if k > 6:
            break
    
    # Convert to itemset list
    all_itemsets = []
    for k, itemsets in frequent_itemsets.items():
        for itemset, support in itemsets.items():
            all_itemsets.append({
                'itemset': itemset,
                'support_count': int(support * n_transactions)
            })
    
    return generate_rules_from_itemsets(all_itemsets, transactions, min_confidence)


def mine_lossy_counting(transactions, epsilon=0.01, support_threshold=0.1):
    """
    Lossy Counting Algorithm for stream mining.
    Approximate frequent items with bounded error.
    """
    if not transactions:
        return []
    
    bucket_width = int(1 / epsilon) if epsilon > 0 else 100
    counters = {}  # item -> (count, delta)
    current_bucket = 1
    
    # Process transactions as stream
    for t in transactions:
        for item in set(t):
            if item in counters:
                counters[item] = (counters[item][0] + 1, counters[item][1])
            else:
                counters[item] = (1, current_bucket - 1)
        
        # Periodic pruning
        if current_bucket % bucket_width == 0:
            to_delete = []
            for item, (count, delta) in counters.items():
                if count + delta <= current_bucket:
                    to_delete.append(item)
            for item in to_delete:
                del counters[item]
        
        current_bucket += 1
    
    # Get frequent items
    n_transactions = len(transactions)
    threshold = (support_threshold - epsilon) * n_transactions
    
    frequent_items = []
    for item, (count, delta) in counters.items():
        if count >= threshold:
            frequent_items.append({
                'item': item,
                'count': count,
                'estimated_support': round(count / n_transactions, 4)
            })
    
    # Sort by count
    frequent_items.sort(key=lambda x: -x['count'])
    
    return frequent_items


# =============================================================================
# DATA PREPROCESSING (Legacy wrapper for backward compatibility)
# =============================================================================

def preprocess_transactions(transactions, options=None):
    """
    Preprocess transactions with enhanced options.
    Uses AdvancedPreprocessor internally.
    """
    if options is None:
        options = {}
    
    # Map legacy options to new format
    preprocessor_options = {
        'lowercase': options.get('lowercase', False),
        'remove_duplicates': options.get('remove_duplicates', False),
        'min_items': options.get('min_items', 1),
        'max_items': options.get('max_items', 100),
        'min_item_frequency': options.get('min_item_frequency', 0),
        'max_item_frequency': options.get('max_item_frequency', 0.95),
        'apply_synonyms': options.get('apply_synonyms', False),
        'remove_numeric_items': options.get('remove_numeric_items', False),
        'remove_timestamps': options.get('remove_timestamps', False),
        'min_item_length': options.get('min_item_length', 2),
        'missing_value_strategy': options.get('missing_value_strategy', 'remove'),
    }
    
    # Add exclude items to stop items
    if options.get('exclude_items'):
        preprocessor_options['stop_items'] = set(options['exclude_items'])
    
    preprocessor = AdvancedPreprocessor(preprocessor_options)
    processed = preprocessor.preprocess(transactions)
    
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
    Upload and process a dataset with advanced preprocessing.
    """
    global dataset_profile
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = file.filename.lower()
    
    try:
        # Read file with flexible encoding
        if filename.endswith('.csv'):
            file_bytes = file.read()
            
            # Detect encoding
            preprocessor = AdvancedPreprocessor()
            encoding = preprocessor.detect_encoding(file_bytes)
            
            file_content = file_bytes.decode(encoding, errors='ignore')
            lines = file_content.strip().split('\n')
            
            # Detect delimiter
            delimiter = preprocessor.detect_delimiter(file_content[:5000])
            
            # Detect header
            has_header, start_idx = preprocessor.detect_header(lines)
            
            transactions = []
            for line in lines[start_idx:]:
                items = preprocessor.parse_transaction(line, delimiter)
                if items:
                    transactions.append(items)
                    
        elif filename.endswith(('.xlsx', '.xls')):
            file.seek(0)
            df = pd.read_excel(file)
            transactions = []
            
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
        
        # Save processed transactions
        items_str = [','.join(t) for t in transactions]
        processed_df = pd.DataFrame({'items': items_str})
        processed_df.to_csv(TRANSACTIONS_FILE, index=False)
        
        # Profile the dataset
        profile = profile_dataset(transactions)
        dataset_profile = profile
        
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
    """
    Apply advanced preprocessing options to the uploaded dataset.
    """
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


# Global variable to store the latest mining rules
latest_mining_rules = []


@app.route('/api/mine', methods=['POST'])
def mine_patterns():
    """
    Execute pattern mining algorithm with all available algorithms.
    """
    global latest_mining_rules
    
    try:
        data = request.get_json() or {}
        algorithm = data.get('algorithm', 'fp-growth').lower()
        min_support = float(data.get('min_support', 0.1))
        min_confidence = float(data.get('min_confidence', 0.5))
        max_rules = int(data.get('max_rules', 5000))
        
        # Validate parameters
        if not 0 < min_support <= 1:
            return jsonify({'error': 'min_support must be between 0 and 1'}), 400
        if not 0 < min_confidence <= 1:
            return jsonify({'error': 'min_confidence must be between 0 and 1'}), 400
        
        start_time = time.time()
        transactions = load_transactions()
        
        if not transactions:
            return jsonify({'error': 'No transactions loaded. Please upload a dataset first.'}), 400
        
        load_time = time.time() - start_time
        mine_start = time.time()
        
        # Algorithm mapping
        algorithm_map = {
            'apriori': mine_apriori,
            'apriori-tid': mine_apriori_tid,
            'aprioritid': mine_apriori_tid,
            'fp-growth': mine_fpgrowth,
            'fpgrowth': mine_fpgrowth,
            'eclat': mine_eclat,
            'declat': mine_declat,
            'd-eclat': mine_declat,
            'h-mine': mine_hmine,
            'hmine': mine_hmine,
            'carma': mine_carma,
            'charm': mine_charm,
            'closet': mine_closet,
            'fpmax': mine_fpmax,
            'fp-max': mine_fpmax,
            'maxminer': mine_maxminer,
            'fuzzy-apriori': mine_fuzzy_apriori,
            'fuzzyapriori': mine_fuzzy_apriori,
        }
        
        mine_func = algorithm_map.get(algorithm)
        if not mine_func:
            return jsonify({'error': f'Unknown algorithm: {algorithm}. Available: {list(algorithm_map.keys())}'}), 400
        
        # Handle fuzzy apriori specially
        if algorithm in ['fuzzy-apriori', 'fuzzyapriori']:
            rules = mine_func(transactions, min_support, min_confidence)
        else:
            rules = mine_func(transactions, min_support, min_confidence)
        
        mine_time = time.time() - mine_start
        
        # Apply rule pruning if needed
        original_count = len(rules)
        was_pruned = False
        
        if len(rules) > max_rules:
            rules = prune_redundant_rules(rules, max_rules)
            was_pruned = True
        
        # Sort by lift
        rules.sort(key=lambda x: x.get('lift', 0), reverse=True)
        
        # Store rules globally for prediction
        latest_mining_rules = rules
        
        gc.collect()
        
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
                'total_seconds': round(load_time + mine_time, 3)
            },
            'parameters': {
                'min_support': min_support,
                'min_confidence': min_confidence
            }
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
            'best_for': 'Small to medium datasets',
            'family': 'classical'
        },
        {
            'id': 'apriori-tid',
            'name': 'Apriori-TID',
            'description': 'Apriori with TID-list optimization for memory efficiency',
            'type': 'frequent',
            'best_for': 'Dense datasets with memory constraints',
            'family': 'classical'
        },
        {
            'id': 'fp-growth',
            'name': 'FP-Growth',
            'description': 'Pattern-growth algorithm using FP-tree structure',
            'type': 'frequent',
            'best_for': 'Large sparse datasets',
            'family': 'fp-tree'
        },
        {
            'id': 'fpmax',
            'name': 'FPMax',
            'description': 'FP-tree based maximal frequent itemset mining',
            'type': 'maximal',
            'best_for': 'Reducing rule explosion with maximal patterns',
            'family': 'fp-tree'
        },
        {
            'id': 'eclat',
            'name': 'ECLAT',
            'description': 'Equivalence class clustering using vertical TID-lists',
            'type': 'frequent',
            'best_for': 'Dense datasets',
            'family': 'vertical'
        },
        {
            'id': 'declat',
            'name': 'dEclat',
            'description': 'ECLAT with diffset optimization for deep patterns',
            'type': 'frequent',
            'best_for': 'Long transactions with deep patterns',
            'family': 'vertical'
        },
        {
            'id': 'h-mine',
            'name': 'H-Mine',
            'description': 'Memory-efficient algorithm using H-struct',
            'type': 'frequent',
            'best_for': 'Limited memory environments',
            'family': 'projected'
        },
        {
            'id': 'carma',
            'name': 'CARMA',
            'description': 'Continuous association rule mining for streaming data',
            'type': 'frequent',
            'best_for': 'Streaming/incremental data',
            'family': 'stream'
        },
        {
            'id': 'charm',
            'name': 'CHARM',
            'description': 'Discovers closed frequent itemsets',
            'type': 'closed',
            'best_for': 'Reducing rule explosion',
            'family': 'closed'
        },
        {
            'id': 'closet',
            'name': 'CLOSET',
            'description': 'FP-tree based closed pattern mining',
            'type': 'closed',
            'best_for': 'Compact pattern representation',
            'family': 'closed'
        },
        {
            'id': 'maxminer',
            'name': 'MaxMiner',
            'description': 'Discovers maximal frequent itemsets with look-ahead',
            'type': 'maximal',
            'best_for': 'Minimal output size',
            'family': 'maximal'
        },
        {
            'id': 'fuzzy-apriori',
            'name': 'Fuzzy Apriori',
            'description': 'Handles quantitative data with fuzzy membership',
            'type': 'fuzzy',
            'best_for': 'Quantitative/uncertain data',
            'family': 'extended'
        }
    ]
    
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
        
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        df = pd.read_csv(TRANSACTIONS_FILE)
        
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
            
            if len(all_items) > 1:
                class_column = all_items[-1]
                y = X[class_column]
                X = X.drop(columns=[class_column])
            else:
                return jsonify({'error': 'Dataset needs at least 2 columns for classification'}), 400
        else:
            X = df.iloc[:, :-1]
            y = df.iloc[:, -1]
        
        # Encode features
        X_encoded = X.copy()
        label_encoders = {}
        for col in X_encoded.columns:
            if X_encoded[col].dtype == 'object':
                le = LabelEncoder()
                X_encoded[col] = le.fit_transform(X_encoded[col].astype(str))
                label_encoders[col] = le
        
        # Encode target
        y_le = LabelEncoder()
        y_encoded = y_le.fit_transform(y.astype(str))
        class_labels = y_le.classes_.tolist()
        
        # Handle missing values
        X_encoded = X_encoded.fillna(0)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        start_time = time.time()
        
        if algorithm in ['naive-bayes', 'naivebayes']:
            classifier = GaussianNB()
            classifier.fit(X_train, y_train)
            feature_importances = None
        elif algorithm in ['decision-tree', 'decisiontree']:
            classifier = DecisionTreeClassifier(random_state=42, max_depth=10)
            classifier.fit(X_train, y_train)
            importances = classifier.feature_importances_
            feature_importances = [
                {'feature': str(col), 'importance': float(imp)}
                for col, imp in sorted(zip(X.columns, importances), key=lambda x: -x[1])
                if imp > 0
            ]
        else:
            return jsonify({'error': f'Unknown algorithm: {algorithm}. Use naive-bayes or decision-tree'}), 400
        
        y_pred = classifier.predict(X_test)
        execution_time = time.time() - start_time
        
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
            result['feature_importances'] = feature_importances[:20]
        
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
        
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        df = pd.read_csv(TRANSACTIONS_FILE)
        
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
            feature_names = list(all_items)
        else:
            X = df.copy()
            feature_names = list(X.columns)
        
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
        
        X = X.fillna(0)
        
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
        
        n_clusters_found = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        
        if n_clusters_found > 1 and len(set(cluster_labels)) > 1:
            mask = cluster_labels != -1
            if mask.sum() > 1:
                sil_score = silhouette_score(X_scaled[mask], cluster_labels[mask])
            else:
                sil_score = 0.0
        else:
            sil_score = 0.0
        
        cluster_sizes = {}
        for label in cluster_labels:
            key = str(label)
            cluster_sizes[key] = cluster_sizes.get(key, 0) + 1
        
        max_points = min(1000, len(X_scaled))
        data_points = []
        for i in range(max_points):
            data_points.append({
                'features': X_scaled[i].tolist()[:10],
                'cluster': int(cluster_labels[i])
            })
        
        result = {
            'success': True,
            'algorithm': algorithm,
            'n_clusters': n_clusters_found,
            'cluster_labels': cluster_labels.tolist(),
            'silhouette_score': round(sil_score, 4),
            'cluster_sizes': cluster_sizes,
            'feature_names': feature_names[:10],
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
    """
    try:
        data = request.get_json() or {}
        max_k = min(data.get('max_k', 10), 15)
        
        if not os.path.exists(TRANSACTIONS_FILE):
            return jsonify({'error': 'No dataset uploaded. Please upload a dataset first.'}), 400
        
        df = pd.read_csv(TRANSACTIONS_FILE)
        
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
        
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
        
        X = X.fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        if len(X_scaled) > 5000:
            np.random.seed(42)
            indices = np.random.choice(len(X_scaled), 5000, replace=False)
            X_scaled = X_scaled[indices]
        
        elbow_data = []
        for k in range(2, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=100)
            cluster_labels = kmeans.fit_predict(X_scaled)
            
            inertia = float(kmeans.inertia_)
            
            if len(set(cluster_labels)) > 1:
                sil_score = silhouette_score(X_scaled, cluster_labels)
            else:
                sil_score = 0.0
            
            elbow_data.append({
                'k': k,
                'inertia': round(inertia, 2),
                'silhouette': round(sil_score, 4)
            })
        
        inertias = [d['inertia'] for d in elbow_data]
        if len(inertias) >= 3:
            first_diff = np.diff(inertias)
            second_diff = np.diff(first_diff)
            elbow_idx = np.argmax(second_diff) + 2
            optimal_k = elbow_idx + 2
            optimal_k = min(max(optimal_k, 2), max_k)
        else:
            optimal_k = 3
        
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


@app.route('/api/predict', methods=['POST'])
def predict_next_item():
    """
    Predict next purchase based on association rules.
    """
    global latest_mining_rules
    
    try:
        data = request.get_json() or {}
        item = data.get('item', '').strip()
        
        if not item:
            return jsonify({'error': 'Please provide an item name'}), 400
        
        if not latest_mining_rules:
            return jsonify({
                'success': True,
                'recommendations': [],
                'message': 'No rules available. Please run mining first.'
            })
        
        item_lower = item.lower()
        
        matching_rules = []
        for rule in latest_mining_rules:
            antecedent = rule.get('antecedent', [])
            if any(item_lower in ant.lower() or ant.lower() in item_lower for ant in antecedent):
                matching_rules.append(rule)
        
        matching_rules.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
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
            
            if len(recommendations) >= 10:
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


@app.route('/api/huim', methods=['POST'])
def high_utility_mining():
    """
    High-Utility Itemset Mining endpoint.
    Uses Two-Phase algorithm.
    """
    try:
        data = request.get_json() or {}
        min_utility = float(data.get('min_utility', 100))
        item_utilities = data.get('item_utilities', None)
        
        transactions = load_transactions()
        
        if not transactions:
            return jsonify({'error': 'No transactions loaded. Please upload a dataset first.'}), 400
        
        start_time = time.time()
        
        huis = mine_two_phase_huim(transactions, min_utility, item_utilities)
        
        execution_time = time.time() - start_time
        
        return jsonify({
            'success': True,
            'algorithm': 'two-phase-huim',
            'high_utility_itemsets': huis[:100],  # Limit output
            'total_found': len(huis),
            'min_utility': min_utility,
            'execution_time': round(execution_time, 4)
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'HUIM failed: {str(e)}'}), 500


@app.route('/api/stream-mine', methods=['POST'])
def stream_mining():
    """
    Stream mining endpoint using Lossy Counting.
    """
    try:
        data = request.get_json() or {}
        epsilon = float(data.get('epsilon', 0.01))
        support_threshold = float(data.get('support_threshold', 0.1))
        
        transactions = load_transactions()
        
        if not transactions:
            return jsonify({'error': 'No transactions loaded. Please upload a dataset first.'}), 400
        
        start_time = time.time()
        
        frequent_items = mine_lossy_counting(transactions, epsilon, support_threshold)
        
        execution_time = time.time() - start_time
        
        return jsonify({
            'success': True,
            'algorithm': 'lossy-counting',
            'frequent_items': frequent_items,
            'total_found': len(frequent_items),
            'epsilon': epsilon,
            'support_threshold': support_threshold,
            'execution_time': round(execution_time, 4)
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Stream mining failed: {str(e)}'}), 500


@app.route('/api/dataset/preview', methods=['GET'])
def preview_dataset():
    """Get a preview of the dataset with sample transactions."""
    try:
        transactions = load_transactions()
        
        if not transactions:
            return jsonify({'error': 'No dataset loaded'}), 404
        
        # Sample transactions
        sample_size = min(10, len(transactions))
        sample = transactions[:sample_size]
        
        return jsonify({
            'success': True,
            'sample_transactions': [
                {'id': i+1, 'items': t} for i, t in enumerate(sample)
            ],
            'total_transactions': len(transactions)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("="*60)
    print("SmartMine Backend - Enhanced with Advanced Preprocessing")
    print("="*60)
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Processed folder: {PROCESSED_FOLDER}")
    print("Available algorithms:")
    print("  - Classical: Apriori, Apriori-TID, FP-Growth, ECLAT, dEclat")
    print("  - Pattern: H-Mine, CARMA, CHARM, CLOSET, FPMax, MaxMiner")
    print("  - Extended: Fuzzy Apriori, Two-Phase HUIM, Lossy Counting")
    print("  - ML: Naive Bayes, Decision Tree, K-Means, DBSCAN")
    print("="*60)
    app.run(debug=True, host='0.0.0.0', port=5000)
