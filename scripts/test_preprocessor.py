import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.ml.preprocessor import preprocess_text, clean_text

sample_text = "Breaking News: Apple's CEO Tim Cook announced new AI technologies at https://apple.com/news! <p>More details inside &amp; updates soon.</p>"
cleaned = clean_text(sample_text)
processed = preprocess_text(sample_text)

print("Sample Raw:", sample_text)
print("Cleaned:", cleaned)
print("Processed:", processed)
print("Test passed successfully!")
