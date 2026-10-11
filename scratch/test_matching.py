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
    'I need a bus from Chennai to Coimbatore.'
]

for q in queries:
    matched = []
    # Pattern matching with non-word / boundary handling
    for city_key, canonical in sorted(CITY_GAZETTEER.items(), key=lambda x: len(x[0]), reverse=True):
        pat = rf'(?:(?<=[\s.,!?:;\"\'\(\)\[\]])|^){re.escape(city_key)}(?:(?=[\s.,!?:;\"\'\(\)\[\]])|$)'
        for m in re.finditer(pat, q, re.IGNORECASE):
            matched.append((m.start(), city_key, canonical))
    matched.sort(key=lambda x: x[0])
    # Filter overlapping matches
    filtered = []
    for item in matched:
        # Check if already covered
        if not any(item[0] == f[0] for f in filtered):
            filtered.append(item)
    print('Query:', q)
    print('Filtered matched:', [(f[0], f[1], f[2]) for f in filtered])
