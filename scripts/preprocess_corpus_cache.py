"""
One-time script to precompute processed_text for news_dataset.csv
to enable sub-second dataset loading during automatic background retraining.
"""
import os
import sys
import time
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
from app.ml.preprocessor import preprocess_text

def main():
    src_csv = os.path.join(BASE_DIR, "data", "processed", "news_dataset.csv")
    out_csv = os.path.join(BASE_DIR, "data", "processed", "news_dataset_processed.csv")
    
    if not os.path.exists(src_csv):
        print(f"Error: {src_csv} not found.")
        return
        
    print(f"Loading {src_csv}...")
    df = pd.read_csv(src_csv)
    print(f"Loaded {len(df)} rows. Preprocessing combined_text...")
    t0 = time.time()
    
    df["processed_text"] = df["combined_text"].fillna("").astype(str).apply(preprocess_text)
    
    df.to_csv(out_csv, index=False, encoding="utf-8")
    elapsed = time.time() - t0
    print(f"Successfully saved {out_csv} ({len(df)} rows) in {elapsed:.2f}s")

if __name__ == "__main__":
    main()
