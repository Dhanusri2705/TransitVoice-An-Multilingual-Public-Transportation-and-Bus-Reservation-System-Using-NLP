import re
import datetime as dt
from config import CITIES, OPERATORS, PERIODS, BUS_TYPES

CITY_GAZETTEER = {}
for canonical, (_, _, aliases) in CITIES.items():
    CITY_GAZETTEER[canonical.lower()] = canonical
    for alias in aliases:
        CITY_GAZETTEER[alias.lower()] = canonical

def extract_entities(text, raw_text=None, reference_date=None):
    """
    Extracts domain transport entities from query string.
    Identifies SOURCE, DESTINATION, DATE, TIME, BUS_TYPE, MAX_FARE, BUS_NUMBER, OPERATOR.
    """
    if not text or not isinstance(text, str):
        return {}

    ref_date = dt.date.today()
    if isinstance(raw_text, dt.date):
        ref_date = raw_text
    elif isinstance(reference_date, dt.date):
        ref_date = reference_date
    elif isinstance(reference_date, str):
        try:
            ref_date = dt.date.fromisoformat(reference_date)
        except Exception:
            ref_date = dt.date.today()

    # Combine text and raw_text for regex searching
    t_lower = text.lower()
    if isinstance(raw_text, str) and raw_text.strip():
        t_lower = f"{t_lower} {raw_text.lower()}"
    entities = {}

    # 1. Bus Number Extraction (e.g., "Bus 120", "Bus 208", "TN-01-N-9012", "TV-00102")
    m_busno_num = re.search(r'\b(?:bus|route|service|no|number)\s*(?:no\.?|number|#)?\s*(\d{2,4})\b', t_lower)
    if m_busno_num:
        entities["BUS_NUMBER"] = f"Bus {m_busno_num.group(1)}"

    m_busid = re.search(r"\b(tv-\d{5})\b", t_lower)
    if m_busid:
        entities["BUS_ID"] = m_busid.group(1).upper()
    
    m_tn_busno = re.search(r"\b([a-z]{2}-\d{2}-[a-z]{1,2}-\d{4})\b", t_lower)
    if m_tn_busno:
        entities["BUS_NUMBER"] = m_tn_busno.group(1).upper()

    # 2. City Gazetteer and Preposition Matching (SOURCE & DESTINATION)
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

        city_roles = {}
        for start, end, k, can in clean_matches:
            before_ctx = t_lower[max(0, start-25):start]
            after_ctx = t_lower[end:min(len(t_lower), end+25)]
            
            is_from = False
            is_to = False
            
            # Match language specific inflectional markers / postpositions
            if any(m in k for m in ["ilirundhu", "irundhu", "lendhu", "nundi", "ninnu", "இருந்து", "லிருந்து", "నుండి", "നിന്ന്", "ൽനിന്ന്"]) or re.search(r'\bse\b| से', k):
                is_from = True
            elif any(k.endswith(m) for m in ["ku", "kku", "ki", "lekk", "க்கு", "கி", "కి", "లേക്ക്", "യിലേക്ക്"]) or re.search(r'\bko\b| को', k):
                is_to = True
                
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

    if src_found and dst_found and src_found == dst_found:
        for c in CITY_GAZETTEER.values():
            if c != src_found and c.lower() in t_lower:
                dst_found = c
                break

    if src_found: entities["SOURCE"] = src_found
    if dst_found: entities["DESTINATION"] = dst_found

    # 3. Date Extraction (Return None/omit when not specified)
    MONTH_MAP = {
        "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
        "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
        "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
        "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
    }
    WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    if "day after tomorrow" in t_lower:
        entities["DATE"] = str(ref_date + dt.timedelta(days=2))
        entities["DATE_LABEL"] = "Day After Tomorrow"
    elif "tomorrow" in t_lower:
        entities["DATE"] = str(ref_date + dt.timedelta(days=1))
        entities["DATE_LABEL"] = "Tomorrow"
    elif "today" in t_lower or "tonight" in t_lower:
        entities["DATE"] = str(ref_date)
        entities["DATE_LABEL"] = "Today"
    else:
        # Check explicit ISO date YYYY-MM-DD
        m_iso = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", t_lower)
        if m_iso:
            entities["DATE"] = m_iso.group(0)
            entities["DATE_LABEL"] = m_iso.group(0)
        else:
            # Check '20 October 2026', '20th Oct 2026', '20 October'
            m_cal1 = re.search(r"\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?\b", t_lower)
            # Check 'October 20, 2026'
            m_cal2 = re.search(r"\b(?:on\s+)?([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b", t_lower)
            # Check DD-MM-YYYY or DD/MM/YYYY
            m_dmy = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b", t_lower)

            if m_cal1 and m_cal1.group(2).lower() in MONTH_MAP:
                day = int(m_cal1.group(1))
                month = MONTH_MAP[m_cal1.group(2).lower()]
                year = int(m_cal1.group(3)) if m_cal1.group(3) else ref_date.year
                try:
                    target_d = dt.date(year, month, day)
                    if target_d < ref_date and not m_cal1.group(3):
                        target_d = dt.date(year + 1, month, day)
                    entities["DATE"] = target_d.isoformat()
                    entities["DATE_LABEL"] = target_d.strftime("%d %B %Y")
                except ValueError:
                    pass
            elif m_cal2 and m_cal2.group(1).lower() in MONTH_MAP:
                day = int(m_cal2.group(2))
                month = MONTH_MAP[m_cal2.group(1).lower()]
                year = int(m_cal2.group(3)) if m_cal2.group(3) else ref_date.year
                try:
                    target_d = dt.date(year, month, day)
                    if target_d < ref_date and not m_cal2.group(3):
                        target_d = dt.date(year + 1, month, day)
                    entities["DATE"] = target_d.isoformat()
                    entities["DATE_LABEL"] = target_d.strftime("%d %B %Y")
                except ValueError:
                    pass
            elif m_dmy:
                day = int(m_dmy.group(1))
                month = int(m_dmy.group(2))
                year = int(m_dmy.group(3))
                try:
                    target_d = dt.date(year, month, day)
                    entities["DATE"] = target_d.isoformat()
                    entities["DATE_LABEL"] = target_d.isoformat()
                except ValueError:
                    pass
            else:
                # Check 'next monday', 'this friday', etc.
                m_next_day = re.search(r"\b(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", t_lower)
                if m_next_day:
                    target_wd = WEEKDAYS.index(m_next_day.group(1))
                    curr_wd = ref_date.weekday()
                    days_ahead = (target_wd - curr_wd) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    target_d = ref_date + dt.timedelta(days=days_ahead)
                    entities["DATE"] = target_d.isoformat()
                    entities["DATE_LABEL"] = f"Next {m_next_day.group(1).capitalize()}"

    # 4. Time Extraction
    m_time = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", t_lower)
    if m_time:
        hour = int(m_time.group(1)) % 12
        if m_time.group(3) == "pm":
            hour += 12
        minute = m_time.group(2) or "00"
        entities["TIME"] = f"{hour:02d}:{minute}"
        entities["TIME_LABEL"] = f"{m_time.group(1)} {m_time.group(3).upper()}"
    else:
        for period in PERIODS:
            if re.search(rf"\b{period}\b", t_lower):
                entities["TIME_PERIOD"] = period
                break

    # 5. Bus Type / AC / Sleeper / Seater
    if "ac sleeper" in t_lower or ("ac" in t_lower and "sleeper" in t_lower):
        entities["BUS_TYPE"] = "AC Sleeper"
    elif "non-ac sleeper" in t_lower or ("non ac" in t_lower and "sleeper" in t_lower):
        entities["BUS_TYPE"] = "Non-AC Sleeper"
    elif "ac" in t_lower:
        entities["BUS_TYPE"] = "AC"
    elif "non-ac" in t_lower or "non ac" in t_lower:
        entities["BUS_TYPE"] = "Non-AC"
    elif "sleeper" in t_lower:
        entities["BUS_TYPE"] = "Sleeper"
    elif "volvo" in t_lower:
        entities["BUS_TYPE"] = "Volvo Multi-Axle"
    elif "ultra deluxe" in t_lower:
        entities["BUS_TYPE"] = "Ultra Deluxe"

    # 6. Max Fare Budget Constraint
    m_fare = re.search(r"\b(?:under|below|less than|within|max|budget)\s*₹?\s*(\d{3,5})\b", t_lower)
    if not m_fare:
        m_fare = re.search(r"\b(\d{3,4})\s*(?:rupees|rs|inr|rupee)\b", t_lower)
    if m_fare:
        entities["MAX_FARE"] = int(m_fare.group(1))

    # 7. Operator Matching
    for op in OPERATORS:
        if op.lower() in t_lower:
            entities["OPERATOR"] = op
            break

    # 8. Passenger / Seat Count (1 to 6)
    m_pax = re.search(r'\b([1-6])\s*(?:passengers?|seats?|tickets?|people|persons?|pax)\b', t_lower)
    if not m_pax:
        m_pax = re.search(r'\b(?:for|book|need)\s*([1-6])\s*(?:seats?|passengers?|tickets?)?\b', t_lower)
    if m_pax:
        entities["PASSENGERS"] = int(m_pax.group(1))

    return entities
