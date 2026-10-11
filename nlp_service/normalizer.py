import re
import string

def normalize(text):
    """
    Normalizes text for NLP processing.
    - Lowers case
    - Removes punctuation (preserving hyphens in IDs)
    - Strips extra whitespaces
    """
    if not text or not isinstance(text, str):
        return ""
    
    t = text.lower().strip()
    # Replace punctuation except hyphens/slashes in bus numbers or IDs
    t = re.sub(r'[^\w\s\-/]', ' ', t)
    # Normalize extra whitespaces
    t = re.sub(r'\s+', ' ', t).strip()
    return t
