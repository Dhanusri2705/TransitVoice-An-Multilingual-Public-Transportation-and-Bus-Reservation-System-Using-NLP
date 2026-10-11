import os
from pathlib import Path

ROOT = Path(__file__).parent
BASE_DIR = ROOT.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = ROOT / "models"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

INTENTS_CSV = DATA_DIR / "intents.csv"
BUSES_CSV = DATA_DIR / "buses.csv"
BUSES_JSON = DATA_DIR / "buses.json"
TN_BUSES_JSON = DATA_DIR / "tn_buses.json"

# Canonical city -> (latitude, longitude, [aliases in English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi])
CITIES = {
    # Tamil Nadu
    "Chennai": (13.0827, 80.2707, ["madras", "சென்னை", "चेन्नई", "చెన్నై", "மதராஸ்", "ചെന്നൈ", "சென்னைக்கு", "చెన్నైకి", "ചെന്നൈയിലേക്ക്", "चेन्नई को"]),
    "Coimbatore": (11.0168, 76.9558, ["kovai", "கோயம்புத்தூர்", "கோயம்புத்தூரில்", "கோயம்புத்தூரிலிருந்து", "கோவை", "कोयंबटूर", "కోయంబత్తూరు", "కోయంబత్తూర్", "కోయంబత్తూరునుండి", "കോയമ്പത്തൂർ", "കോയമ്പത്തൂരിൽ", "കോയമ്പത്തൂരിൽനിന്ന്", "कोयंबटूर से"]),
    "Madurai": (9.9252, 78.1198, ["மதுரை", "மதுரையில்", "मदुरै", "మధురై", "മധുര"]),
    "Tiruchirappalli": (10.7905, 78.7047, ["trichy", "tiruchi", "திருச்சி", "திருச்சிராப்பள்ளி", "तिरुचिरापल्ली", "తిరుచిరాపల్లి"]),
    "Salem": (11.6643, 78.1460, ["சேலம்", "सेलम", "సేలం", "സേലം"]),
    "Tiruppur": (11.1085, 77.3411, ["tirupur", "திருப்பூர்", "तिरुपूर"]),
    "Erode": (11.3410, 77.7172, ["ஈரோடு", "इरोड"]),
    "Ooty": (11.4102, 76.6950, ["udhagamandalam", "ootacamund", "ஊட்டி", "ஒட்டி", "ऊटी"]),
    "Vellore": (12.9165, 79.1325, ["வேலூர்", "वेल्लोर"]),
    "Thanjavur": (10.7870, 79.1378, ["tanjore", "தஞ்சாவூர்", "तंजौर"]),
    "Tirunelveli": (8.7139, 77.7567, ["nellai", "திருநெல்வேலி", "நெல்லை"]),
    "Thoothukudi": (8.7642, 78.1348, ["tuticorin", "தூத்துக்குடி"]),
    "Dindigul": (10.3673, 77.9803, ["திண்டுக்கல்"]),
    "Karur": (10.9601, 78.0766, ["கரூர்"]),
    "Namakkal": (11.2189, 78.1674, ["நாமக்கல்"]),
    "Cuddalore": (11.7480, 79.7714, ["கடலூர்"]),
    "Villupuram": (11.9401, 79.4861, ["விழுப்புரம்"]),
    "Kanchipuram": (12.8342, 79.7036, ["kanchee", "காஞ்சிபுரம்"]),
    "Chengalpattu": (12.6819, 79.9888, ["செங்கல்பட்டு"]),
    "Hosur": (12.7409, 77.8253, ["ஓசூர்"]),
    "Rameswaram": (9.2876, 79.3129, ["ராமேஸ்வரம்"]),
    "Kanyakumari": (8.0883, 77.5385, ["கன்னியாகுமரி"]),

    # Karnataka
    "Bangalore": (12.9716, 77.5946, ["bengaluru", "bengalore", "பெங்களூர்", "बेंगलुरु", "ಬೆಂಗಳೂರು", "బెంగళూరు", "ബാംഗ്ലൂർ"]),
    "Mysore": (12.2958, 76.6394, ["mysuru", "மைசூர்", "मैसूर", "ಮೈಸೂರು"]),
    "Mangalore": (12.9141, 74.8560, ["mangaluru", "மங்களூர்", "मंगलुरु"]),
    "Hubli": (15.3647, 75.1240, ["hubballi", "ஹூப்ளி"]),
    "Belgaum": (15.8497, 74.4977, ["belagavi", "பெல்காம்"]),
    "Udupi": (13.3409, 74.7421, ["உடுப்பி", "उडुपी"]),

    # Kerala
    "Thiruvananthapuram": (8.5241, 76.9366, ["trivandrum", "திருவனந்தபுரம்", "तिरुवनंतपुरम", "തിരുവനന്തപുരം"]),
    "Kochi": (9.9312, 76.2673, ["cochin", "ernakulam", "கொச்சி", "कोच्चि", "കൊച്ചി"]),
    "Kozhikode": (11.2588, 75.7804, ["calicut", "கோழிக்கோடு"]),
    "Thrissur": (10.5276, 76.2144, ["trichur", "திருச்சூர்"]),
    "Palakkad": (10.7867, 76.6548, ["palghat", "பாலக்காடு"]),
    "Munnar": (10.0889, 77.0595, ["முன்னார்", "मुन्नार"]),

    # Telangana & Andhra Pradesh
    "Hyderabad": (17.3850, 78.4867, ["secunderabad", "ஹைதராபாத்", "हैदराबाद", "హైదరాబాద్"]),
    "Warangal": (17.9689, 79.5941, ["வாரங்கல்"]),
    "Vijayawada": (16.5062, 80.6480, ["bezawada", "விஜயவாடா", "विजयवाड़ा"]),
    "Visakhapatnam": (17.6868, 83.2185, ["vizag", "விசாஃகப்பட்டினம்", "विशाखापत्तनम"]),
    "Tirupati": (13.6288, 79.4192, ["திருப்பதி", "तिरुपति"]),
    "Guntur": (16.3067, 80.4365, ["குண்டூர்"]),

    # Maharashtra & Goa
    "Mumbai": (19.0760, 72.8777, ["bombay", "மும்பை", "मुंबई", "बॉम्बे"]),
    "Pune": (18.5204, 73.8567, ["poona", "புனே", "पुणे"]),
    "Nagpur": (21.1458, 79.0882, ["நாக்பூர்", "नागपुर"]),
    "Nashik": (20.0059, 73.7898, ["nasik", "நாசிக்", "नासिक"]),
    "Shirdi": (19.7645, 74.4762, ["ஷீரடி", "शिर्डी"]),
    "Panaji": (15.4909, 73.8278, ["goa", "panjim", "பனாஜி", "पणजी"]),

    # Delhi & Northern States
    "Delhi": (28.6139, 77.2090, ["new delhi", "டெல்லி", "दिल्ली", "नई दिल्ली"]),
    "Gurgaon": (28.4595, 77.0266, ["gurugram", "குர்கான்", "गुरुग्राम"]),
    "Noida": (28.5355, 77.3910, ["நோய்டா", "नोएडा"]),
    "Jaipur": (26.9124, 75.7873, ["pink city", "ஜைபூர்", "जयपुर"]),
    "Udaipur": (24.5854, 73.7125, ["உதயபூர்", "उदयपुर"]),
    "Jodhpur": (26.2389, 73.0243, ["ஜோத்பூர்", "जोधपुर"]),
    "Lucknow": (26.8467, 80.9462, ["லக்னோ", "लखनऊ"]),
    "Varanasi": (25.3176, 82.9739, ["banaras", "kashi", "வாரணாசி", "वाराणसी"]),
    "Agra": (27.1767, 78.0081, ["ஆக்ரா", "आगरा"]),
    "Chandigarh": (30.7333, 76.7794, ["சண்டிகர்", "चंडीगढ़"]),
    "Shimla": (31.1048, 77.1734, ["சிம்லா", "शिमला"]),

    # Eastern & Other States
    "Kolkata": (22.5726, 88.3639, ["calcutta", "கொல்கத்தா", "कोलकाता"]),
    "Siliguri": (26.7271, 88.3953, ["சிலிகுரி", "सिलीगुड़ी"]),
    "Pondicherry": (11.9416, 79.8083, ["puducherry", "புதுச்சேரி", "பாண்டிச்சேரி"])
}

OPERATORS = [
    "SETC Tamil Nadu", "TNSTC Coimbatore", "TNSTC Madurai", "TNSTC Salem",
    "TNSTC Kumbakonam", "TNSTC Tirunelveli", "MTC Express",
    "KSRTC Karnataka", "KSRTC Swift Kerala", "APSRTC Super Luxury", "TSRTC Garuda Plus",
    "MSRTC Shivneri", "GSRTC Volvo", "RSRTC Express", "UPSRTC Janrath", "HRTC Himgauri",
    "SRS Travels", "KPN Travels", "VRL Travels", "Orange Tours & Travels",
    "IntrCity SmartBus", "Parveen Travels", "Zingbus Premium", "NeuGo Electric Intercity",
    "Chartered Bus", "Hans Travels"
]

BUS_TYPES = [
    "AC Sleeper (2+1)", "Non-AC Sleeper (2+1)", "Volvo Multi-Axle AC Semi-Sleeper",
    "Ultra Deluxe Air Bus", "AC Seater (2+2)", "Electric AC Bus", "Super Fast Express"
]

PERIODS = {
    "morning": (5, 12),
    "afternoon": (12, 17),
    "evening": (17, 21),
    "night": (21, 29)
}
