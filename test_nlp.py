import sys
sys.path.append('nlp_service')
from intent_classifier import get_classifier
from ner import extract_entities
from translator import translate_to_english

clf = get_classifier()
intent, conf = clf.predict("I want an AC bus from Coimbatore to Chennai tomorrow under 700 rupees")
entities = extract_entities("I want an AC bus from Coimbatore to Chennai tomorrow under 700 rupees")
tanglish = translate_to_english("Coimbatore lendhu Chennai ku naalaikku evening bus irukka?")

print("Predicted Intent:", intent, f"({conf})")
print("Extracted Entities:", entities)
print("Tanglish Translation:", tanglish)
