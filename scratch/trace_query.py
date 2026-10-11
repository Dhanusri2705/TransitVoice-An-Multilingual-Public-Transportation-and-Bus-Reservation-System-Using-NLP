import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('nlp_service')

from language_detect import detect_language
from translator import translate_gtx, translate_mymemory, translate_deep_google, fix_preposition_order, translate_to_english
from intent_classifier import get_classifier
from ner import extract_entities
from normalizer import normalize

queries = [
    "I need a bus from Coimbatore to Chennai.",
    "எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.",
    "मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।",
    "నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.",
    "എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.",
    "I need a bus from Chennai to Coimbatore"
]

print("Starting trace...")
clf = get_classifier()

for q in queries:
    print("=" * 60)
    print("ORIGINAL QUERY:", q)
    lang = detect_language(q)
    print("DETECTED LANG:", lang)
    gtx = translate_gtx(q)
    print("RAW GTX TRANSLATION:", repr(gtx))
    fixed_prep = fix_preposition_order(gtx) if gtx else None
    print("FIXED PREP:", repr(fixed_prep))
    full_tr = translate_to_english(q)
    print("TRANSLATE_TO_ENGLISH:", repr(full_tr))
    norm = normalize(full_tr)
    print("NORMALIZED:", repr(norm))
    intent, conf = clf.predict(norm)
    print("INTENT:", intent, conf)
    entities = extract_entities(norm)
    print("ENTITIES FROM NORM:", entities)
    entities_from_raw = extract_entities(q)
    print("ENTITIES FROM RAW:", entities_from_raw)
