import os
import json
import uuid
from collections import Counter
import numpy as np
import joblib

from app.ml.preprocessor import preprocess_text
from app.models.database import save_prediction

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")

CATEGORIES = ["business", "education", "entertainment", "sports", "technology"]
DISPLAY_CATEGORIES = ["Business", "Education", "Entertainment", "Sports", "Technology"]

# Global model cache
vectorizer = None
models = {}
best_model_name = "Support Vector Machine"
metadata = {}

def load_models():
    """Load TF-IDF vectorizer and trained models from the models directory."""
    global vectorizer, models, best_model_name, metadata

    vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
    if os.path.exists(vec_path):
        vectorizer = joblib.load(vec_path)

    model_files = {
        "Naive Bayes": "naive_bayes.joblib",
        "Logistic Regression": "logistic_regression.joblib",
        "Support Vector Machine": "support_vector_machine.joblib",
        "best": "best_model.joblib"
    }

    for name, filename in model_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            models[name] = joblib.load(path)

    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
                best_model_name = metadata.get("production_model") or metadata.get("best_model", "Support Vector Machine")
        except Exception:
            pass

load_models()

def predict_probabilities(model, features):
    """Calculate calibrated class probabilities for all 5 news categories."""
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(features)[0]
    else:
        decision = model.decision_function(features)[0]
        exp_d = np.exp(decision - np.max(decision))
        probs = exp_d / exp_d.sum()

    classes = getattr(model, "classes_", CATEGORIES)
    prob_dict = {c.capitalize(): round(float(p), 4) for c, p in zip(classes, probs)}
    for cat in DISPLAY_CATEGORIES:
        if cat not in prob_dict:
            prob_dict[cat] = 0.0

    return prob_dict, classes, probs

def predict_article(text: str, headline: str = None, model_name: str = "best", source_type: str = "Text", save_to_db: bool = True):
    """
    Main prediction function:
    1. Clean and preprocess input text
    2. Convert to TF-IDF vector
    3. Run inference across Naive Bayes, Logistic Regression, and SVM
    4. Compute winning category, confidence, and three-model agreement
    5. Optionally save result to SQLite database
    """
    if not vectorizer or not models:
        load_models()

    full_text = f"{headline.strip()}\n\n{text}" if headline and headline.strip() and headline.strip() not in text else text
    cleaned_text = preprocess_text(full_text)
    features = vectorizer.transform([cleaned_text])

    # Multi-model evaluation across all three trained architectures
    model_configs = [
        ("Naive Bayes", "Naive Bayes"),
        ("Logistic Regression", "Logistic Regression"),
        ("Support Vector Machine", "Calibrated SVM")
    ]

    models_predictions = {}
    predicted_classes = []

    for internal_name, display_name in model_configs:
        m = models.get(internal_name)
        if m is not None:
            prob_dict, classes, probs = predict_probabilities(m, features)
            top_idx = int(np.argmax(probs))
            cat = str(classes[top_idx]).capitalize()
            conf = round(float(probs[top_idx]), 4)
            models_predictions[display_name] = {
                "predicted_category": cat,
                "confidence": conf,
                "probabilities": dict(sorted(prob_dict.items(), key=lambda x: x[1], reverse=True))
            }
            predicted_classes.append(cat)

    # Active model prediction (resolved to production model, e.g. Support Vector Machine)
    active_model = models.get(best_model_name, models.get("Support Vector Machine", list(models.values())[0]))
    active_probs, active_classes, raw_probs = predict_probabilities(active_model, features)
    top_idx = int(np.argmax(raw_probs))
    predicted_category = str(active_classes[top_idx]).capitalize()
    confidence = round(float(raw_probs[top_idx]), 4)

    # Multi-model consensus
    counts = Counter(predicted_classes)
    most_common, count = counts.most_common(1)[0] if counts else (predicted_category, 1)
    model_agreement = {
        "ratio": f"{count}/{len(predicted_classes)}",
        "agreement_text": f"{count} / {len(predicted_classes)} models -> {most_common}",
        "consensus_category": most_common,
        "unanimous": count == len(predicted_classes),
        "majority": count >= 2,
        "disagreement": count == 1
    }

    # Extract top contributing TF-IDF keywords
    feature_names = np.array(vectorizer.get_feature_names_out())
    nonzero_cols = features.nonzero()[1]
    tfidf_scores = sorted([(feature_names[c], features[0, c]) for c in nonzero_cols], key=lambda x: x[1], reverse=True)
    contributing_words = [word for word, _ in tfidf_scores[:8]]

    pred_id = f"PRED_{uuid.uuid4().hex[:10].upper()}"
    clean_headline = headline.strip() if headline and headline.strip() else (full_text.split("\n")[0][:120].strip() if full_text else "Untitled Article")
    display_model = "Calibrated SVM" if best_model_name == "Support Vector Machine" else best_model_name

    result = {
        "prediction_id": pred_id,
        "predicted_category": predicted_category,
        "confidence": confidence,
        "probabilities": active_probs,
        "model_used": display_model,
        "contributing_words": contributing_words,
        "timestamp": None,
        "headline": clean_headline,
        "source_type": source_type or "Text",
        "models_predictions": models_predictions,
        "production_model": display_model,
        "model_agreement": model_agreement
    }

    if save_to_db:
        db_record = save_prediction(
            prediction_id=pred_id,
            article_text=full_text,
            predicted_category=predicted_category,
            confidence=confidence,
            probabilities_json=json.dumps(active_probs),
            model_used=display_model,
            headline=clean_headline,
            source_type=source_type or "Text"
        )
        result["prediction_id"] = db_record["prediction_id"]
        result["timestamp"] = db_record["timestamp"]

    return result

# Simple interface for routes
class ClassifierService:
    @property
    def best_model_name(self):
        return best_model_name

    @property
    def models(self):
        return models

    @property
    def vectorizer(self):
        return vectorizer

    @property
    def metadata(self):
        return metadata

    def predict(self, text, headline=None, model_name="best", source_type="Text", save_to_db=True):
        return predict_article(text, headline=headline, model_name=model_name, source_type=source_type, save_to_db=save_to_db)

classifier_service = ClassifierService()
