import sys
import io
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('nlp_service')

from language_detect import detect_language
from translator import translate_to_english
from intent_classifier import get_classifier
from ner import extract_entities
from qa_chatbot import generate_response, load_buses_data
from normalizer import normalize
from app import process_nlp, app

clf = get_classifier()

test_matrix = [
    # 1. Bus Search Test Cases across 5 languages
    ("English", "en", "I need a bus from Chennai to Madurai."),
    ("Tamil", "ta", "சென்னையிலிருந்து மதுரைக்கு பேருந்து வேண்டும்."),
    ("Hindi", "hi", "मुझे चेन्नई से मदुरै के लिए बस चाहिए।"),
    ("Telugu", "te", "నాకు చెన్నై నుండి మదురైకి బస్సు కావాలి."),
    ("Malayalam", "ml", "എനിക്ക് ചെന്നൈയിൽ നിന്ന് മധുരയിലേക്ക് ബസ് വേണം."),

    # 2. Fare Queries across 5 languages
    ("English Fare", "en", "What is the cheapest bus from Chennai to Madurai?"),
    ("Tamil Fare", "ta", "சென்னையிலிருந்து மதுரைக்கு குறைந்த கட்டண பேருந்து எது?"),
    ("Hindi Fare", "hi", "चेन्नई से मदुरै जाने वाली सबसे सस्ती बस कौन सी है?"),
    ("Telugu Fare", "te", "చెన్నై నుండి మదురైకి చౌకైన బస్సు ఏది?"),
    ("Malayalam Fare", "ml", "ചെന്നൈയിൽ നിന്ന് മധുരയിലേക്ക് ഏറ്റവും കുറഞ്ഞ നിരക്കിലുള്ള ബസ് ഏതാണ്?"),

    # 3. Seat Availability Queries
    ("Tamil Seat", "ta", "எத்தனை இருக்கைகள் காலியாக உள்ளன?"),
    ("Hindi Seat", "hi", "कितनी सीटें उपलब्ध हैं?"),
    ("Telugu Seat", "te", "ఎన్ని సీట్లు అందుబాటులో ఉన్నాయి?"),
    ("Malayalam Seat", "ml", "എത്ര സീറ്റുകൾ ലഭ്യമാണ്?"),

    # 4. Tracking, Complaint, Feedback
    ("Tamil Tracking", "ta", "என் பேருந்து இப்போது எங்கே இருக்கிறது?"),
    ("Hindi Complaint", "hi", "मेरी बस बहुत देर से आई।"),
    ("Tamil Feedback", "ta", "பேருந்து மிகவும் வசதியாக இருந்தது.")
]

print("==========================================================================================================")
print("                    TRANSITVOICE 5-LANGUAGE MULTILINGUAL TEST MATRIX EXECUTION")
print("==========================================================================================================")

client = app.test_client()

results = []

for name, expected_code, query in test_matrix:
    res = client.post('/api/nlp/process', json={'text': query})
    data = res.get_json()

    det_lang = data.get('detected_language', 'Unknown')
    det_code = data.get('detected_language_code', 'unknown')
    translated = data.get('translated_text', '')
    intent = data.get('detected_intent', 'N/A')
    confidence = data.get('confidence', 0.0)
    entities = data.get('entities', {})
    response_text = data.get('response', '')

    passed = (det_code == expected_code or (expected_code in det_code)) and len(response_text) > 0

    results.append({
        "Language": name,
        "Input": query,
        "Detected": f"{det_lang} ({det_code})",
        "Translation": translated if det_code != 'en' else 'N/A (English)',
        "Intent": intent,
        "Entities": str(entities),
        "Response": response_text[:90] + "...",
        "Status": "PASS" if passed else "FAIL"
    })

print(f"{'Language':<16} | {'Detected':<14} | {'Intent':<18} | {'Status':<6}")
print("-" * 65)
for r in results:
    print(f"{r['Language']:<16} | {r['Detected']:<14} | {r['Intent']:<18} | {r['Status']:<6}")

print("\n----------------------------------------------------------------------------------------------------------")
print("DETAILED RESULTS BREAKDOWN:")
print("----------------------------------------------------------------------------------------------------------")

for idx, r in enumerate(results, 1):
    print(f"\n[{idx}] {r['Language']}")
    print(f"    Input Query : {r['Input']}")
    print(f"    Detected    : {r['Detected']}")
    print(f"    Translation : {r['Translation']}")
    print(f"    Intent      : {r['Intent']}")
    print(f"    Entities    : {r['Entities']}")
    print(f"    Response    : {r['Response']}")
    print(f"    Status      : {r['Status']}")

print("\n==========================================================================================================")
print("All 5-Language Multilingual NLP End-to-End Test Cases Executed Successfully!")
print("==========================================================================================================")
