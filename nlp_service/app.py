import sys
from pathlib import Path

# Add current folder to Python path
CURRENT_DIR = str(Path(__file__).resolve().parent)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from flask import Flask, request, jsonify
from flask_cors import CORS

from normalizer import normalize
from language_detect import detect_language
from translator import translate_to_english
from intent_classifier import get_classifier
from ner import extract_entities
from qa_chatbot import generate_response
from sentiment import analyze_sentiment



app = Flask(__name__)
CORS(app)

# Pre-warm classifier model on server startup
try:
    classifier = get_classifier()
    print("NLP Intent Classifier loaded successfully.")
except Exception as e:
    print(f"Warning: Could not pre-load classifier: {e}")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "OK", "service": "TransitVoice NLP Engine", "version": "1.0.0"})

@app.route("/api/nlp/process", methods=["POST"])
def process_nlp():
    """
    Main end-to-end NLP processing endpoint.
    Accepts: { text: string }
    Returns complete 5-language NLP pipeline breakdown for app workflow & Academic Debug Panel.
    """
    data = request.json or {}
    raw_text = data.get("text", "").strip()

    # Rule 30: Handle Empty Input
    if not raw_text:
        return jsonify({
            "error": "Please enter a transport-related question.",
            "response": "Please enter a transport-related question."
        }), 400

    # Rule 4 & 28: Automatic Language Detection & Unknown Language Handling
    lang_info = detect_language(raw_text)
    if isinstance(lang_info, str):
        lang_info = {"code": "en", "name": lang_info, "supported": True}

    if not lang_info.get("supported", True):
        return jsonify({
            "input_text": raw_text,
            "detected_language": lang_info.get("name", "Unsupported"),
            "detected_language_code": lang_info.get("code", "unknown"),
            "error": "Currently, TransitVoice supports English, Tamil, Hindi, Telugu and Malayalam.",
            "response": "Currently, TransitVoice supports English, Tamil, Hindi, Telugu and Malayalam."
        })

    # Rule 6 & 29: Machine Translation & Error Handling
    is_regional = lang_info.get("code") != "en"
    translated_text = None
    translation_status = "N/A"

    if is_regional:
        try:
            translated_text = translate_to_english(raw_text)
        except Exception as e:
            translated_text = None

        if not translated_text:
            return jsonify({
                "input_text": raw_text,
                "detected_language": lang_info.get("name", "Unknown"),
                "detected_language_code": lang_info.get("code", "unknown"),
                "translation_status": "FAILED",
                "translated_text": None,
                "error": "I couldn't translate this query. Please try again or enter your request in English.",
                "response": "I couldn't translate this query. Please try again or enter your request in English."
            })
        translation_status = "SUCCESS"
    else:
        translated_text = raw_text
        translation_status = "N/A"

    normalized_text = normalize(translated_text)

    # 1. Intent Classification
    intent, confidence = classifier.predict(normalized_text)

    # 2. Named Entity Recognition
    entities = extract_entities(normalized_text)

    user_booking = data.get("user_booking")

    # 3. Grounded Question Answering & Natural Language Response
    final_response = generate_response(intent, entities, query_text=normalized_text, user_booking=user_booking)

    # 4. Sentiment analysis breakdown on normalized English text
    sentiment_info = analyze_sentiment(normalized_text)

    # Development logging
    print(f"[NLP Log] Query: '{raw_text}' | Lang: {lang_info.get('name')} ({lang_info.get('code')}) | Trans: '{translated_text}' | Intent: {intent} ({confidence}) | Entities: {entities}")

    return jsonify({
        "input_text": raw_text,
        "detected_language": lang_info.get("name", "English"),
        "detected_language_code": lang_info.get("code", "en"),
        "translation_status": translation_status,
        "translated_text": translated_text,
        "normalized_text": normalized_text,
        "detected_intent": intent,
        "confidence": confidence,
        "entities": entities,
        "response": final_response,
        "sentiment": sentiment_info
    })


@app.route("/api/nlp/classify", methods=["POST"])
def classify_intent():
    data = request.json or {}
    text = normalize(data.get("text", ""))
    intent, confidence = classifier.predict(text)
    return jsonify({"intent": intent, "confidence": confidence})

@app.route("/api/nlp/entities", methods=["POST"])
def extract_ner():
    data = request.json or {}
    text = normalize(data.get("text", ""))
    entities = extract_entities(text)
    return jsonify({"entities": entities})

@app.route("/api/nlp/sentiment", methods=["POST"])
def sentiment():
    data = request.json or {}
    raw_text = data.get("text", "").strip()
    if not raw_text:
        return jsonify(analyze_sentiment(""))
    
    lang_info = detect_language(raw_text)
    if isinstance(lang_info, str):
        lang_info = {"code": "en", "name": lang_info, "supported": True}

    is_regional = lang_info.get("code") != "en"
    translated_text = None
    translation_status = "N/A"

    if is_regional:
        try:
            translated_text = translate_to_english(raw_text)
        except Exception:
            translated_text = None

        if translated_text:
            translation_status = "SUCCESS"
            norm_text = normalize(translated_text)
            res = analyze_sentiment(norm_text)
        else:
            translation_status = "FAILED"
            # Analyze original text directly without pretending raw text was translated
            res = analyze_sentiment(raw_text)
            res["translation_error"] = "Machine translation unavailable for this regional text."
    else:
        translation_status = "N/A"
        translated_text = raw_text
        norm_text = normalize(raw_text)
        res = analyze_sentiment(norm_text)

    res["detected_language"] = lang_info.get("name", "English")
    res["detected_language_code"] = lang_info.get("code", "en")
    res["translation_status"] = translation_status
    res["translated_text"] = translated_text
    res["original_text"] = raw_text

    print(f"[Sentiment Log] Text: '{raw_text}' | Lang: {lang_info.get('name')} | Trans: '{translated_text}' | Sentiment: {res.get('sentiment')} | Suggested Rating: {res.get('suggested_rating')}")
    return jsonify(res)

@app.route("/api/voice/process", methods=["POST"])
def voice_process():
    """
    Voice payload processor endpoint.
    Accepts speech transcript or audio text payload.
    """
    data = request.json or {}
    transcript = data.get("transcript", "").strip()
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400

    return process_nlp()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
