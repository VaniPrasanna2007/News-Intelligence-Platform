import re
import html
import unicodedata
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

stemmer = PorterStemmer()

try:
    stop_words = set(stopwords.words("english"))
except Exception:
    stop_words = {
        "a", "about", "above", "after", "again", "all", "am", "an", "and", "any", "are",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
        "but", "by", "can", "did", "do", "does", "doing", "down", "during", "each", "few",
        "for", "from", "further", "had", "has", "have", "having", "he", "her", "here",
        "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
        "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor",
        "not", "now", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
        "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
        "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
        "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
        "whom", "why", "with", "you", "your", "yours", "yourself", "yourselves"
    }

def clean_text(text: str) -> str:
    """Clean raw text by removing HTML tags, URLs, and non-alphabetic characters."""
    if not text or not isinstance(text, str):
        return ""
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = unicodedata.normalize("NFKD", text)
    return text.lower().strip()

def preprocess_text(text: str) -> str:
    """Clean text, remove stopwords, and apply Porter stemming for TF-IDF."""
    cleaned = clean_text(text)
    tokens = [
        stemmer.stem(w) if len(w) > 3 else w
        for w in cleaned.split()
        if w not in stop_words and len(w) >= 3
    ]
    return " ".join(tokens)
