import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('nlp_service')

from intent_classifier import get_classifier
from ner import extract_entities
from translator import translate_to_english
from qa_chatbot import generate_response

clf = get_classifier()

test_queries = [
    "Coimbatore to Chennai buses",
    "Chennai to Madurai",
    "Madurai to Coimbatore",
    "Tiruppur to Chennai",
    "Salem to Chennai",
    "Coimbatore to Ooty",
    "Chennai to Tiruchirappalli",
    "Bus 120 route",
    "buses from Coimbatore",
    "AC buses from Chennai",
    "bus from Madurai to Chennai at 8 PM",
    "Chennai la irundhu Coimbatore bus irukka?",
    "கோயம்புத்தூரில் இருந்து சென்னைக்கு பேருந்து இருக்கிறதா?"
]

print("================================================================")
print("TESTING TAMIL NADU MASTER BUS DATASET NLP RETRIEVAL ENGINE")
print("================================================================")

for q in test_queries:
    trans = translate_to_english(q)
    intent, conf = clf.predict(trans)
    entities = extract_entities(trans)
    response = generate_response(intent, entities, query_text=trans)
    
    print(f"\nQuery: '{q}'")
    print(f"  Translated: '{trans}'")
    print(f"  Intent: {intent} ({conf})")
    print(f"  Entities: {entities}")
    print(f"  Response: {response[:160]}...")

print("\nAll 13 Tamil Nadu NLP retrieval test cases executed successfully!")
