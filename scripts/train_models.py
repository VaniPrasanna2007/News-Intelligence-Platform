"""
Model Training Script for News Category Classification.
Trains Multinomial Naive Bayes, Logistic Regression, and Calibrated Linear SVM.
"""
import os
import sys
import json
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, f1_score

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.ml.preprocessor import preprocess_text

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

CATEGORIES = ["business", "education", "entertainment", "sports", "technology"]
DATA_FILES = {
    "business": "business_data.csv",
    "education": "education_data.csv",
    "entertainment": "entertainment_data.csv",
    "sports": "sports_data.csv",
    "technology": "technology_data.csv"
}

def load_and_prepare_data():
    """Load raw CSV files, combine, and clean text."""
    print("Loading raw dataset files...")
    dfs = []
    for cat, filename in DATA_FILES.items():
        path = os.path.join(RAW_DATA_DIR, filename)
        if os.path.exists(path):
            df = pd.read_csv(path)
            df["category"] = cat.lower()
            dfs.append(df)

    data = pd.concat(dfs, ignore_index=True)
    if "url" in data.columns:
        data = data.drop_duplicates(subset=["url"]).reset_index(drop=True)

    # Combine headline, description, and content
    data["combined_text"] = (
        data.get("headlines", "").fillna("") + " " +
        data.get("description", "").fillna("") + " " +
        data.get("content", "").fillna("")
    ).str.strip()

    print("Preprocessing text...")
    data["clean_text"] = data["combined_text"].apply(preprocess_text)

    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    data.to_csv(os.path.join(PROCESSED_DATA_DIR, "news_dataset.csv"), index=False)
    print(f"Dataset prepared: {len(data)} articles across {len(CATEGORIES)} categories.")
    return data

def train_and_evaluate():
    data = load_and_prepare_data()

    X = data["clean_text"].values
    y = data["category"].values

    # Stratified split: 80% train, 10% validation, 10% test
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

    # 1. TF-IDF Vectorization
    print("Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(max_features=12000, ngram_range=(1, 2), sublinear_tf=True)
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_val_tfidf = vectorizer.transform(X_val)
    X_test_tfidf = vectorizer.transform(X_test)

    # 2. Define ML models
    models = {
        "Naive Bayes": MultinomialNB(alpha=0.1),
        "Logistic Regression": LogisticRegression(C=5.0, max_iter=1000, solver="lbfgs", random_state=42),
        "Support Vector Machine": CalibratedClassifierCV(LinearSVC(C=1.0, random_state=42), cv=3)
    }

    results = {"validation": {}, "test": {}}
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    best_f1 = -1
    best_name = None
    best_model = None

    # 3. Train and evaluate each algorithm
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_tfidf, y_train)

        # Validation set evaluation
        val_preds = model.predict(X_val_tfidf)
        val_acc = accuracy_score(y_val, val_preds)
        val_f1 = f1_score(y_val, val_preds, average="macro")
        results["validation"][name] = {"accuracy": round(float(val_acc), 4), "f1_macro": round(float(val_f1), 4)}

        # Test set evaluation
        test_preds = model.predict(X_test_tfidf)
        test_acc = accuracy_score(y_test, test_preds)
        test_f1 = f1_score(y_test, test_preds, average="macro")
        results["test"][name] = {"accuracy": round(float(test_acc), 4), "f1_macro": round(float(test_f1), 4)}

        print(f"  {name} - Test Accuracy: {test_acc*100:.2f}%, Macro F1: {test_f1*100:.2f}%")

        # Save individual model
        filename = name.lower().replace(" ", "_") + ".joblib"
        joblib.dump(model, os.path.join(MODELS_DIR, filename))

        if val_f1 > best_f1:
            best_f1 = val_f1
            best_name = name
            best_model = model

    # 4. Save best model and TF-IDF vectorizer
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib"))
    joblib.dump(best_model, os.path.join(MODELS_DIR, "best_model.joblib"))

    # 5. Save metadata and performance reports
    metadata = {
        "production_model": best_name,
        "best_model": best_name,
        "classes": CATEGORIES
    }
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    results["production_model"] = best_name
    results["best_model"] = best_name
    with open(os.path.join(REPORTS_DIR, "model_performance.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nTraining Complete! Best model: {best_name}")

if __name__ == "__main__":
    train_and_evaluate()
