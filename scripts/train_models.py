"""
Complete Data Preparation, Training, Evaluation, and Keyword Extraction Pipeline.
Executes Phases 3, 4, 5, 6, 7, and 17 with zero fake data, full reproducibility,
and strict avoidance of data leakage.
"""
import os
import sys
import json
import logging
from collections import Counter
import numpy as np
import pandas as pd
import joblib

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.ml.preprocessor import preprocess_text, clean_text

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

CATEGORIES = ["business", "education", "entertainment", "sports", "technology"]
CSV_FILES = {
    "business": "business_data.csv",
    "education": "education_data.csv",
    "entertainment": "entertainment_data.csv",
    "sports": "sports_data.csv",
    "technology": "technology_data.csv"
}

def step1_prepare_dataset():
    logging.info("--- PHASE 3: Data Preparation & Cleaning ---")
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    
    dfs = []
    cleaning_decisions = []
    
    for cat, fname in CSV_FILES.items():
        fpath = os.path.join(RAW_DATA_DIR, fname)
        if not os.path.exists(fpath):
            raise FileNotFoundError(f"Missing dataset file: {fpath}")
            
        df = pd.read_csv(fpath)
        logging.info(f"Loaded {fname}: {len(df)} rows, columns: {list(df.columns)}")
        
        # Standardize category name lowercase
        df["category"] = cat.lower()
        dfs.append(df)
        
    combined_df = pd.concat(dfs, ignore_index=True)
    initial_count = len(combined_df)
    cleaning_decisions.append(f"Combined 5 raw datasets: initial total {initial_count} rows across 5 categories.")
    
    # Handle missing values
    for col in ["headlines", "description", "content", "url"]:
        if col in combined_df.columns:
            combined_df[col] = combined_df[col].fillna("").astype(str).str.strip()
            
    # Remove exact duplicate rows across all columns
    duplicates_before = combined_df.duplicated().sum()
    if duplicates_before > 0:
        combined_df = combined_df.drop_duplicates().reset_index(drop=True)
        cleaning_decisions.append(f"Removed {duplicates_before} exact duplicate rows.")
    else:
        cleaning_decisions.append("Verified: No exact duplicate rows present.")
        
    # Deduplicate based on URL if applicable
    url_duplicates = combined_df.duplicated(subset=["url"]).sum()
    if url_duplicates > 0:
        logging.info(f"Found {url_duplicates} duplicate URLs. Keeping first occurrence.")
        combined_df = combined_df.drop_duplicates(subset=["url"]).reset_index(drop=True)
        cleaning_decisions.append(f"Removed {url_duplicates} articles with duplicate URLs to prevent data duplication.")
        
    # Create combined_text = headline + description + content
    combined_df["combined_text"] = (
        combined_df["headlines"] + " " + 
        combined_df["description"] + " " + 
        combined_df["content"]
    ).str.strip()
    
    # Check for empty text rows
    empty_mask = combined_df["combined_text"].str.len() < 10
    empty_count = empty_mask.sum()
    if empty_count > 0:
        combined_df = combined_df[~empty_mask].reset_index(drop=True)
        cleaning_decisions.append(f"Filtered out {empty_count} rows with text length < 10 characters.")
    else:
        cleaning_decisions.append("Verified: All articles meet minimum text length requirement (>10 characters).")
        
    # Generate unique article_id
    combined_df["article_id"] = [f"ART_{i+1:05d}" for i in range(len(combined_df))]
    
    # Final column ordering
    cols_to_keep = ["article_id", "headlines", "description", "content", "url", "category", "combined_text"]
    combined_df = combined_df[cols_to_keep]
    
    # Save processed CSV
    out_csv = os.path.join(PROCESSED_DATA_DIR, "news_dataset.csv")
    combined_df.to_csv(out_csv, index=False, encoding="utf-8")
    logging.info(f"Saved processed dataset to {out_csv} ({len(combined_df)} rows)")
    
    # Compute and save summary stats
    cat_distribution = combined_df["category"].value_counts().to_dict()
    text_lengths = combined_df["combined_text"].str.len()
    
    summary = {
        "total_articles": len(combined_df),
        "categories": list(cat_distribution.keys()),
        "category_counts": cat_distribution,
        "category_percentages": {k: round((v / len(combined_df)) * 100, 2) for k, v in cat_distribution.items()},
        "text_length_chars": {
            "min": int(text_lengths.min()),
            "max": int(text_lengths.max()),
            "mean": round(float(text_lengths.mean()), 2),
            "median": round(float(text_lengths.median()), 2)
        },
        "cleaning_decisions": cleaning_decisions
    }
    
    os.makedirs(REPORTS_DIR, exist_ok=True)
    with open(os.path.join(REPORTS_DIR, "dataset_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    return combined_df, summary

def step2_train_and_evaluate(df):
    logging.info("--- PHASE 4 & 5: NLP Preprocessing & Model Training ---")
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Apply unified preprocessing to combined_text
    logging.info("Applying NLP Preprocessing to all articles...")
    df["processed_text"] = df["combined_text"].apply(preprocess_text)
    
    # Filter any row that became blank after preprocessing (if any)
    valid_mask = df["processed_text"].str.strip().str.len() > 0
    df = df[valid_mask].reset_index(drop=True)
    
    X = df["processed_text"]
    y = df["category"]
    
    # 80% train, 10% val, 10% test stratified split
    # First split 80% train, 20% temp
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    # Split temp evenly into validation (10% total) and test (10% total)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )
    
    logging.info(f"Split sizes: Train={len(X_train)} (80%), Val={len(X_val)} (10%), Test={len(X_test)} (10%)")
    
    # TF-IDF Feature Extraction (Fit ONLY on training data to prevent data leakage)
    logging.info("Fitting TF-IDF Vectorizer on training data...")
    vectorizer = TfidfVectorizer(
        max_features=12000,
        ngram_range=(1, 1),
        min_df=2,
        sublinear_tf=False
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)
    X_test_vec = vectorizer.transform(X_test)
    
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib"))
    logging.info(f"Saved TF-IDF vectorizer to models/tfidf_vectorizer.joblib (vocab size: {len(vectorizer.vocabulary_)})")
    
    # Model Definitions
    # 1. Multinomial Naive Bayes (alpha=0.1)
    # 2. Logistic Regression (C=0.6)
    # 3. Support Vector Machine (LinearSVC C=0.2 with CalibratedClassifierCV)
    models = {
        "Naive Bayes": MultinomialNB(alpha=0.1),
        "Logistic Regression": LogisticRegression(C=0.6, max_iter=1000, random_state=42),
        "Support Vector Machine": CalibratedClassifierCV(
            estimator=LinearSVC(C=0.2, random_state=42),
            cv=3
        )
    }
    
    val_results = {}
    test_results = {}
    trained_instances = {}
    
    target_names = sorted(list(set(y)))
    
    for name, model in models.items():
        logging.info(f"Training {name}...")
        model.fit(X_train_vec, y_train)
        trained_instances[name] = model
        
        # Save individual model
        file_slug = name.lower().replace(" ", "_")
        joblib.dump(model, os.path.join(MODELS_DIR, f"{file_slug}.joblib"))
        
        # Validation Evaluation
        y_val_pred = model.predict(X_val_vec)
        val_acc = accuracy_score(y_val, y_val_pred)
        val_prec_macro = precision_score(y_val, y_val_pred, average="macro", zero_division=0)
        val_rec_macro = recall_score(y_val, y_val_pred, average="macro", zero_division=0)
        val_f1_macro = f1_score(y_val, y_val_pred, average="macro", zero_division=0)
        val_f1_weighted = f1_score(y_val, y_val_pred, average="weighted", zero_division=0)
        
        val_results[name] = {
            "accuracy": round(float(val_acc), 4),
            "precision_macro": round(float(val_prec_macro), 4),
            "recall_macro": round(float(val_rec_macro), 4),
            "f1_macro": round(float(val_f1_macro), 4),
            "f1_weighted": round(float(val_f1_weighted), 4),
        }
        
        logging.info(f"[{name}] Validation - Acc: {val_acc:.4f}, Macro F1: {val_f1_macro:.4f}, Weighted F1: {val_f1_weighted:.4f}")
        
    # Select Best Model based on Validation Macro F1
    best_model_name = max(val_results, key=lambda k: val_results[k]["f1_macro"])
    logging.info(f"Selected Best Model based on Validation Macro F1: '{best_model_name}'")
    
    # Save best model copy
    best_model = trained_instances[best_model_name]
    joblib.dump(best_model, os.path.join(MODELS_DIR, "best_model.joblib"))
    
    # Full Test Set Evaluation for all models + detailed reports
    confusion_matrices = {}
    classification_reports = {}
    
    for name, model in trained_instances.items():
        y_test_pred = model.predict(X_test_vec)
        test_acc = accuracy_score(y_test, y_test_pred)
        test_prec_macro = precision_score(y_test, y_test_pred, average="macro", zero_division=0)
        test_rec_macro = recall_score(y_test, y_test_pred, average="macro", zero_division=0)
        test_f1_macro = f1_score(y_test, y_test_pred, average="macro", zero_division=0)
        test_f1_weighted = f1_score(y_test, y_test_pred, average="weighted", zero_division=0)
        
        cm = confusion_matrix(y_test, y_test_pred, labels=target_names).tolist()
        cr = classification_report(y_test, y_test_pred, target_names=target_names, output_dict=True, zero_division=0)
        
        test_results[name] = {
            "accuracy": round(float(test_acc), 4),
            "precision_macro": round(float(test_prec_macro), 4),
            "recall_macro": round(float(test_rec_macro), 4),
            "f1_macro": round(float(test_f1_macro), 4),
            "f1_weighted": round(float(test_f1_weighted), 4),
        }
        confusion_matrices[name] = {
            "classes": target_names,
            "matrix": cm
        }
        classification_reports[name] = cr
        
    # Model Metadata & Performance Reports
    model_metadata = {
        "best_model": best_model_name,
        "classes": target_names,
        "feature_count": len(vectorizer.vocabulary_),
        "train_size": len(X_train),
        "val_size": len(X_val),
        "test_size": len(X_test),
        "validation_results": val_results,
        "test_results": test_results
    }
    
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)
        
    with open(os.path.join(REPORTS_DIR, "model_performance.json"), "w", encoding="utf-8") as f:
        json.dump({
            "best_model": best_model_name,
            "validation": val_results,
            "test": test_results,
            "reports": classification_reports
        }, f, indent=2)
        
    with open(os.path.join(REPORTS_DIR, "confusion_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(confusion_matrices, f, indent=2)
        
    logging.info("Saved model metadata and reports.")
    
    # Step 3: Top Keywords Analysis per category using TF-IDF feature weights
    step3_extract_keywords(df, vectorizer, target_names)
    
    return model_metadata

def step3_extract_keywords(df, vectorizer, classes):
    logging.info("--- PHASE 17: Keyword Analysis ---")
    feature_names = np.array(vectorizer.get_feature_names_out())
    keywords_by_category = {}
    
    for cat in classes:
        cat_texts = df[df["category"] == cat]["processed_text"]
        cat_vec = vectorizer.transform(cat_texts)
        # Average TF-IDF score for each term in this category
        avg_weights = np.asarray(cat_vec.mean(axis=0)).flatten()
        top_indices = avg_weights.argsort()[::-1][:20]
        
        top_words = []
        for idx in top_indices:
            top_words.append({
                "keyword": feature_names[idx],
                "score": round(float(avg_weights[idx]), 5)
            })
            
        keywords_by_category[cat] = top_words
        
    with open(os.path.join(REPORTS_DIR, "category_keywords.json"), "w", encoding="utf-8") as f:
        json.dump(keywords_by_category, f, indent=2)
    with open(os.path.join(MODELS_DIR, "category_keywords.json"), "w", encoding="utf-8") as f:
        json.dump(keywords_by_category, f, indent=2)
        
    logging.info("Extracted and saved top keywords for all 5 categories.")

if __name__ == "__main__":
    df, summary = step1_prepare_dataset()
    metadata = step2_train_and_evaluate(df)
    print("\n================ PIPELINE EXECUTION SUCCESSFUL ================\n")
    print("Best Model:", metadata["best_model"])
    print("Validation Results:", json.dumps(metadata["validation_results"], indent=2))
    print("Test Results:", json.dumps(metadata["test_results"], indent=2))
