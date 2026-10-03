import csv
import os
import sys
import json
from collections import Counter

DATA_DIR = r"C:\Users\srivi\Downloads\news-category-classifier\data\raw"
FILES = [
    "business_data.csv",
    "education_data.csv",
    "entertainment_data.csv",
    "sports_data.csv",
    "technology_data.csv"
]

def analyze_file(file_path):
    filename = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    
    # Increase field limit for large text fields
    csv.field_size_limit(sys.maxsize)
    
    rows = []
    with open(file_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return {"error": "Empty file"}
            
        header = [col.strip() for col in header]
        for row in reader:
            rows.append(row)
            
    num_rows = len(rows)
    num_cols = len(header)
    
    # Column mapping (lowercased lookup)
    col_map = {col.lower(): idx for idx, col in enumerate(header)}
    
    # Missing values per column
    missing_counts = {col: 0 for col in header}
    
    # Duplicates tracking
    row_tuples = []
    urls = []
    categories = []
    
    # Text length tracking (headline + description + content)
    headline_lengths = []
    description_lengths = []
    content_lengths = []
    combined_lengths = []
    
    empty_headlines = 0
    empty_descriptions = 0
    empty_content = 0
    
    # Identify key columns
    headline_idx = col_map.get("headlines") if "headlines" in col_map else col_map.get("headline")
    desc_idx = col_map.get("description") if "description" in col_map else col_map.get("descriptions")
    content_idx = col_map.get("content")
    url_idx = col_map.get("url")
    cat_idx = col_map.get("category")
    
    for r in rows:
        # Pad row if shorter than header
        if len(r) < num_cols:
            r = r + [""] * (num_cols - len(r))
        elif len(r) > num_cols:
            r = r[:num_cols]
            
        row_tuples.append(tuple(r))
        
        for idx, col in enumerate(header):
            val = r[idx].strip()
            if not val or val.lower() in ("null", "none", "nan"):
                missing_counts[col] += 1
                
        # Headline
        hl = r[headline_idx].strip() if headline_idx is not None else ""
        if not hl or hl.lower() in ("null", "none", "nan"):
            empty_headlines += 1
        else:
            headline_lengths.append(len(hl))
            
        # Description
        desc = r[desc_idx].strip() if desc_idx is not None else ""
        if not desc or desc.lower() in ("null", "none", "nan"):
            empty_descriptions += 1
        else:
            description_lengths.append(len(desc))
            
        # Content
        cnt = r[content_idx].strip() if content_idx is not None else ""
        if not cnt or cnt.lower() in ("null", "none", "nan"):
            empty_content += 1
        else:
            content_lengths.append(len(cnt))
            
        # Combined text (headline + description + content)
        comb = " ".join(filter(None, [hl, desc, cnt])).strip()
        if comb:
            combined_lengths.append(len(comb))
            
        # URL
        if url_idx is not None:
            u = r[url_idx].strip()
            if u:
                urls.append(u)
                
        # Category
        if cat_idx is not None:
            c = r[cat_idx].strip()
            if c:
                categories.append(c)
                
    duplicate_rows = num_rows - len(set(row_tuples))
    duplicate_urls = len(urls) - len(set(urls))
    category_counts = dict(Counter(categories))
    
    # Text length stats
    def calc_stats(lengths):
        if not lengths:
            return {"min": 0, "max": 0, "avg": 0}
        return {
            "min": min(lengths),
            "max": max(lengths),
            "avg": round(sum(lengths) / len(lengths), 2)
        }
        
    return {
        "filename": filename,
        "file_size_bytes": file_size,
        "rows": num_rows,
        "columns": num_cols,
        "column_names": header,
        "missing_values": missing_counts,
        "duplicate_rows": duplicate_rows,
        "total_urls": len(urls),
        "duplicate_urls": duplicate_urls,
        "empty_headlines": empty_headlines,
        "empty_descriptions": empty_descriptions,
        "empty_content": empty_content,
        "categories": category_counts,
        "combined_text_stats": calc_stats(combined_lengths),
        "headline_stats": calc_stats(headline_lengths),
        "description_stats": calc_stats(description_lengths),
        "content_stats": calc_stats(content_lengths)
    }

def main():
    print(f"Starting inspection of {len(FILES)} datasets in {DATA_DIR}...\n")
    results = []
    
    all_combined_lengths = []
    total_rows = 0
    all_categories = Counter()
    all_urls = []
    all_empty_hl = 0
    all_empty_desc = 0
    all_empty_cnt = 0
    
    for f in FILES:
        path = os.path.join(DATA_DIR, f)
        if not os.path.exists(path):
            print(f"ERROR: {path} not found!")
            continue
        stats = analyze_file(path)
        results.append(stats)
        
        total_rows += stats["rows"]
        all_categories.update(stats["categories"])
        all_empty_hl += stats["empty_headlines"]
        all_empty_desc += stats["empty_descriptions"]
        all_empty_cnt += stats["empty_content"]
        
        print(f"==================================================")
        print(f"Dataset: {stats['filename']}")
        print(f"==================================================")
        print(f"Rows: {stats['rows']}")
        print(f"Columns ({stats['columns']}): {stats['column_names']}")
        print(f"Missing Values: {stats['missing_values']}")
        print(f"Duplicate Rows: {stats['duplicate_rows']}")
        print(f"Duplicate URLs: {stats['duplicate_urls']}")
        print(f"Empty Headlines: {stats['empty_headlines']}")
        print(f"Empty Descriptions: {stats['empty_descriptions']}")
        print(f"Empty Content: {stats['empty_content']}")
        print(f"Category Distribution: {stats['categories']}")
        print(f"Combined Text Length Stats (chars): {stats['combined_text_stats']}")
        print()
        
    print(f"==================================================")
    print(f"OVERALL COMBINED SUMMARY")
    print(f"==================================================")
    print(f"Total Rows: {total_rows}")
    print(f"Total Categories: {dict(all_categories)}")
    print(f"Total Empty Headlines: {all_empty_hl}")
    print(f"Total Empty Descriptions: {all_empty_desc}")
    print(f"Total Empty Content: {all_empty_cnt}")
    
    # Save results as JSON
    os.makedirs(r"C:\Users\srivi\Downloads\news-category-classifier\reports", exist_ok=True)
    with open(r"C:\Users\srivi\Downloads\news-category-classifier\reports\data_inspection_report.json", "w", encoding="utf-8") as out:
        json.dump(results, out, indent=2)
    print(f"\nInspection report saved to reports/data_inspection_report.json")

if __name__ == "__main__":
    main()
