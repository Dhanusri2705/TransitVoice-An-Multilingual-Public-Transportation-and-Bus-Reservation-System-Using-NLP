import re
import nltk

try:
    nltk.download('vader_lexicon', quiet=True)
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    vader_analyzer = SentimentIntensityAnalyzer()
    
    # Custom transit domain lexicon additions
    vader_analyzer.lexicon.update({
        'comfortable': 3.2,
        'excellent': 3.5,
        'clean': 2.5,
        'punctual': 2.8,
        'superb': 3.4,
        'nalla': 2.5,
        'smooth': 2.2,
        'awesome': 3.2,
        'friendly': 2.6,
        'uncomfortable': -3.0,
        'unclean': -3.2,
        'unhygienic': -3.0,
        'filthy': -3.5,
        'dirty': -3.2,
        'late': -2.5,
        'delayed': -2.5,
        'worst': -3.5,
        'horrible': -3.6,
        'rash': -2.8,
        'rude': -3.0,
        'poor': -2.5,
        'bad': -2.5
    })
except Exception as e:
    vader_analyzer = None

ISSUE_MAP = {
    "AC Issue": ["ac", "air condition", "cooling", "hot", "warm air", "chilling"],
    "Bus Delay": ["late", "delay", "delayed", "waiting", "behind schedule", "hours late"],
    "Driver Behaviour": ["driver", "overspeeding", "rash", "rough", "mobile", "phone"],
    "Cleanliness": ["dirty", "smell", "mosquito", "dust", "unclean", "trash", "filthy"],
    "Seat Issue": ["seat", "push back", "broken", "recline", "cushion"]
}

def is_question_or_inquiry(text):
    t = text.strip().lower()
    if "?" in t:
        return True
    question_starters = [
        "how many", "how much", "what is", "where is", "when does", "when will",
        "is there", "are there", "can i", "does the bus", "which bus",
        "எத்தனை", "எப்போது", "எங்கு", "என்ன", "எந்த",
        "कितनी", "कितने", "कब", "कहाँ", "कौन सी", "क्या",
        "ఎన్ని", "ఎప్పుడు", "ఎక్కడ", "ఏమిటి", "ఏది",
        "എത്ര", "എപ്പോൾ", "എവിടെ", "ഏതാണ്", "ഉണ്ടോ"
    ]
    return any(t.startswith(q) or f" {q} " in f" {t} " for q in question_starters)

def analyze_sentiment(text):
    if not text or not isinstance(text, str):
        return {
            "is_review": True,
            "sentiment": "NEUTRAL",
            "score": 0.50,
            "confidence": 0.50,
            "suggested_rating": 3.5,
            "detected_issues": []
        }

    t_clean = text.strip()
    if not t_clean:
        return {
            "is_review": True,
            "sentiment": "NEUTRAL",
            "score": 0.50,
            "confidence": 0.50,
            "suggested_rating": 3.5,
            "detected_issues": []
        }

    if is_question_or_inquiry(t_clean):
        return {
            "is_review": False,
            "sentiment": "NEUTRAL",
            "score": 0.50,
            "confidence": 0.50,
            "compound": 0.0,
            "suggested_rating": None,
            "detected_issues": [],
            "message": "Input is recognized as a transport question or inquiry, not a passenger review. Rating is not applicable."
        }

    text_for_vader = t_clean
    translated_review = None
    try:
        from translator import translate_to_english, contains_indic_script
    except ImportError:
        try:
            from nlp_service.translator import translate_to_english, contains_indic_script
        except ImportError:
            translate_to_english = None
            contains_indic_script = None

    if contains_indic_script and contains_indic_script(t_clean) and translate_to_english:
        try:
            tr = translate_to_english(t_clean)
            if tr and not contains_indic_script(tr):
                translated_review = tr
                text_for_vader = tr
        except Exception:
            pass

    t_lower = text_for_vader.lower()
    detected_issues = []
    for issue_cat, keywords in ISSUE_MAP.items():
        if any(k in t_lower for k in keywords):
            detected_issues.append(issue_cat)

    if vader_analyzer:
        scores = vader_analyzer.polarity_scores(text_for_vader)
        compound = scores['compound']

        if compound >= 0.05:
            sentiment_label = "POSITIVE"
            score = round(min(0.99, 0.5 + compound * 0.5), 2)
            rating = min(5.0, round(3.5 + compound * 1.5, 1))
        elif compound <= -0.05:
            sentiment_label = "NEGATIVE"
            score = round(min(0.99, 0.5 + abs(compound) * 0.5), 2)
            rating = max(1.0, round(3.5 - abs(compound) * 2.5, 1))
        else:
            sentiment_label = "NEUTRAL"
            score = 0.50
            rating = 3.5

        return {
            "sentiment": sentiment_label,
            "score": score,
            "confidence": score,
            "compound": compound,
            "suggested_rating": rating,
            "detected_issues": detected_issues,
            "translated_text": translated_review
        }

    # Fallback lexicon if VADER is unavailable
    pos_words = {"good", "great", "excellent", "super", "comfortable", "clean", "punctual", "nice", "awesome", "loved", "smooth", "safe", "best", "on time", "nalla", "superb"}
    neg_words = {"bad", "worst", "dirty", "late", "delay", "delayed", "rude", "broken", "warm", "terrible", "horrible", "uncomfortable", "slow", "unclean", "poor"}
    words = set(re.findall(r'\b\w+\b', t_lower))

    pos_count = len(words.intersection(pos_words))
    neg_count = len(words.intersection(neg_words))

    if pos_count > neg_count:
        sentiment_label = "POSITIVE"
        score = round(min(0.95, 0.6 + 0.1 * pos_count), 2)
        rating = min(5.0, round(4.0 + 0.5 * pos_count, 1))
    elif neg_count > pos_count:
        sentiment_label = "NEGATIVE"
        score = round(min(0.95, 0.6 + 0.1 * neg_count), 2)
        rating = max(1.0, round(3.0 - 0.5 * neg_count, 1))
    else:
        sentiment_label = "NEUTRAL"
        score = 0.50
        rating = 3.5

    return {
        "sentiment": sentiment_label,
        "score": score,
        "confidence": score,
        "suggested_rating": rating,
        "detected_issues": detected_issues
    }
