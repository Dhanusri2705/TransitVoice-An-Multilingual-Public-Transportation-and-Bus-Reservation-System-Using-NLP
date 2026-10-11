import re
from langdetect import detect

SUPPORTED_LANGUAGES = {
    "en": "English",
    "ta": "Tamil",
    "hi": "Hindi",
    "te": "Telugu",
    "ml": "Malayalam"
}

def detect_language(text):
    """
    Detects language of input text for the 5 supported languages:
    English (en), Tamil (ta), Hindi (hi), Telugu (te), Malayalam (ml).
    Returns dict: {"code": str, "name": str, "supported": bool}
    """
    if not text or not text.strip():
        return {"code": "en", "name": "English", "supported": True}

    t = text.strip()

    # 1. Native script Unicode range detection (100% deterministic)
    if re.search(r'[\u0B80-\u0BFF]', t):
        return {"code": "ta", "name": "Tamil", "supported": True}
    if re.search(r'[\u0900-\u097F]', t):
        return {"code": "hi", "name": "Hindi", "supported": True}
    if re.search(r'[\u0C00-\u0C7F]', t):
        return {"code": "te", "name": "Telugu", "supported": True}
    if re.search(r'[\u0D00-\u0D7F]', t):
        return {"code": "ml", "name": "Malayalam", "supported": True}

    # 2. Check for other unsupported non-Latin scripts (e.g., Arabic, Chinese, Cyrillic, Japanese, Thai, etc.)
    if re.search(r'[\u0600-\u06FF\u4E00-\u9FFF\u0400-\u04FF\u0500-\u052F\u0E00-\u0E7F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F]', t):
        return {"code": "unknown", "name": "Unsupported", "supported": False}

    # 3. Explicit keywords for Romanized Indic scripts (Tanglish, Hinglish, Tenglish, Manglish)
    t_lower = t.lower()
    tanglish_words = ["lendhu", "irundhu", "naalaikku", "innikku", "irukka", "kaatu", "venum", "evlo"]
    hinglish_words = ["jane ke liye", "chahiye", "hai kya", "kitna", "subah", "shaam", "kahan"]
    tenglish_words = ["nundi", "kaavali", "undha", "elapoyina", "eppudu"]
    manglish_words = ["ninnu", "venam", "undo", "eppozha"]

    if any(w in t_lower for w in tanglish_words):
        return {"code": "ta", "name": "Tamil", "supported": True}
    if any(w in t_lower for w in hinglish_words):
        return {"code": "hi", "name": "Hindi", "supported": True}
    if any(w in t_lower for w in tenglish_words):
        return {"code": "te", "name": "Telugu", "supported": True}
    if any(w in t_lower for w in manglish_words):
        return {"code": "ml", "name": "Malayalam", "supported": True}

    # 4. Fallback to langdetect for Latin text
    try:
        lang = detect(t)
        if lang in SUPPORTED_LANGUAGES:
            return {"code": lang, "name": SUPPORTED_LANGUAGES[lang], "supported": True}
    except Exception:
        pass

    return {"code": "en", "name": "English", "supported": True}
