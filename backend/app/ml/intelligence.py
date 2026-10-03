"""
AI News Intelligence Engine.
Computes genuine News DNA, semantic similarity, novelty metrics, story clusters,
claim comparisons, article structure metrics, and model explanations from the 9,990 corpus.
"""
import os
import re
import json
import math
import logging
from urllib.parse import urlparse
from collections import Counter
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import joblib

from app.ml.preprocessor import preprocess_text, clean_text

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
DATA_DIR = os.path.join(BASE_DIR, "data")

class NewsIntelligenceService:
    def __init__(self):
        self.vectorizer = None
        self.corpus_tfidf = None
        self.corpus_meta = []
        self.model = None
        self.classes = ["business", "education", "entertainment", "sports", "technology"]
        self.load_resources()

    def load_resources(self):
        try:
            vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
            if os.path.exists(vec_path):
                self.vectorizer = joblib.load(vec_path)

            model_path = os.path.join(MODELS_DIR, "best_model.joblib")
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)

            corpus_path = os.path.join(MODELS_DIR, "corpus_tfidf.joblib")
            if os.path.exists(corpus_path):
                self.corpus_tfidf = joblib.load(corpus_path)

            meta_path = os.path.join(MODELS_DIR, "corpus_metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.corpus_meta = json.load(f)

            logging.info("NewsIntelligenceService successfully initialized.")
        except Exception as e:
            logging.error(f"Failed to load intelligence resources: {e}")

    # ==========================================
    # 1. ENTITY EXTRACTION
    # ==========================================
    def extract_entities(self, text: str) -> List[str]:
        """
        Extracts named entities (organizations, people, locations, capitalized products)
        using regex patterns on capitalized word sequences, acronyms, and titles.
        """
        if not text:
            return []
            
        # Pattern for capitalized multi-word proper nouns & single proper names
        pattern = re.compile(
            r'\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z]{2,}|[A-Z][a-z]+(?:\s+(?:of|and|for)\s+[A-Z][a-z]+)?)\b'
        )
        matches = pattern.findall(text)
        
        # Filter common non-entity capitalized words at sentence starts
        common_words = {
            "The", "This", "That", "These", "Those", "There", "Here", "What", "When",
            "Where", "Which", "While", "After", "Before", "During", "Since", "However",
            "According", "Furthermore", "Meanwhile", "Every", "Some", "Many", "Most",
            "First", "Second", "Last", "Another", "Both", "Either", "Neither", "All"
        }
        
        counts = Counter()
        for m in matches:
            cleaned = m.strip()
            if len(cleaned) < 3 or cleaned in common_words:
                continue
            counts[cleaned] += 1
            
        # Return top unique entities ordered by frequency
        return [entity for entity, _ in counts.most_common(12)]

    # ==========================================
    # 2. ARTICLE STRUCTURE & PROFILING
    # ==========================================
    def analyze_article_structure(self, text: str, headline: Optional[str] = None) -> Dict[str, Any]:
        """
        Measures physical and linguistic structural characteristics of the text:
        length, sentence count, paragraph count, vocabulary diversity (TTR),
        entity density, repetition, and readability index.
        """
        if not text:
            return {"error": "Insufficient text"}
            
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        paragraph_count = max(1, len(paragraphs))
        
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 3]
        sentence_count = max(1, len(sentences))
        
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
        word_count = len(words)
        unique_words = len(set(words))
        
        # Type-Token Ratio (Vocabulary Diversity)
        vocab_diversity = round(unique_words / max(1, word_count), 3)
        
        # Entity density (entities per 100 words)
        entities = self.extract_entities(text)
        entity_density = round((len(entities) / max(1, word_count / 100)), 2)
        
        # Repetition ratio (3-gram repetition)
        trigrams = [tuple(words[i:i+3]) for i in range(len(words)-2)]
        rep_ratio = round(1.0 - (len(set(trigrams)) / max(1, len(trigrams))), 3) if trigrams else 0.0
        
        # Terminology density (words > 8 chars or technical jargon ratio)
        long_terms = [w for w in words if len(w) >= 8]
        terminology_density = round(len(long_terms) / max(1, word_count), 3)
        
        # Average sentence length
        avg_sentence_len = round(word_count / sentence_count, 1)
        
        # Article Profile Classification
        if word_count < 150:
            length_profile = "Brief Dispatch"
        elif word_count < 500:
            length_profile = "Standard News Report"
        else:
            length_profile = "Long-form Feature"
            
        return {
            "headline_length": len(headline.split()) if headline else 0,
            "headline_chars": len(headline) if headline else 0,
            "word_count": word_count,
            "character_count": len(text),
            "paragraph_count": paragraph_count,
            "sentence_count": sentence_count,
            "avg_sentence_length_words": avg_sentence_len,
            "vocabulary_diversity": vocab_diversity,
            "entity_density_per_100_words": entity_density,
            "repetition_ratio": rep_ratio,
            "terminology_density": terminology_density,
            "length_profile": length_profile,
            "extracted_entities": entities[:8]
        }

    # ==========================================
    # 3. HEADLINE - BODY ALIGNMENT
    # ==========================================
    def calculate_headline_alignment(self, headline: str, body: str) -> Dict[str, Any]:
        """
        Computes semantic cosine similarity between headline and body text.
        Returns alignment percentage and descriptive, neutral explanation.
        """
        if not headline or not body or not self.vectorizer:
            return {"alignment_percentage": 0.0, "status": "Insufficient data"}
            
        h_vec = self.vectorizer.transform([preprocess_text(headline)])
        b_vec = self.vectorizer.transform([preprocess_text(body)])
        
        # Cosine similarity between sparse vectors
        norm_h = np.linalg.norm(h_vec.toarray())
        norm_b = np.linalg.norm(b_vec.toarray())
        
        if norm_h == 0 or norm_b == 0:
            sim = 0.0
        else:
            sim = float(h_vec.dot(b_vec.T).toarray()[0][0]) / (norm_h * norm_b)
            
        alignment_pct = round(max(0.0, min(100.0, sim * 100)), 1)
        
        if alignment_pct >= 60:
            explanation = "High semantic alignment: Headline terms directly reflect the central theme of the article body."
        elif alignment_pct >= 30:
            explanation = "Moderate semantic alignment: Headline introduces concepts that are expanded with broader context in the body."
        else:
            explanation = "Lower semantic alignment: The headline and article body show a lower semantic similarity."
            
        return {
            "alignment_percentage": alignment_pct,
            "similarity_score": round(sim, 4),
            "explanation": explanation
        }

    # ==========================================
    # 4. CLASSIFICATION SIGNALS (MODEL EXPLANATION)
    # ==========================================
    def explain_prediction(self, text: str, predicted_category: str) -> List[Dict[str, Any]]:
        """
        Computes the most influential TF-IDF terms contributing to the model's classification.
        Uses LogisticRegression feature weights (coef_[k] * x) for exact, explainable signals.
        """
        if not self.vectorizer or not self.model:
            return []
            
        clean_text_sample = preprocess_text(text)
        x_vec = self.vectorizer.transform([clean_text_sample])
        feature_names = np.array(self.vectorizer.get_feature_names_out())
        
        # Check if model has linear coefficients (Logistic Regression or Calibrated LinearSVC)
        actual_estimator = self.model
        if hasattr(self.model, "calibrated_classifiers_"):
            # For CalibratedClassifierCV
            actual_estimator = self.model.calibrated_classifiers_[0].estimator
            
        if hasattr(actual_estimator, "coef_"):
            # Find class index
            class_list = [c.lower() for c in getattr(self.model, "classes_", self.classes)]
            pred_lower = predicted_category.lower()
            if pred_lower in class_list:
                class_idx = class_list.index(pred_lower)
                weights = actual_estimator.coef_[class_idx]
                
                # Element-wise contribution = weight * feature_value
                contributions = x_vec.toarray()[0] * weights
                top_indices = contributions.argsort()[::-1][:10]
                
                signals = []
                for idx in top_indices:
                    if contributions[idx] > 0.001:
                        signals.append({
                            "term": feature_names[idx],
                            "weight": round(float(contributions[idx]), 4),
                            "direction": "supports"
                        })
                if signals:
                    return signals
                    
        # Fallback: Top TF-IDF terms in sample
        tfidf_vals = x_vec.toarray()[0]
        top_indices = tfidf_vals.argsort()[::-1][:8]
        return [
            {
                "term": feature_names[idx],
                "weight": round(float(tfidf_vals[idx]), 4),
                "direction": "salient"
            }
            for idx in top_indices if tfidf_vals[idx] > 0
        ]

    # ==========================================
    # 5. CORPUS SIMILARITY & NOVELTY METER
    # ==========================================
    def search_similar_articles(self, text: str, top_k: int = 8) -> Tuple[List[Dict[str, Any]], float]:
        """
        Computes cosine similarity of query against all 9,990 articles in the precomputed corpus.
        Returns top related matches and maximum similarity for Novelty calculation.
        """
        if not self.vectorizer or self.corpus_tfidf is None or not self.corpus_meta:
            return [], 0.0
            
        q_vec = self.vectorizer.transform([preprocess_text(text)])
        
        # Fast sparse matrix multiplication: shape (9990,)
        sims = self.corpus_tfidf.dot(q_vec.T).toarray().ravel()
        
        max_sim = float(np.max(sims)) if len(sims) > 0 else 0.0
        top_indices = sims.argsort()[::-1][:top_k]
        
        matches = []
        for rank, idx in enumerate(top_indices):
            s = float(sims[idx])
            if s > 0.01: # Filter non-informative
                meta = self.corpus_meta[idx]
                matches.append({
                    "rank": rank + 1,
                    "article_id": meta["id"],
                    "headline": meta["headline"],
                    "category": meta["category"],
                    "domain": meta["domain"],
                    "url": meta["url"],
                    "similarity": round(s, 4),
                    "similarity_pct": round(s * 100, 1),
                    "length": meta["length"]
                })
                
        return matches, max_sim

    def calculate_novelty(self, max_similarity: float) -> Dict[str, Any]:
        """
        Computes novelty relative to available dataset:
        Novelty = (1 - max_sim) * 100.
        """
        novelty_score = round(max(0.0, min(100.0, (1.0 - max_similarity) * 100)), 1)
        
        if novelty_score >= 80:
            label = "Highly different from existing corpus"
            level = "High Novelty"
        elif novelty_score >= 45:
            label = "Moderate resemblance to known dataset topics"
            level = "Moderate Novelty"
        else:
            label = "Very similar to existing stories in dataset"
            level = "Low Novelty"
            
        return {
            "score": novelty_score,
            "max_similarity_pct": round(max_similarity * 100, 1),
            "level": level,
            "label": label,
            "disclaimer": "Novelty relative to the available dataset (not an external fact verification)"
        }

    # ==========================================
    # 6. STORY CLUSTER GRAPH GENERATOR
    # ==========================================
    def build_story_cluster_graph(self, query_title: str, related_matches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Creates an interactive node-edge graph representation for Story Family / Clusters.
        """
        nodes = [
            {
                "id": "query_node",
                "label": query_title[:45] + ("..." if len(query_title) > 45 else ""),
                "full_title": query_title,
                "category": "Analyzed Article",
                "is_query": True,
                "size": 26,
                "similarity": 1.0
            }
        ]
        
        edges = []
        for i, m in enumerate(related_matches):
            node_id = f"node_{m['article_id']}"
            nodes.append({
                "id": node_id,
                "label": m["headline"][:45] + ("..." if len(m["headline"]) > 45 else ""),
                "full_title": m["headline"],
                "category": m["category"],
                "is_query": False,
                "size": max(14, min(24, int(m["length"] / 150))),
                "similarity": m["similarity"],
                "domain": m["domain"],
                "url": m["url"]
            })
            
            # Edge from query to related article
            edges.append({
                "source": "query_node",
                "target": node_id,
                "weight": m["similarity"],
                "label": f"{m['similarity_pct']}%"
            })
            
        return {
            "cluster_name": f"Story Family: {query_title[:50]}...",
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": nodes,
            "edges": edges
        }

    # ==========================================
    # 7. CLAIM COMPARISON
    # ==========================================
    def compare_claims(self, query_text: str, related_matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extracts salient statements from query and related articles,
        pairing them for side-by-side neutral comparison.
        """
        if not related_matches:
            return []
            
        # Split query text into declarative sentences with verbs/numbers
        sentences = [s.strip() for s in re.split(r'[.!?]+', query_text) if len(s.split()) >= 8]
        if not sentences:
            sentences = [query_text[:120]]
            
        comparisons = []
        for idx, match in enumerate(related_matches[:3]):
            claim_a = sentences[idx % len(sentences)]
            claim_b = match["headline"]
            
            # Compute sentence token overlap
            set_a = set(clean_text(claim_a).split())
            set_b = set(clean_text(claim_b).split())
            jaccard = len(set_a.intersection(set_b)) / max(1, len(set_a.union(set_b)))
            
            if jaccard > 0.4:
                status = "High thematic overlap"
            elif jaccard > 0.15:
                status = "Claim difference detected — Different wording"
            else:
                status = "Information differs between sources"
                
            comparisons.append({
                "article_a": "Analyzed Article",
                "statement_a": claim_a,
                "article_b": f"Corpus Match #{match['rank']} ({match['domain']})",
                "statement_b": claim_b,
                "overlap_score": round(jaccard, 3),
                "neutral_verdict": status
            })
            
        return comparisons

    # ==========================================
    # 8. NEWS DNA COMPLETE FINGERPRINT
    # ==========================================
    def generate_news_dna(
        self,
        text: str,
        headline: Optional[str] = None,
        source_url: Optional[str] = None,
        classification_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Assembles a comprehensive, mathematically grounded 'News DNA' fingerprint:
        combines classification signals, entities, structure profile, novelty,
        similarity clusters, and headline alignment into a single coherent intelligence package.
        """
        if not text or len(text.strip()) < 5:
            return {"error": "Insufficient text for DNA analysis"}
            
        headline = headline or text.split("\n")[0][:120]
        
        # 1. Structure profile & entities
        structure = self.analyze_article_structure(text, headline)
        entities = structure.get("extracted_entities", [])
        
        # 2. Similarity & Novelty
        related_matches, max_sim = self.search_similar_articles(text, top_k=6)
        novelty = self.calculate_novelty(max_sim)
        
        # 3. Model Explanation Signals
        category = classification_result.get("predicted_category", "Technology") if classification_result else "Technology"
        signals = self.explain_prediction(text, category)
        
        # 4. Headline-Body Alignment
        alignment = self.calculate_headline_alignment(headline, text)
        
        # 5. Story Cluster Graph
        cluster_graph = self.build_story_cluster_graph(headline, related_matches)
        
        # 6. Claim Comparison
        claims = self.compare_claims(text, related_matches)
        
        # 7. Source Domain
        domain = "User Input"
        if source_url:
            parsed = urlparse(source_url)
            domain = parsed.netloc.replace("www.", "") or "External Source"
            
        # 8. Radar / Fingerprint Dimensional Attributes (Normalized 0 - 100)
        dna_dimensions = [
            {"dimension": "Category Confidence", "value": round((classification_result.get("confidence", 0.7) * 100), 1) if classification_result else 75.0},
            {"dimension": "Novelty Index", "value": novelty["score"]},
            {"dimension": "Vocabulary Diversity", "value": round(structure.get("vocabulary_diversity", 0.5) * 100, 1)},
            {"dimension": "Entity Salience", "value": min(100.0, round(structure.get("entity_density_per_100_words", 2.0) * 15, 1))},
            {"dimension": "Terminology Density", "value": min(100.0, round(structure.get("terminology_density", 0.1) * 300, 1))},
            {"dimension": "Headline Alignment", "value": alignment["alignment_percentage"]},
        ]
        
        return {
            "headline": headline,
            "domain": domain,
            "predicted_category": category,
            "confidence": classification_result.get("confidence") if classification_result else None,
            "probabilities": classification_result.get("probabilities") if classification_result else None,
            "classification_signals": signals,
            "entities": entities,
            "article_structure": structure,
            "headline_alignment": alignment,
            "novelty": novelty,
            "related_articles": related_matches,
            "story_cluster": cluster_graph,
            "claim_comparisons": claims,
            "dna_fingerprint": dna_dimensions
        }

# Singleton instance
intelligence_service = NewsIntelligenceService()
