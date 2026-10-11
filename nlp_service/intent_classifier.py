import re
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from config import MODELS_DIR, INTENTS_CSV

class IntentClassifier:
    """Wrapper class for intent classification model using TF-IDF + LogisticRegression."""
    
    def __init__(self):
        self.model_path = MODELS_DIR / "intent_clf.pkl"
        self.pipeline = None
        self.load_or_train()

    def load_or_train(self):
        if self.model_path.exists():
            try:
                self.pipeline = joblib.load(self.model_path)
                return
            except Exception:
                pass
        self.train()

    def train(self):
        if not INTENTS_CSV.exists():
            raise FileNotFoundError(f"{INTENTS_CSV} not found. Generate seed datasets first.")

        df = pd.read_csv(INTENTS_CSV, encoding="utf-8")
        df = df.dropna(subset=["query", "intent"])

        X = df["query"].astype(str)
        y = df["intent"].astype(str)

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
            ("clf", LogisticRegression(max_iter=1000, C=3.0))
        ])

        self.pipeline.fit(X, y)
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, self.model_path)
        print("Intent classification model trained and saved successfully.")

    def predict(self, text):
        """
        Predicts intent and confidence score for input text string.
        Returns (predicted_intent, confidence_float)
        """
        if not text or not isinstance(text, str):
            return "general_information", 0.50

        clean_text = text.strip()
        if not clean_text:
            return "general_information", 0.50

        if self.pipeline is None:
            self.load_or_train()

        probs = self.pipeline.predict_proba([clean_text])[0]
        max_idx = np.argmax(probs)
        predicted_intent = self.pipeline.classes_[max_idx]
        confidence = float(probs[max_idx])

        t_lower = clean_text.lower()

        # Rule safeguard: Strong intent keywords when ML might misroute
        # 1. Greetings
        if re.search(r'^\s*(hello|hi|hey|vanakkam|namaste|good\s+morning|good\s+evening)\b', t_lower):
            if predicted_intent != "greeting":
                predicted_intent = "greeting"
                confidence = max(confidence, 0.88)

        # 2. Complaints (cleanliness, delay, rude behaviour, broken amenities, grievances)
        is_complaint_query = any(w in t_lower for w in [
            "unclean", "dirty", "stink", "smell", "dust", "hygiene", "trash", "mosquito",
            "rude", "rash", "overspeeding", "misbehaved", "aggressive", "shouted",
            "complain", "complaint", "grievance", "worst service", "poor service", "pathetic",
            "अशुद्ध", "गंदी", "गंदा", "शिकायत", "बदतमीज", "அழுக்காக", "புகார்", "மரியாதைக்குறைவாக",
            "అపరిశుభ్రంగా", "ఫిర్యాదు", "మురికిగా", "വൃത്തിഹീനമാണ്", "പരാതി", "വൃത്തികെട്ട"
        ])
        if is_complaint_query and not any(k in t_lower for k in ["fare", "ticket price", "how much", "timing", "schedule", "book a ticket"]):
            if predicted_intent not in ["complaint", "feedback"]:
                predicted_intent = "complaint"
                confidence = max(confidence, 0.85)

        # 3. Positive feedback
        is_feedback_query = any(w in t_lower for w in [
            "comfortable and clean", "clean and comfortable", "superb travel", "great journey",
            "safe driving", "polite staff", "loved the trip", "5 star", "five star",
            "शानदार यात्रा", "सुरक्षित ड्राइविंग", "சிறந்த சேவை", "அருமையான பயணம்",
            "చక్కటి ప్రయాణం", "సురక్షితమైన డ్రైవింగ్", "നല്ല യാത്രാനുഭവം", "സുഖകരമായ യാത്ര"
        ])
        if is_feedback_query and not is_complaint_query and not any(k in t_lower for k in ["from", "to", "bus from", "fare", "timing"]):
            if predicted_intent != "feedback":
                predicted_intent = "feedback"
                confidence = max(confidence, 0.85)

        # 4. Tracking
        if re.search(r'\b(where is my bus|track my bus|live location|bus eppo varum|எங்கே இருக்கிறது|कहां है|ఎక్కడ ఉంది|എവിടെയാണ്)\b', t_lower):
            if predicted_intent not in ["tracking", "bus_status"]:
                predicted_intent = "tracking"
                confidence = max(confidence, 0.85)

        # 5. Help / FAQ
        if re.search(r'\b(how to use|help me|how do i book|guide me|एप का उपयोग|எவ்வாறு பயன்படுத்துவது)\b', t_lower):
            if predicted_intent not in ["help", "general_information"]:
                predicted_intent = "help"
                confidence = max(confidence, 0.80)

        return predicted_intent, round(confidence, 2)

_classifier_instance = None

def get_classifier():
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = IntentClassifier()
    return _classifier_instance

def predict_intent(text):
    return get_classifier().predict(text)

