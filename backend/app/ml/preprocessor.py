"""
Reusable NLP Text Preprocessing Pipeline for News Category Classification.
Applies consistent text cleaning, normalization, stopword filtering, and token processing
across training, validation, evaluation, and live inference.
"""
import re
import html
import unicodedata
from typing import List, Union

# Robust stopwords list including standard NLTK stopwords + news artifact tokens
DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "also", "said", "would", "could", "will", "year",
    "years", "day", "days", "time", "one", "two", "new", "first", "last", "per"
}

# Try importing nltk stopwords if available
try:
    from nltk.corpus import stopwords
    nltk_stops = set(stopwords.words("english"))
    STOPWORDS = DEFAULT_STOPWORDS.union(nltk_stops)
except Exception:
    STOPWORDS = DEFAULT_STOPWORDS

# URL, HTML, Email, and Punctuation regexes
URL_PATTERN = re.compile(r"https?://\S+|www\.\S+|ftp://\S+", re.IGNORECASE)
HTML_PATTERN = re.compile(r"<[^>]+>")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
SPECIAL_CHARS_PATTERN = re.compile(r"[^a-zA-Z\s]")
WHITESPACE_PATTERN = re.compile(r"\s+")

# Initialize PorterStemmer for standard, robust inflectional normalization
try:
    from nltk.stem import PorterStemmer
    STEMMER = PorterStemmer()
except Exception:
    STEMMER = None

# Fallback word lemmatization / suffix normalization rules if NLTK is unavailable
FALLBACK_SUFFIX_REPLACEMENTS = [
    (re.compile(r"(sses)$"), "ss"),
    (re.compile(r"(ies)$"), "y"),
    (re.compile(r"(ves)$"), "f"),
    (re.compile(r"([^s])s$"), r"\1"),
    (re.compile(r"(ing)$"), ""),
    (re.compile(r"(ed)$"), ""),
    (re.compile(r"(ly)$"), ""),
    (re.compile(r"(ment)$"), ""),
    (re.compile(r"(tion)$"), ""),
]

def clean_text(text: str) -> str:
    """
    Cleans raw text string:
    - Unescape HTML entities
    - Strip HTML tags
    - Remove URLs and emails
    - Lowercase
    - Remove non-alphabetic characters
    - Normalize whitespace
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Unescape HTML entities (e.g., &amp; -> &)
    text = html.unescape(text)
    
    # Remove HTML tags
    text = HTML_PATTERN.sub(" ", text)
    
    # Remove URLs and Email addresses
    text = URL_PATTERN.sub(" ", text)
    text = EMAIL_PATTERN.sub(" ", text)
    
    # Normalize unicode
    text = unicodedata.normalize("NFKD", text)
    
    # Lowercase
    text = text.lower()
    
    # Keep only alphabetic tokens and whitespace
    text = SPECIAL_CHARS_PATTERN.sub(" ", text)
    
    # Normalize multiple whitespace characters to single space
    text = WHITESPACE_PATTERN.sub(" ", text).strip()
    
    return text

def lemmatize_token(word: str) -> str:
    """
    Standard, deterministic stemming/lemmatization using PorterStemmer to reduce inflectional forms.
    Correctly normalizes variants consistently:
    - 'businesses' and 'business' -> 'busi'
    - 'financing' and 'finance' -> 'financ'
    - 'investment' and 'invest' -> 'invest'
    - 'economic' and 'economy' -> 'econom'
    - 'productivity' and 'productive' -> 'product'
    """
    if len(word) <= 3:
        return word
    if STEMMER is not None:
        return STEMMER.stem(word)
    for pattern, repl in FALLBACK_SUFFIX_REPLACEMENTS:
        if pattern.search(word):
            candidate = pattern.sub(repl, word)
            if len(candidate) >= 3:
                return candidate
    return word

def tokenize_and_filter(text: str, lemmatize: bool = True) -> List[str]:
    """
    Tokenizes cleaned text, filters out stopwords and noisy tokens (length < 3),
    and optionally normalizes suffixes/lemmatizes.
    """
    cleaned = clean_text(text)
    tokens = cleaned.split()
    
    result = []
    for token in tokens:
        if len(token) < 3 or len(token) > 30:
            continue
        if token in STOPWORDS:
            continue
        if lemmatize:
            token = lemmatize_token(token)
            if token in STOPWORDS or len(token) < 3:
                continue
        result.append(token)
        
    return result

def preprocess_text(text: str, return_tokens: bool = False) -> Union[str, List[str]]:
    """
    Unified entry point for the NLP preprocessing pipeline.
    If return_tokens is True, returns List[str].
    Otherwise returns space-delimited normalized text string for TF-IDF vectorization.
    """
    tokens = tokenize_and_filter(text, lemmatize=True)
    if return_tokens:
        return tokens
    return " ".join(tokens)
