"""
Inference engine and model management.
Loads TF-IDF vectorizer and trained classification models.
Generates genuine calibrated probabilities and confidence scores.
"""
import os
import re
import json
import uuid
import logging
import sys
from typing import Dict, Any, List, Optional
from collections import Counter
import numpy as np
import joblib

from app.ml.preprocessor import preprocess_text, STEMMER
from app.models.database import save_prediction

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

CATEGORIES = ["business", "education", "entertainment", "sports", "technology"]

class NewsClassifierService:
    def __init__(self):
        self.vectorizer = None
        self.models = {}
        self.metadata = {}
        self.best_model_name = "Logistic Regression"
        self.classes = CATEGORIES
        self.load_models()
        
    def load_models(self):
        try:
            vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
            if os.path.exists(vec_path):
                self.vectorizer = joblib.load(vec_path)
                
            meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                    self.production_model_name = self.metadata.get("production_model") or self.metadata.get("best_model", "Logistic Regression")
                    self.best_model_name = self.production_model_name
                    self.classes = self.metadata.get("classes", CATEGORIES)
                    
            model_files = {
                "Naive Bayes": "naive_bayes.joblib",
                "Logistic Regression": "logistic_regression.joblib",
                "Support Vector Machine": "support_vector_machine.joblib",
                "best": "best_model.joblib"
            }
            
            for m_name, f_name in model_files.items():
                p = os.path.join(MODELS_DIR, f_name)
                if os.path.exists(p):
                    self.models[m_name] = joblib.load(p)
                    
            logging.info(f"Loaded models: {list(self.models.keys())}, Best: {self.best_model_name}")
        except Exception as e:
            logging.error(f"Error loading models: {e}")

    def get_model(self, name: str = "best"):
        if not self.models:
            self.load_models()
        if name != "best" and name in self.models:
            return self.models[name], name
        # If name is 'best', resolve to current production model
        prod_name = getattr(self, "production_model_name", "Support Vector Machine")
        if prod_name in self.models:
            return self.models[prod_name], prod_name
        if "best" in self.models:
            return self.models["best"], prod_name
        # Fallback to case-insensitive match
        for k in self.models:
            if k.lower().replace(" ", "") == name.lower().replace(" ", ""):
                return self.models[k], k
        return self.models.get("best", list(self.models.values())[0]), prod_name

    def predict(self, text: str, headline: Optional[str] = None, model_name: str = "best", source_type: Optional[str] = "Text", save_to_db: bool = True) -> Dict[str, Any]:
        if not self.vectorizer or not self.models:
            self.load_models()
            if not self.vectorizer or not self.models:
                raise RuntimeError("Models and TF-IDF vectorizer are not available. Please train models first.")
                
        # Incorporate headline if provided separately and not already in text body
        if headline and headline.strip() and headline.strip() not in text:
            full_input_text = f"{headline.strip()}\n\n{text}"
        else:
            full_input_text = text

        # 1. Unified Preprocessing
        clean_norm_text = preprocess_text(full_input_text)
        if not clean_norm_text.strip():
            # If text is purely punctuation or stopwords, use minimal cleaned representation
            clean_norm_text = full_input_text.lower().strip()
            
        # 2. TF-IDF vectorization
        features = self.vectorizer.transform([clean_norm_text])
        non_zero_count = int(features.getnnz())
        
        # 3. Model retrieval
        model, resolved_model_name = self.get_model(model_name)
        
        # 4. Predict probabilities (Genuine model output)
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(features)[0]
        else:
            # Fallback for models without predict_proba using decision_function + softmax
            decision = model.decision_function(features)[0]
            exp_d = np.exp(decision - np.max(decision))
            probs = exp_d / exp_d.sum()
            
        class_list = getattr(model, "classes_", self.classes)
        
        # Map probabilities to classes
        prob_dict = {}
        for c, p in zip(class_list, probs):
            prob_dict[c.capitalize()] = round(float(p), 4)
            
        # Ensure all 5 canonical categories exist in prob_dict
        for c in ["Business", "Education", "Entertainment", "Sports", "Technology"]:
            if c not in prob_dict:
                prob_dict[c] = 0.0
                
        # Best prediction
        top_idx = int(np.argmax(probs))
        predicted_category = str(class_list[top_idx]).capitalize()
        confidence = round(float(probs[top_idx]), 4)
        
        # 1. Article-Specific Contributing Keywords (WHY THIS CATEGORY?)
        feature_names = np.array(self.vectorizer.get_feature_names_out())
        nonzero_cols = features.nonzero()[1]
        
        # Build mapping from stems to full original words in the document text
        orig_words = re.findall(r'\b[A-Za-z]{3,}\b', full_input_text)
        stem_to_orig = {}
        for w in orig_words:
            st = STEMMER.stem(w.lower()) if STEMMER else w.lower()
            if st not in stem_to_orig:
                stem_to_orig[st] = w.lower()

        contributing_words = []
        try:
            cat_idx = list(class_list).index(predicted_category.lower())
            scores = []
            if hasattr(model, "coef_"):
                weights = model.coef_[cat_idx]
                scores = [(feature_names[col], float(features[0, col] * weights[col])) for col in nonzero_cols]
            elif hasattr(model, "calibrated_classifiers_"):
                base_coefs = [clf.estimator.coef_ for clf in model.calibrated_classifiers_ if hasattr(clf, "estimator") and hasattr(clf.estimator, "coef_")]
                if base_coefs:
                    avg_coef = np.mean(base_coefs, axis=0)
                    weights = avg_coef[cat_idx]
                    scores = [(feature_names[col], float(features[0, col] * weights[col])) for col in nonzero_cols]
            elif hasattr(model, "feature_log_prob_"):
                log_probs = model.feature_log_prob_[cat_idx]
                scores = [(feature_names[col], float(features[0, col] * np.exp(log_probs[col]))) for col in nonzero_cols]
                
            if scores:
                scores.sort(key=lambda x: x[1], reverse=True)
                top_stems = [stem for stem, sc in scores if sc > 0][:8]
                contributing_words = [stem_to_orig.get(st, st) for st in top_stems]
        except Exception as err:
            logging.warning(f"Could not compute contributing words: {err}")

        # Fallback if no positive features found
        if not contributing_words:
            tfidf_scores = [(feature_names[col], features[0, col]) for col in nonzero_cols]
            tfidf_scores.sort(key=lambda x: x[1], reverse=True)
            contributing_words = [stem_to_orig.get(st, st) for st, _ in tfidf_scores[:6]]

        # 2. Document Summary (based ONLY on this uploaded document)
        body_paragraphs = [
            p.strip() for p in full_input_text.split('\n')
            if len(p.strip()) > 50 and not p.strip().lower().startswith('test category') and not p.strip().lower().startswith('headline')
        ]
        if body_paragraphs:
            if headline and body_paragraphs[0].lower() == headline.lower().strip() and len(body_paragraphs) > 1:
                article_summary = body_paragraphs[1]
            else:
                article_summary = body_paragraphs[0]
        else:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', full_input_text) if len(s.strip()) > 20]
            body_sentences = sentences[1:3] if len(sentences) > 1 and len(sentences[0]) < 80 else sentences[:2]
            article_summary = " ".join(body_sentences) if body_sentences else full_input_text[:250]

        # 3. Article Profile
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', full_input_text) if len(s.strip()) > 10]
        words = full_input_text.split()
        article_profile = {
            "headline_length": len(headline.strip()) if headline and headline.strip() else (len(full_input_text.split('\n')[0].strip()) if '\n' in full_input_text else 0),
            "article_length": len(full_input_text),
            "word_count": len(words),
            "sentence_count": max(1, len(sentences))
        }

        # 4. Model Profile
        model_info = {
            "model_name": resolved_model_name,
            "tfidf_status": "Active",
            "prediction_status": "Completed"
        }

        # 5. Multi-Model Prediction Comparison (Naive Bayes, Logistic Regression, Calibrated SVM)
        target_models = [
            ("Naive Bayes", "Naive Bayes"),
            ("Logistic Regression", "Logistic Regression"),
            ("Support Vector Machine", "Calibrated SVM")
        ]
        
        models_predictions = {}
        preds_for_agreement = []
        canonical_categories = ["Business", "Education", "Entertainment", "Sports", "Technology"]
        
        for internal_name, display_name in target_models:
            m = self.models.get(internal_name)
            if m is not None:
                if hasattr(m, "predict_proba"):
                    m_probs = m.predict_proba(features)[0]
                else:
                    decision = m.decision_function(features)[0]
                    exp_d = np.exp(decision - np.max(decision))
                    m_probs = exp_d / exp_d.sum()
                
                m_classes = getattr(m, "classes_", self.classes)
                m_prob_dict = {}
                for c, p in zip(m_classes, m_probs):
                    m_prob_dict[c.capitalize()] = round(float(p), 4)
                for c in canonical_categories:
                    if c not in m_prob_dict:
                        m_prob_dict[c] = 0.0
                
                # Sort probabilities descending
                sorted_probs = dict(sorted(m_prob_dict.items(), key=lambda item: item[1], reverse=True))
                
                top_idx_m = int(np.argmax(m_probs))
                m_pred_cat = str(m_classes[top_idx_m]).capitalize()
                m_conf = round(float(m_probs[top_idx_m]), 4)
                
                models_predictions[display_name] = {
                    "predicted_category": m_pred_cat,
                    "confidence": m_conf,
                    "probabilities": sorted_probs
                }
                preds_for_agreement.append(m_pred_cat)

        prod_display_name = "Calibrated SVM" if getattr(self, "production_model_name", "Logistic Regression") == "Support Vector Machine" else getattr(self, "production_model_name", "Logistic Regression")

        counts = Counter(preds_for_agreement)
        if preds_for_agreement:
            most_common_cat, count = counts.most_common(1)[0]
            if count == len(preds_for_agreement):
                model_agreement = {
                    "ratio": f"{count}/{len(preds_for_agreement)}",
                    "agreement_text": f"{count} / {len(preds_for_agreement)} models \u2192 {most_common_cat}",
                    "consensus_category": most_common_cat,
                    "unanimous": True,
                    "majority": True,
                    "disagreement": False
                }
            elif count == 2:
                model_agreement = {
                    "ratio": f"{count}/{len(preds_for_agreement)}",
                    "agreement_text": f"{count} / {len(preds_for_agreement)} models \u2192 {most_common_cat}",
                    "consensus_category": most_common_cat,
                    "unanimous": False,
                    "majority": True,
                    "disagreement": False
                }
            else:
                model_agreement = {
                    "ratio": "1/1/1",
                    "agreement_text": "No consensus (1/1/1)",
                    "consensus_category": None,
                    "unanimous": False,
                    "majority": False,
                    "disagreement": True
                }
        else:
            model_agreement = {
                "ratio": "0/0",
                "agreement_text": "No models available",
                "consensus_category": None,
                "unanimous": False,
                "majority": False,
                "disagreement": True
            }

        pred_id = f"PRED_{uuid.uuid4().hex[:10].upper()}"

        # Comprehensive inference logging (Check 8 requirements)
        display_model_used = "Calibrated SVM" if resolved_model_name == "Support Vector Machine" else resolved_model_name
        log_msg = (
            f"[INFERENCE] Extracted Text Length: {len(full_input_text)} chars | First 200: {repr(full_input_text[:200])}\n"
            f"[INFERENCE] TF-IDF Shape: {features.shape} | Active Non-zero Features: {non_zero_count}\n"
            f"[INFERENCE] Model Used: {display_model_used} | Predicted: {predicted_category} ({confidence * 100:.2f}%)\n"
            f"[INFERENCE] All 5 Class Probabilities: {prob_dict}\n"
            f"[INFERENCE] 3-Model Agreement: {model_agreement['agreement_text']}"
        )
        try:
            logging.getLogger("uvicorn.error").info(log_msg)
        except Exception:
            pass
        try:
            encoding = sys.stdout.encoding or "utf-8"
            print(log_msg.encode(encoding, errors="replace").decode(encoding, errors="replace"), flush=True)
        except Exception:
            pass
        
        actual_headline = headline.strip() if headline and headline.strip() else (full_input_text.split('\n')[0][:120].strip() if full_input_text else "")
        result = {
            "prediction_id": pred_id,
            "predicted_category": predicted_category,
            "confidence": confidence,
            "probabilities": prob_dict,
            "model_used": display_model_used,
            "contributing_words": contributing_words,
            "article_summary": article_summary,
            "article_profile": article_profile,
            "model_info": model_info,
            "timestamp": None,
            "headline": actual_headline,
            "source_type": source_type or "Text",
            "models_predictions": models_predictions,
            "production_model": prod_display_name,
            "model_agreement": model_agreement
        }
        
        if save_to_db:
            db_record = save_prediction(
                prediction_id=pred_id,
                article_text=full_input_text,
                predicted_category=predicted_category,
                confidence=confidence,
                probabilities_json=json.dumps(prob_dict),
                model_used=display_model_used,
                headline=actual_headline,
                source_type=source_type or "Text"
            )
            result["prediction_id"] = db_record["prediction_id"]
            result["timestamp"] = db_record["timestamp"]
            result["headline"] = db_record["headline"]
            result["source_type"] = db_record["source_type"]
        
        return result

    def predict_batch(self, items: List[Dict[str, str]], model_name: str = "best") -> List[Dict[str, Any]]:
        results = []
        for idx, item in enumerate(items):
            text = item.get("text", "") or item.get("headline", "") or item.get("content", "")
            item_id = item.get("id", f"item_{idx+1}")
            
            if not text.strip():
                continue
                
            pred = self.predict(text, model_name=model_name, save_to_db=False)
            results.append({
                "id": str(item_id),
                "headline": text[:100] + ("..." if len(text) > 100 else ""),
                "predicted_category": pred["predicted_category"],
                "confidence": pred["confidence"],
                "probabilities": pred["probabilities"]
            })
        return results

# Singleton instance
classifier_service = NewsClassifierService()
