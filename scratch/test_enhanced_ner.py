import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('nlp_service')
from ner import CITY_GAZETTEER

def test_extract(text):
    if not text:
        return {}
    t_lower = text.lower().strip()
    
    # 1. Preposition Matching (SOURCE & DESTINATION)
    m_from_to = re.search(r'\bfrom\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?=\s+at|\s+on|\s+tomorrow|\s+today|\s+under|\s+below|\s+after|\s*$)', t_lower)
    m_to_from = re.search(r'\b(?:to|bound for|heading to)\s+([a-z\s]+?)\s+from\s+([a-z\s]+?)(?=\s+at|\s+on|\s+tomorrow|\s+today|\s+under|\s+below|\s+after|\s*$)', t_lower)

    src_found, dst_found = None, None

    if m_from_to:
        c1, c2 = m_from_to.group(1).strip(), m_from_to.group(2).strip()
        for k, v in sorted(CITY_GAZETTEER.items(), key=lambda x: len(x[0]), reverse=True):
            pat = rf'(?:(?<=[\s.,!?:;\"\'\(\)\[\]])|^){re.escape(k)}(?:(?=[\s.,!?:;\"\'\(\)\[\]])|$)'
            if not src_found and re.search(pat, c1):
                src_found = v
            if not dst_found and re.search(pat, c2):
                dst_found = v

    if not (src_found and dst_found) and m_to_from:
        c_dest, c_src = m_to_from.group(1).strip(), m_to_from.group(2).strip()
        for k, v in sorted(CITY_GAZETTEER.items(), key=lambda x: len(x[0]), reverse=True):
            pat = rf'(?:(?<=[\s.,!?:;\"\'\(\)\[\]])|^){re.escape(k)}(?:(?=[\s.,!?:;\"\'\(\)\[\]])|$)'
            if not dst_found and re.search(pat, c_dest):
                dst_found = v
            if not src_found and re.search(pat, c_src):
                src_found = v

    if not src_found or not dst_found or src_found == dst_found:
        matched_occurrences = []
        for city_key, canonical_name in sorted(CITY_GAZETTEER.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = rf'(?:(?<=[\s.,!?:;\"\'\(\)\[\]])|^){re.escape(city_key)}(?:(?=[\s.,!?:;\"\'\(\)\[\]])|$)'
            for match in re.finditer(pattern, t_lower):
                matched_occurrences.append((match.start(), match.end(), city_key, canonical_name))

        matched_occurrences.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        clean_matches = []
        last_end = -1
        for start, end, k, can in matched_occurrences:
            if start >= last_end:
                clean_matches.append((start, end, k, can))
                last_end = end

        unique_cities = []
        for _, _, _, c in clean_matches:
            if c not in unique_cities:
                unique_cities.append(c)

        # Check markers for each clean match
        city_roles = {}
        for start, end, k, can in clean_matches:
            before_ctx = t_lower[max(0, start-25):start]
            after_ctx = t_lower[end:min(len(t_lower), end+25)]
            
            is_from = False
            is_to = False
            
            # Key checks
            if any(m in k for m in ["ilirundhu", "irundhu", "lendhu", "nundi", "ninnu", "இருந்து", "லிருந்து", "నుండి", "നിന്ന്", "ൽനിന്ന്"]) or re.search(r'\bse\b| से', k):
                is_from = True
            elif any(k.endswith(m) for m in ["ku", "kku", "ki", "lekk", "க்கு", "கி", "కి", "లേക്ക്", "യിലേക്ക്"]) or re.search(r'\bko\b| को', k):
                is_to = True
                
            # Context checks
            if not is_from and not is_to:
                if re.search(r'\bfrom\b|\birundhu\b|\blendhu\b|\bse\b|\bnundi\b|\bninnu\b', before_ctx):
                    is_from = True
                elif re.search(r'\bto\b|\bgoes to\b|\bbound for\b|\bheading to\b|\bku\b|\bkku\b|\bki\b', before_ctx):
                    is_to = True
                elif re.search(r'\bfrom\b|\birundhu\b|\blendhu\b|\bse\b|\bnundi\b|\bninnu\b', after_ctx):
                    is_from = True
                elif re.search(r'\bto\b|\bku\b|\bkku\b|\bki\b', after_ctx):
                    is_to = True
                    
            if is_from and not is_to:
                city_roles[can] = "SOURCE"
            elif is_to and not is_from:
                city_roles[can] = "DESTINATION"

        # If 2 or more unique cities:
        if len(unique_cities) >= 2:
            from_candidates = [c for c, r in city_roles.items() if r == "SOURCE"]
            to_candidates = [c for c, r in city_roles.items() if r == "DESTINATION"]
            
            candidate_src = from_candidates[0] if from_candidates else None
            candidate_dst = to_candidates[0] if to_candidates else None
            
            if candidate_src and candidate_dst and candidate_src != candidate_dst:
                src_found, dst_found = candidate_src, candidate_dst
            elif candidate_src:
                src_found = candidate_src
                dst_found = [c for c in unique_cities if c != candidate_src][0]
            elif candidate_dst:
                dst_found = candidate_dst
                src_found = [c for c in unique_cities if c != candidate_dst][0]
            else:
                src_found = unique_cities[0]
                dst_found = unique_cities[1]
        elif len(unique_cities) == 1:
            c = unique_cities[0]
            role = city_roles.get(c)
            if role == "DESTINATION":
                dst_found = c
            else:
                src_found = c

    entities = {}
    if src_found: entities["SOURCE"] = src_found
    if dst_found: entities["DESTINATION"] = dst_found
    return entities

test_queries = [
    "I need a bus from Coimbatore to Chennai.",
    "I need a bus to Chennai from Coimbatore.",
    "I need a bus from Chennai to Coimbatore.",
    "I need a bus to Coimbatore from Chennai.",
    "எனக்கு கோயம்புத்தூரிலிருந்து சென்னைக்கு ஒரு பேருந்து வேண்டும்.",
    "मुझे कोयंबटूर से चेन्नई जाने के लिए एक बस चाहिए।",
    "నాకు కోయంబత్తూరు నుండి చెన్నైకి వెళ్లడానికి ఒక బస్సు కావాలి.",
    "എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ഒരു ബസ് വേണം.",
    # Also Romanized
    "Coimbatore lendhu Chennai ku bus venum",
    "Chennai ku Coimbatore lendhu bus venum"
]

for tq in test_queries:
    res = test_extract(tq)
    print(f"Query: {tq[:40]:<40} -> S: {res.get('SOURCE')} | D: {res.get('DESTINATION')}")
