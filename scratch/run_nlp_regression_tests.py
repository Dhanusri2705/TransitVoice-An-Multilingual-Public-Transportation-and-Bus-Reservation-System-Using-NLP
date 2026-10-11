import sys
import os
import json
from datetime import datetime, timedelta

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add workspace and nlp_service to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'nlp_service')))

from nlp_service.translator import detect_language, translate_to_english
from nlp_service.normalizer import normalize
from nlp_service.intent_classifier import predict_intent
from nlp_service.ner import extract_entities
from nlp_service.sentiment import analyze_sentiment
from nlp_service.qa_chatbot import generate_response

results = []

def record(test_id, category, input_text, expected, actual, passed, details=""):
    results.append({
        "id": test_id,
        "category": category,
        "input": input_text,
        "expected": expected,
        "actual": actual,
        "status": "PASS" if passed else "FAIL",
        "details": details
    })
    status_str = "[PASS]" if passed else "[FAIL]"
    print(f"{status_str} #{test_id} [{category}] {input_text[:40]}... -> {actual}")

print("=" * 70)
print("RUNNING NLP REGRESSION TESTS ACROSS 5 LANGUAGES")
print("=" * 70)

# TEST 1-5: Language Detection across all 5 languages
cases_lang = [
    ("T1", "English query", "I need a bus from Coimbatore to Chennai.", "en"),
    ("T2", "Tamil query", "எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.", "ta"),
    ("T3", "Hindi query", "मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।", "hi"),
    ("T4", "Telugu query", "నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.", "te"),
    ("T5", "Malayalam query", "എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.", "ml"),
]

for tid, desc, q, exp_lang in cases_lang:
    det_res = detect_language(q)
    det_lang = det_res.get("code")
    passed = (det_lang == exp_lang)
    record(tid, "Language Detection", q, exp_lang, det_lang, passed)

# TEST 6-10: Translation to English (never returns raw regional script)
cases_trans = [
    ("T6", "Tamil translation", "எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.", ["coimbatore", "chennai", "bus"]),
    ("T7", "Hindi translation", "मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।", ["coimbatore", "chennai", "bus"]),
    ("T8", "Telugu translation", "నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.", ["coimbatore", "chennai", "bus"]),
    ("T9", "Malayalam translation", "എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.", ["coimbatore", "chennai", "bus"]),
    ("T10", "English passthrough", "I need a bus from Coimbatore to Chennai.", ["coimbatore", "chennai", "bus"]),
]

for tid, desc, q, required_keywords in cases_trans:
    tr = translate_to_english(q)
    passed = bool(tr and all(k in tr.lower() for k in required_keywords))
    record(tid, "Machine Translation", q, "English text with Coimbatore & Chennai", tr, passed)

# TEST 11-14: Date & Time Extraction (Requirement 2: DATE = null when not mentioned)
cases_date = [
    ("T11", "No date mentioned", "I need a bus from Coimbatore to Chennai.", None, None),
    ("T12", "Tomorrow relative date", "I need a bus from Coimbatore to Chennai tomorrow.", "TOMORROW", None),
    ("T13", "Calendar explicit date", "I need a bus from Coimbatore to Chennai on 20 October 2026.", "2026-10-20", None),
    ("T14", "Time mentioned without date", "I need a bus from Coimbatore to Chennai at 6 PM.", None, "TIME_PRESENT"),
]

for tid, desc, q, exp_date, exp_time in cases_date:
    tr = translate_to_english(q)
    norm = normalize(tr)
    ents = extract_entities(norm, tr)
    actual_date = ents.get("DATE")
    actual_time = ents.get("TIME")
    
    passed_date = False
    if exp_date is None:
        passed_date = (actual_date is None)
    elif exp_date == "TOMORROW":
        exp_tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        passed_date = (actual_date == exp_tomorrow_str or "tomorrow" in str(actual_date).lower())
    else:
        passed_date = (actual_date == exp_date)

    passed_time = True
    if exp_time == "TIME_PRESENT":
        passed_time = bool(actual_time)
        
    passed = passed_date and passed_time
    record(tid, "Date & Time Extraction", q, f"Date: {exp_date}, Time: {exp_time}", f"Date: {actual_date}, Time: {actual_time}", passed)

# TEST 15-16: Route Direction & Reversed Route
cases_route = [
    ("T15", "Normal Route Coimbatore -> Chennai", "I need a bus from Coimbatore to Chennai.", "Coimbatore", "Chennai"),
    ("T16", "Reversed Route Chennai -> Coimbatore", "I need a bus from Chennai to Coimbatore.", "Chennai", "Coimbatore"),
]

for tid, desc, q, exp_src, exp_dst in cases_route:
    ents = extract_entities(q, q)
    passed = (ents.get("SOURCE") == exp_src and ents.get("DESTINATION") == exp_dst)
    record(tid, "Route Direction NER", q, f"src={exp_src}, dst={exp_dst}", f"src={ents.get('SOURCE')}, dst={ents.get('DESTINATION')}", passed)

# TEST 17-23: Complaints & Feedback Intent (Part B Voice Assistant)
cases_voice = [
    ("T17", "Cleanliness complaint", "The bus is very unclean.", "complaint"),
    ("T18", "Tamil cleanliness complaint", "பேருந்து மிகவும் அழுக்காக இருக்கிறது.", "complaint"),
    ("T19", "Hindi cleanliness complaint", "बस बहुत गंदी है।", "complaint"),
    ("T20", "Telugu cleanliness complaint", "బస్సు చాలా అపరిశుభ్రంగా ఉంది.", "complaint"),
    ("T21", "Malayalam cleanliness complaint", "ബസ് വളരെ വൃത്തിഹീനമാണ്.", "complaint"),
    ("T22", "Driver conduct complaint", "The driver was rude.", "complaint"),
    ("T23", "Positive passenger feedback", "The bus was comfortable and clean.", "feedback"),
]

for tid, desc, q, exp_intent in cases_voice:
    det_lang = detect_language(q).get("code", "en")
    tr = translate_to_english(q) if det_lang != 'en' else q
    pred_intent, conf = predict_intent(tr)
    passed = (pred_intent == exp_intent)
    record(tid, "Intent Classification", q, exp_intent, f"{pred_intent} ({conf:.2f})", passed)

# TEST 24-25: QA Chatbot Response for complaints vs search
resp_complaint = generate_response("complaint", {}, "The bus is very unclean.", "The bus is very unclean.")
passed_bot_complaint = ("Found" not in resp_complaint and "complaint" in resp_complaint.lower())
record("T24", "Chatbot Complaint Response", "The bus is very unclean.", "Grievance guidance (no bus search)", resp_complaint[:60] + "...", passed_bot_complaint)

resp_search = generate_response("route_search", {"SOURCE": "Coimbatore", "DESTINATION": "Chennai"}, "I need a bus from Coimbatore to Chennai.", "I need a bus from Coimbatore to Chennai.")
passed_bot_search = ("Coimbatore" in resp_search and "Chennai" in resp_search)
record("T25", "Chatbot Route Search Response", "I need a bus from Coimbatore to Chennai.", "Search response with route info", resp_search[:60] + "...", passed_bot_search)

# TEST 26-28: Review Analysis & Non-Review Questions (Part C)
cases_review = [
    ("T26", "Malayalam positive review", "ബസ് വളരെ വൃത്തിയുള്ളതും സുഖകരവുമായിരുന്നു.", True, "POSITIVE"),
    ("T27", "English transport question", "How many seats are available on the bus?", False, None),
    ("T28", "Telugu transport question", "బస్సులో ఎన్ని సీట్లు ఖாళీగా ఉన్నాయి?", False, None),
]

for tid, desc, text, exp_is_rev, exp_sent in cases_review:
    sent_res = analyze_sentiment(text)
    actual_is_rev = sent_res.get("is_review", True)
    actual_sent = sent_res.get("sentiment")
    if exp_is_rev:
        passed = (actual_is_rev is True and actual_sent == exp_sent and sent_res.get("suggested_rating") is not None)
    else:
        passed = (actual_is_rev is False and sent_res.get("suggested_rating") is None)
    record(tid, "Review Analysis & Inquiry Filter", text, f"is_review={exp_is_rev}, sent={exp_sent}", f"is_review={actual_is_rev}, sent={actual_sent}, rating={sent_res.get('suggested_rating')}", passed)

print("=" * 70)
total_tests = len(results)
passed_tests = sum(1 for r in results if r["status"] == "PASS")
failed_tests = total_tests - passed_tests
print(f"TOTAL: {total_tests} | PASSED: {passed_tests} | FAILED: {failed_tests}")
print("=" * 70)

# Save test log
with open("scratch/nlp_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

if failed_tests > 0:
    sys.exit(1)
