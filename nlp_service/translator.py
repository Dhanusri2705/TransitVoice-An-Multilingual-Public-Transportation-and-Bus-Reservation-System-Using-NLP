import re
import urllib.parse
import urllib.request
import json
from language_detect import detect_language

# Preposition and phrase normalization map for Romanized inputs and fallback translation
TRANSLATION_MAP = {
    # Tamil / Tanglish phrases
    "lendhu": "from",
    "irundhu": "from",
    "ku": "to",
    "kku": "to",
    "naalaikku": "tomorrow",
    "naalai": "tomorrow",
    "innikku": "today",
    "indru": "today",
    "evening": "evening",
    "kalai": "morning",
    "kaalai": "morning",
    "iravu": "night",
    "bus irukka": "is there a bus",
    "bus irukka?": "is there a bus",
    "evlo": "how much",
    "evvalavu": "how much",
    "aagum": "will cost",
    "kaatu": "show",
    "solllu": "tell",
    "venum": "need",
    "vendum": "need",
    "nallaikku": "tomorrow",

    # Hindi / Hinglish phrases
    "se": "from",
    "jane ke liye": "to go to",
    "chahiye": "need",
    "hai kya": "is available",
    "kal": "tomorrow",
    "aaj": "today",
    "subah": "morning",
    "shaam": "evening",
    "raat": "night",
    "kitna": "how much",
    "kitne": "how many",
    "kahan": "where",
    "kab": "when",
    "pohanchegi": "will arrive",

    # Telugu / Tenglish phrases
    "nundi": "from",
    "kaavali": "need",
    "undha": "is available",
    "elapoyina": "cheapest",
    "eppudu": "when",

    # Malayalam / Manglish phrases
    "ninnu": "from",
    "venam": "need",
    "undo": "is available",
    "eppozha": "when"
}

def translate_clients5(text):
    """Translates text using Chrome extension Google endpoint."""
    try:
        url = "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=en&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], list) and len(data[0]) > 0:
                    return str(data[0][0]).strip()
                elif isinstance(data[0], str):
                    return str(data[0]).strip()
    except Exception:
        pass
    return None

def translate_gtx(text):
    """Translates text using Google Translate GTX API with desktop user agent."""
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            result = "".join([item[0] for item in data[0] if item and item[0]])
            return result.strip()
    except Exception:
        return None

def translate_mymemory(text, lang_code):
    """Translates text using MyMemoryTranslator from deep_translator."""
    try:
        from deep_translator import MyMemoryTranslator
        src_code = f"{lang_code}-IN"
        tr = MyMemoryTranslator(source=src_code, target="en-US").translate(text)
        if tr:
            return tr.strip()
    except Exception:
        pass
    return None

def translate_deep_google(text):
    """Translates text using GoogleTranslator from deep_translator."""
    try:
        from deep_translator import GoogleTranslator
        tr = GoogleTranslator(source="auto", target="en").translate(text)
        if tr:
            return tr.strip()
    except Exception:
        pass
    return None

def contains_indic_script(text):
    """Checks whether text contains regional Indic script characters (Tamil, Hindi, Telugu, Malayalam)."""
    if not text:
        return False
    return bool(re.search(r'[\u0900-\u0D7F]', str(text)))

from config import CITIES

_KNOWN_CITIES = set()
for canonical, (_, _, aliases) in CITIES.items():
    _KNOWN_CITIES.add(canonical.lower().strip())
    for alias in aliases:
        _KNOWN_CITIES.add(alias.lower().strip())

def is_city(word):
    return bool(word and word.lower().strip() in _KNOWN_CITIES)

def fix_preposition_order(text):
    """
    Fixes post-position word order artifacts from translation (e.g. 'Coimbatore from Chennai to')
    so that English regex NER identifies SOURCE and DESTINATION prepositions cleanly ('from Coimbatore to Chennai').
    Ensures that valid English sentences with 'from <City> to <City>' or non-city words are never mangled.
    """
    if not text:
        return text

    t = text

    # If the text already has clean English preposition ordering with recognized cities, keep it intact
    m_valid = re.search(r'\bfrom\s+([A-Za-z]+)\s+to\s+([A-Za-z]+)\b', t, re.IGNORECASE)
    if m_valid and is_city(m_valid.group(1)) and is_city(m_valid.group(2)):
        return t

    # Pattern: <City1> from <City2> to -> from <City1> to <City2>
    # c1 and c2 MUST both be verified recognized cities, and c1 not preceded by 'from'
    m_post = re.search(r'(?<!\bfrom\s)\b([A-Za-z]+)\s+from\s+([A-Za-z]+)\s+to\b', t, re.IGNORECASE)
    if m_post:
        c1, c2 = m_post.group(1), m_post.group(2)
        if is_city(c1) and is_city(c2):
            t = re.sub(rf'\b{re.escape(c1)}\s+from\s+{re.escape(c2)}\s+to\b', f"from {c1} to {c2}", t, flags=re.IGNORECASE)

    # Pattern: <City1> to <City2> from -> from <City2> to <City1>
    m_post2 = re.search(r'(?<!\bto\s)(?<!\bfrom\s)\b([A-Za-z]+)\s+to\s+([A-Za-z]+)\s+from\b', t, re.IGNORECASE)
    if m_post2:
        c1, c2 = m_post2.group(1), m_post2.group(2)
        if is_city(c1) and is_city(c2):
            t = re.sub(rf'\b{re.escape(c1)}\s+to\s+{re.escape(c2)}\s+from\b', f"from {c2} to {c1}", t, flags=re.IGNORECASE)

    return t

def translate_to_english(text):
    """
    Main machine translation entry point.
    Detects language and translates non-English text to English.
    Bypasses translation for English.
    Returns English string on success, or None if translation fails.
    """
    if not text or not text.strip():
        return ""

    lang_info = detect_language(text)
    lang_code = lang_info["code"]

    if lang_code == "en":
        return text.strip()

    if not lang_info["supported"]:
        return text.strip()

    translated = None

    # 1. Try Google clients5 endpoint (Fastest & high reliability for Indic scripts)
    translated = translate_clients5(text)

    # 2. Try Google GTX API
    if not translated or contains_indic_script(translated):
        translated = translate_gtx(text)

    # 3. Try MyMemoryTranslator
    if not translated or contains_indic_script(translated):
        translated = translate_mymemory(text, lang_code)

    # 4. Try Deep Google Translator
    if not translated or contains_indic_script(translated):
        translated = translate_deep_google(text)

    # 5. Fallback for Romanized text using phrase map
    if not translated or contains_indic_script(translated):
        translated_text = text
        for src_word, tgt_word in sorted(TRANSLATION_MAP.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = re.compile(rf'\b{re.escape(src_word)}\b', re.IGNORECASE)
            translated_text = pattern.sub(tgt_word, translated_text)
        if not contains_indic_script(translated_text) and translated_text.lower() != text.lower():
            translated = translated_text

    # Validation: Never return unchanged regional Indic script as a successful English translation
    if not translated or contains_indic_script(translated):
        return None

    # Post-process preposition word order for downstream NER accuracy
    translated = fix_preposition_order(translated)

    return translated.strip()
