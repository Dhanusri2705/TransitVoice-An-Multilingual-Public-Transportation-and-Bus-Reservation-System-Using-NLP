import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('nlp_service')
from ner import CITY_GAZETTEER

queries = [
    'I need a bus from Coimbatore to Chennai.',
    'எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.',
    'मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।',
    'నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.',
    'എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.',
    'I need a bus from Chennai to Coimbatore.',
    'I need a bus to Chennai from Coimbatore.'
]

for q in queries:
    matched = []
    for city_key, canonical in sorted(CITY_GAZETTEER.items(), key=lambda x: len(x[0]), reverse=True):
        pat = rf'(?:(?<=[\s.,!?:;\"\'\(\)\[\]])|^){re.escape(city_key)}(?:(?=[\s.,!?:;\"\'\(\)\[\]])|$)'
        for m in re.finditer(pat, q, re.IGNORECASE):
            matched.append((m.start(), m.end(), city_key, canonical))
    matched.sort(key=lambda x: (x[0], -(x[1]-x[0])))
    non_overlap = []
    last_end = -1
    for start, end, key, can in matched:
        if start >= last_end:
            non_overlap.append((start, end, key, can))
            last_end = end
    print(q)
    print("  -> Matches:", [(can, key) for _, _, key, can in non_overlap])
