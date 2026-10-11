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
    "Bangalore to Chennai buses",
    "Mumbai to Pune sleeper bus",
    "Delhi to Jaipur bus search",
    "Hyderabad to Bangalore",
    "Kochi to Coimbatore",
    "Bangalore to Mumbai",
    "buses from Delhi",
    "AC buses from Bangalore"
]

print("================================================================")
print("TESTING ALL-INDIA MASTER BUS DATASET NLP RETRIEVAL ENGINE")
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

print("\nAll All-India NLP retrieval test cases executed successfully!")
