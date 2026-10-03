# AI News Intelligence Platform & Command Center

An enterprise-grade, full-stack Natural Language Processing (NLP) intelligence platform transforming raw news text and documents into multi-dimensional news telemetry. Powered by calibrated statistical classifiers (98.5% test accuracy across 5 canonical domains), semantic vector similarity search against 9,990 indexed articles, automated story family clustering, novelty detection, structure profiling, and human-in-the-loop active feedback.

---

## 📌 1. Source of Truth & Dataset Quality

The platform is strictly trained on the five authentic CSV datasets located in `data/raw/`:
* `business_data.csv` (2,000 articles)
* `education_data.csv` (2,000 articles)
* `entertainment_data.csv` (2,000 articles)
* `sports_data.csv` (2,000 articles)
* `technology_data.csv` (2,000 articles)

### Data Audit & Preprocessing Decisions:
* **Five Canonical Domains**: **Business**, **Education**, **Entertainment**, **Sports**, and **Technology**. (*Zero synthetic data; Politics is strictly excluded in alignment with real source datasets*).
* **Total Raw Articles**: 10,000 (2,000 per class — 100% balanced).
* **Duplicates Pruned**: 10 duplicate URLs identified in `education_data.csv` removed to avoid train/test leakage.
* **Processed Corpus**: 9,990 clean records stored in `data/processed/news_dataset.csv`.
* **Corpus Vector Index**: 9,990 precomputed TF-IDF sparse vectors (`models/corpus_tfidf.joblib`) paired with sub-millisecond retrieval metadata (`models/corpus_metadata.json`).

---

## 🧠 2. Machine Learning & Benchmarks (98.5% Accuracy)

### NLP Preprocessing Pipeline (`backend/app/ml/preprocessor.py`)
1. **HTML & Entity Stripping**: Unescapes HTML entities, removes markup tags `<p>`, `<div>`, `<script>`.
2. **URL & Email Filtering**: Removes web hyperlinks and email addresses.
3. **Punctuation & Noise Removal**: Retains alphabetic tokens and clean whitespaces.
4. **Case Normalization**: Full lowercase normalization.
5. **Stopword Elimination**: Combines standard NLTK English stopwords with journalistic artifacts (`said`, `also`, `would`, `year`, `new`).
6. **Suffix Normalization**: Lemmatization of plurals and continuous tense inflections.

### Benchmark Evaluation (Held-Out Test Set: 999 Articles)

| Model | Val Accuracy | Val Macro F1 | Test Accuracy | Macro Precision | Macro Recall | Macro F1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (Selected)** | **98.80%** | **98.80%** | **98.50%** | **98.53%** | **98.50%** | **98.50%** |
| Support Vector Machine (Calibrated) | 98.70% | 98.70% | 98.40% | 98.43% | 98.40% | 98.40% |
| Multinomial Naive Bayes | 98.60% | 98.60% | 98.20% | 98.25% | 98.20% | 98.20% |

*The default production model is **Logistic Regression** ($C=1.0$, `max_iter=1000`), validated with 98.50% Test Accuracy and calibrated posterior probabilities.*

---

## 🔬 3. The 12 Advanced Intelligence Features

| # | Feature | Architecture & Analytical Implementation |
|---|---|---|
| **1** | **News DNA** | Multi-signal radial fingerprint synthesizing 7 dimensions: category confidence, novelty index, vocabulary diversity (TTR), entity salience, terminology density, headline alignment, and top TF-IDF model weights. |
| **2** | **Story Family / Cluster** | Interactive SVG node-edge network graph linking the analyzed query to semantically related articles in the 9,990 corpus via cosine similarity, complete with orbital force layout and metadata drawer. |
| **3** | **Novelty Meter** | Calibrated 0–100 gauge calculated as $(1.0 - \max(\text{similarity})) \times 100$ against the precomputed corpus index. Features transparent tiers (Low, Moderate, High Novelty) and an academic disclaimer. |
| **4** | **Story Evolution Map** | Chronological and similarity relationship sequence displaying related headline, domain, length, and shared entities. |
| **5** | **Claim Comparison** | Side-by-side statement difference inspector comparing the query's core sentences with related corpus articles, tagged with neutral analytical labels (*"Claim difference detected"*, *"Different wording"*). |
| **6** | **Coverage Gap Analysis** | Objective dataset representation audit breaking down canonical category distribution and 15 subtopic clusters generated via MiniBatchKMeans and Latent Semantic Analysis (LSA). |
| **7** | **Article Structure Analyzer** | Computes word count, sentence count, paragraph count, Type-Token Ratio (TTR) vocabulary diversity, entity density per 100 words, and repetition ratio. |
| **8** | **Headline vs Body Consistency**| Jaccard and TF-IDF semantic alignment scoring measuring consistency between the headline promise and the body text. |
| **9** | **Source-Aware Analysis** | Descriptive URL domain and editorial desk analysis parsing authentic editorial subpaths (e.g. `business/economy`, `technology/artificial-intelligence`, `sports/cricket`). Strictly descriptive without subjective ranking. |
| **10** | **Model Explanation** | Direct feature log-odds coefficient contribution displaying the mathematical weights that drove the classifier's verdict. |
| **11** | **Human Correction Loop** | Active supervision widget allowing expert review (`[Correct]` / `[Incorrect]` -> correction category selector). Logged to SQLite `human_reviews` table with live agreement statistics and one-click retraining integration. |
| **12** | **Intelligence Report Export** | Complete structured intelligence briefing exportable directly to formatted JSON or TXT/Markdown documents. |

---

## 💻 4. Command Center Workstation UI

The user interface is designed as an enterprise intelligence workstation:
* **Top Header & Pipeline Indicator**: Shows live system health, corpus count, and active stage (`AWAITING INGESTION` → `COMPUTING REPRESENTATION` → `INTELLIGENCE PIPELINE COMPLETE`).
* **Multi-Modal Ingestion Console**:
  * **Raw Text**: Headline + body input with 5 domain presets.
  * **Document Upload**: Supports `.txt`, `.pdf` (via `pypdf`), and `.docx` (via `python-docx`).
  * **Live URL Ingestion**: Real-time HTTP fetching and HTML article extraction.
* **3-Column Workstation Layout**:
  * **Left Column (Span 7)**: Ingestion console, Primary classification verdict & 5-domain probability meters, Model feature signals, Article Structure card, and Human Correction Loop.
  * **Right Column (Span 5)**: Segmented News DNA Radial Visualizer, Semicircular Novelty Gauge, and Extracted Named Entities.
  * **Full-Width Telemetry Row**: Story Cluster Node Graph, Story Evolution Sequence, Side-by-Side Claim Comparison, and 3D-styled Category Constellation Map.

---

## ⚡ 5. Complete API Endpoints Reference

The FastAPI backend runs on `http://127.0.0.1:8000`:

### Core Inference & Dataset
* `GET /api/health` — System status, models loaded, best model, timestamp.
* `GET /api/dataset/summary` — Full dataset metrics, category percentages, cleaning audit.
* `GET /api/dataset/articles` — Paginated search through processed articles.
* `GET /api/categories` — Canonical category details and top keywords.
* `GET /api/models` — Available models with validation and test accuracies.
* `GET /api/model-performance` — Full classification reports and metrics table.
* `GET /api/keywords` — Top TF-IDF keywords per category.
* `GET /api/confusion-matrix` — Test-set confusion matrices for all 3 models.
* `POST /api/predict` — Live prediction with attached News DNA.
* `POST /api/predict/file` — Ingest `.txt`, `.pdf`, `.docx`, or live URL and return prediction + News DNA.
* `POST /api/predict/batch` — Bulk JSON classification.
* `POST /api/predict/batch-upload` — CSV upload classification.
* `GET /api/predictions/recent` — SQLite query log of recent classifications.
* `GET /api/statistics` — Real-time aggregate inference & corpus statistics.

### Advanced Intelligence Telemetry
* `POST /api/news-dna` — Complete News DNA fingerprint assembly.
* `POST /api/similarity` — Sub-millisecond vector similarity search across 9,990 articles.
* `POST /api/novelty` — Novelty score calculation relative to corpus index.
* `POST /api/article-profile` — Structural metrics (TTR, entity density, repetition ratio).
* `POST /api/headline-alignment` — Semantic alignment scoring between headline and body.
* `POST /api/entities` — Rule-based named entity extraction.
* `POST /api/claim-comparison` — Statement difference inspector across related stories.
* `GET /api/story-clusters` — 15 semantic subtopic clusters from corpus.
* `GET /api/coverage-gaps` — Corpus representation audit across categories and subtopics.
* `GET /api/source-analysis` — Source domain and editorial desk distribution.
* `GET /api/category-constellation` — Category stars and keyword satellite map.
* `POST /api/review` — Log human review agreement or correction to SQLite.
* `GET /api/review/stats` — Retrieve human review count, agreements, corrections, and agreement rate.
* `POST /api/retrain` — Retrain models and rebuild vector index with human feedback.

---

## 🏃 6. Running & Verifying the Application

### 1. Start the FastAPI Backend
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 2. Start the React Frontend
```bash
cd frontend
npm run dev -- --port 5173 --host 127.0.0.1
```
Workstation URL: `http://127.0.0.1:5173`

### 3. Run Automated End-to-End Verification
```bash
python scripts/verify_e2e.py
```
*Executes all 6 test suites: Health, News DNA pipeline, Novelty Gauge, Human Review Loop, Multi-modal file upload, and Telemetry endpoints.*
