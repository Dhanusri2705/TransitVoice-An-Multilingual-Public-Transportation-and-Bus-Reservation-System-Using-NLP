import os
import pandas as pd
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

INTENTS_CSV = Path("data/intents.csv")
MODELS_DIR = Path("nlp_service/models")
MODEL_PATH = MODELS_DIR / "intent_clf.pkl"

df_existing = pd.read_csv(INTENTS_CSV)

new_examples = [
    # Cleanliness Complaints
    ("The bus is very unclean.", "complaint"),
    ("The bus seats are dirty.", "complaint"),
    ("The bus is extremely dirty and smelling bad.", "complaint"),
    ("very unclean bus with dust and trash everywhere", "complaint"),
    ("The seats are sticky and stained.", "complaint"),
    ("The bus was not cleaned properly before journey.", "complaint"),
    ("cockroaches and mosquitoes inside the bus", "complaint"),
    ("unclean blankets and pillows provided", "complaint"),
    ("poor hygiene inside the bus", "complaint"),
    ("The bus is unhygienic and dirty.", "complaint"),
    ("பேருந்து மிகவும் அழுக்காக இருக்கிறது.", "complaint"),
    ("இருக்கைகள் மிகவும் அழுக்காக உள்ளன.", "complaint"),
    ("பேருந்தில் துர்நாற்றம் வீசுகிறது.", "complaint"),
    ("சுத்தமில்லாத பேருந்து மிகவும் மோசம்.", "complaint"),
    ("bus romba dirty ah irukku unclean ah irukku", "complaint"),
    ("bus clean ah illa full ah dust", "complaint"),
    ("बस बहुत गंदी है।", "complaint"),
    ("बस की सीटें बहुत गंदी और मैली हैं।", "complaint"),
    ("बस में बहुत बदबू आ रही है।", "complaint"),
    ("सफाई बिल्कुल नहीं है बस बहुत गंदी है।", "complaint"),
    ("bus bahut gandi hai safai nahi hai", "complaint"),
    ("బస్సు చాలా అపరిశుభ్రంగా ఉంది.", "complaint"),
    ("బస్సు సీట్లు చాలా మురికిగా ఉన్నాయి.", "complaint"),
    ("బస్సులో దుర్వాసన వస్తోంది.", "complaint"),
    ("bus chala dirty ga undi unclean ga undi", "complaint"),
    ("ബസ് വളരെ വൃത്തിഹീനമാണ്.", "complaint"),
    ("ബസ് സീറ്റുകൾ വളരെ വൃത്തികെട്ടതാണ്.", "complaint"),
    ("ബസിൽ ദുർഗന്ധം വമിക്കുന്നു.", "complaint"),
    ("bus valare unclean aanu dirty aanu", "complaint"),

    # Delay Complaints
    ("The bus is delayed.", "complaint"),
    ("The bus is running 2 hours late.", "complaint"),
    ("My bus was delayed by more than three hours.", "complaint"),
    ("bus departure was postponed without notice", "complaint"),
    ("huge delay in arrival time", "complaint"),
    ("பேருந்து மிகவும் தாமதமாக வந்தது.", "complaint"),
    ("என் பேருந்து இரண்டு மணி நேரம் தாமதம்.", "complaint"),
    ("बस बहुत देर से आई।", "complaint"),
    ("मेरी बस दो घंटे लेट है।", "complaint"),
    ("బస్సు చాలా ఆలస్యంగా వచ్చింది.", "complaint"),
    ("నా బస్సు చాలా లేట్ అయింది.", "complaint"),
    ("ബസ് വളരെ വൈകിയാണ് വന്നത്.", "complaint"),
    ("എന്റെ ബസ് രണ്ടു മണിക്കൂർ വൈകി.", "complaint"),

    # Driver & Staff Complaints
    ("The driver was rude.", "complaint"),
    ("The driver was extremely rash and overspeeding.", "complaint"),
    ("driver misbehaved with passengers", "complaint"),
    ("conductor was shouting and very aggressive", "complaint"),
    ("reckless driving put passengers at risk", "complaint"),
    ("driver was speaking on mobile while driving", "complaint"),
    ("ஓட்டுநர் மிகவும் மரியாதைக்குறைவாக பேசினார்.", "complaint"),
    ("மோசமான ஓட்டுநர் அதிவேகமாக ஓட்டினார்.", "complaint"),
    ("ड्राइवर बहुत बदतमीज और अशिष्ट था।", "complaint"),
    ("ड्राइवर खतरनाक तरीके से गाड़ी चला रहा था।", "complaint"),
    ("డ్రైవర్ దురుసుగా ప్రవర్తించాడు.", "complaint"),
    ("డ్రైవర్ మితిమీరిన వేగంతో నడిపాడు.", "complaint"),
    ("ഡ്രൈവർ വളരെ മോശമായി പെരുമാറി.", "complaint"),
    ("ഡ്രൈവർ അമിതവേഗതയിലാണ് ഓടിച്ചത്.", "complaint"),

    # General Service Complaints
    ("I want to complain about the poor service.", "complaint"),
    ("file a complaint against the operator", "complaint"),
    ("pathetic service worst travel experience", "complaint"),
    ("horrible experience with this bus service", "complaint"),
    ("AC was not working throughout the trip", "complaint"),
    ("charging port and lights were broken", "complaint"),
    ("மோசமான சேவை பற்றி புகார் செய்ய வேண்டும்.", "complaint"),
    ("खराब सेवा के खिलाफ शिकायत दर्ज करनी है।", "complaint"),
    ("చెడు సేవపై ఫిర్యాదు నమోదు చేయాలి.", "complaint"),
    ("മോശം സർവീസിനെതിരെ പരാതി നൽകണം.", "complaint"),

    # Positive Feedback
    ("The bus was comfortable and clean.", "feedback"),
    ("The journey was smooth and very pleasant.", "feedback"),
    ("superb travel experience excellent bus condition", "feedback"),
    ("driver was very polite and drove safely", "feedback"),
    ("clean bus punctual departure and comfortable seats", "feedback"),
    ("loved the travel experience 5 star rating", "feedback"),
    ("great bus ride smooth driving and helpful staff", "feedback"),
    ("very neat and hygienic bus comfortable journey", "feedback"),
    ("great trip highly recommended bus operator", "feedback"),
    ("பேருந்து மிகவும் வசதியாகவும் சுத்தமாகவும் இருந்தது.", "feedback"),
    ("அருமையான பயணம் சிறந்த சேவை.", "feedback"),
    ("மிகவும் நல்ல அனுபவம் ஐந்து நட்சத்திரங்கள்.", "feedback"),
    ("bus romba comfortable ah nalla irundhuchu", "feedback"),
    ("बस बहुत साफ और आरामदायक है।", "feedback"),
    ("शानदार यात्रा और सुरक्षित ड्राइविंग अनुभव।", "feedback"),
    ("बहुत ही अच्छी बस सेवा पांच सितारा रेटिंग।", "feedback"),
    ("yatra bahut acchi aur aaramdayak thi", "feedback"),
    ("బస్సు చాలా సౌకర్యవంతంగా మరియు పరిశుభ్రంగా ఉంది.", "feedback"),
    ("చక్కటి ప్రయాణం సురక్షితమైన డ్రైవింగ్.", "feedback"),
    ("మంచి అనుభవం 5 స్టార్ రేటింగ్.", "feedback"),
    ("బస్ చాలా బాగుంది ప్రయాణం ప్రశాంతంగా జరిగింది.", "feedback"),
    ("ബസ് വളരെ വൃത്തിയുള്ളതും സുഖകരവുമായിരുന്നു.", "feedback"),
    ("വളരെ നല്ല യാത്രാനുഭവം സുരക്ഷിത ഡ്രൈവിംഗ്.", "feedback"),
    ("മികച്ച സേവനം അഞ്ച് സ്റ്റാർ റേറ്റിംഗ് നൽകുന്നു.", "feedback"),
    ("യാത്ര വളരെ സുഖകരമായിരുന്നു.", "feedback"),

    # Tracking queries
    ("Where is my bus?", "tracking"),
    ("Where is my bus right now?", "tracking"),
    ("track my booked bus live location", "tracking"),
    ("live tracking for my bus TV-00102", "tracking"),
    ("give me the GPS location of my bus", "tracking"),
    ("என் பேருந்து இப்போது எங்கே இருக்கிறது?", "tracking"),
    ("பேருந்தின் நேரலை இருப்பிடம் என்ன?", "tracking"),
    ("मेरी बस अभी कहां है?", "tracking"),
    ("बस की लाइव लोकेशन दिखाएं।", "tracking"),
    ("నా బస్సు ఇప్పుడు ఎక్కడ ఉంది?", "tracking"),
    ("లైవ్ బస్ ట్రాకింగ్ చూపించు.", "tracking"),
    ("എന്റെ ബസ് ഇപ്പോൾ എവിടെയാണ്?", "tracking"),
    ("ലൈവ് ട്രാക്കിംഗ് വിവരങ്ങൾ നൽകുക.", "tracking"),

    # Help & FAQ
    ("How do I book a bus ticket?", "help"),
    ("Help me search buses and book seats.", "help"),
    ("What features does TransitVoice offer?", "help"),
    ("explain how to use voice search", "help"),
    ("guide me through bus reservation", "help"),
    ("பயன்பாட்டை எவ்வாறு பயன்படுத்துவது?", "help"),
    ("एप का उपयोग कैसे करें?", "help"),
    ("యాప్‌ను ఎలా ఉపయోగించాలి?", "help"),
    ("ആപ്പ് എങ്ങനെ ഉപയോഗിക്കാം?", "help"),

    # Route and Bus Search
    ("I need a bus from Coimbatore to Chennai.", "route_search"),
    ("I need a bus from Chennai to Coimbatore.", "route_search"),
    ("Bus from Coimbatore to Chennai.", "route_search"),
    ("bus from Chennai to Madurai", "route_search"),
    ("I want a bus from Bangalore to Hyderabad.", "route_search"),
    ("bus from Hyderabad to Bangalore", "route_search"),
    ("find buses from Madurai to Tiruchirappalli", "route_search"),
    ("எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.", "route_search"),
    ("கோயம்புத்தூரிலிருந்து சென்னைக்கு பேருந்து.", "route_search"),
    ("சென்னையிலிருந்து கோயம்புத்தூருக்கு பேருந்து வேண்டும்.", "route_search"),
    ("मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।", "route_search"),
    ("कोयंबटूर से चेन्नई की बस चाहिए।", "route_search"),
    ("चेन्नई से कोयंबटूर जाने के लिए बस।", "route_search"),
    ("నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.", "route_search"),
    ("కోయంబత్తూరు నుండి చెన్నైకి బస్సు.", "route_search"),
    ("చెన్నై నుండి కోయంబత్తూరుకు బస్సు కావాలి.", "route_search"),
    ("എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.", "route_search"),
    ("കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ബസ്സ്.", "route_search"),
    ("ചെന്നൈയിൽ നിന്ന് കോയമ്പത്തൂരിലേക്ക് ഒരു ബസ് വേണം.", "route_search"),

    # Fare Inquiry
    ("What is the fare from Coimbatore to Chennai?", "fare_inquiry"),
    ("What is the cheapest bus from Coimbatore to Chennai?", "fare_inquiry"),
    ("how much is the ticket price for Chennai to Madurai", "fare_inquiry"),
    ("minimum fare for AC sleeper bus", "fare_inquiry"),
    ("கோயம்புத்தூரிலிருந்து சென்னைக்கு பேருந்து கட்டணம் எவ்வளவு?", "fare_inquiry"),
    ("குறைந்த கட்டண பேருந்து எது?", "fare_inquiry"),
    ("कोयंबटूर से चेन्नई का किराया कितना है?", "fare_inquiry"),
    ("सबसे सस्ती बस कौन सी है?", "fare_inquiry"),
    ("కోయంబత్తూరు నుండి చెన్నైకి ఛార్జీ ఎంత?", "fare_inquiry"),
    ("చౌకైన బస్సు ఏది?", "fare_inquiry"),
    ("കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ബസ് നിരക്ക് എത്രയാണ്?", "fare_inquiry"),
    ("ഏറ്റവും കുറഞ്ഞ നിരക്കുള്ള ബസ് ഏതാണ്?", "fare_inquiry"),

    # Bus Timing
    ("What is the timing of bus from Coimbatore to Chennai?", "bus_timing"),
    ("When does the earliest bus depart from Chennai to Madurai?", "bus_timing"),
    ("bus departure and arrival schedule", "bus_timing"),
    ("I need a bus from Coimbatore to Chennai at 6 PM.", "bus_timing"),
    ("night bus departure times", "bus_timing"),
    ("பேருந்து புறப்படும் நேரம் என்ன?", "bus_timing"),
    ("बस छूटने का समय क्या है?", "bus_timing"),
    ("బస్సు బయలుదేరే సమయం ఏమిటి?", "bus_timing"),
    ("ബസ് പുറപ്പെടുന്ന സമയം എപ്പോഴാണ്?", "bus_timing"),

    # Seat Availability
    ("How many seats are available on the bus?", "seat_availability"),
    ("Are seats available from Coimbatore to Chennai?", "seat_availability"),
    ("any vacant seats in evening bus", "seat_availability"),
    ("எத்தனை இருக்கைகள் காலியாக உள்ளன?", "seat_availability"),
    ("कितनी सीटें उपलब्ध हैं?", "seat_availability"),
    ("బస్సులో ఎన్ని సీట్లు ఖాళీగా ఉన్నాయి?", "seat_availability"),
    ("ఎన్ని సీట్లు అందుబాటులో ఉన్నాయి?", "seat_availability"),
    ("എത്ര സീറ്റുകൾ ലഭ്യമാണ്?", "seat_availability")
]

df_new = pd.DataFrame(new_examples, columns=["query", "intent"])
df_combined = pd.concat([df_existing, df_new], ignore_index=True)
df_combined["query"] = df_combined["query"].astype(str).str.strip().str.lower()
df_combined = df_combined.drop_duplicates(subset=["query"])

df_combined.to_csv(INTENTS_CSV, index=False, encoding="utf-8")
print(f"Total dataset rows after expansion: {len(df_combined)}")
print("Intent class distribution:")
print(df_combined["intent"].value_counts())

# Retrain Pipeline
X = df_combined["query"]
y = df_combined["intent"]

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
    ("clf", LogisticRegression(max_iter=1500, C=4.0, class_weight="balanced"))
])

pipeline.fit(X, y)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, MODEL_PATH)
print("Retrained classifier model saved successfully to", MODEL_PATH)
