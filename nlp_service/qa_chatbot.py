import json
import re
import pandas as pd
from config import BUSES_JSON

POLICY_FAQ = [
    ("cancellation policy cancel booking refund ticket process",
     "Cancellation Policy: 100% full refund for cancellations up to 24 hours before departure; 50% refund between 6 to 24 hours prior; non-refundable within 6 hours of departure. Initiate refunds instantly via My Bookings."),
    ("luggage baggage weight allowance limit carry on",
     "Luggage Allowance: Each ticket includes 1 check-in bag up to 15kg plus 1 small personal handbag/laptop bag."),
    ("pets animals allowed travelling cabin",
     "Pet Policy: For hygiene and safety, live animals and pets are not permitted inside passenger cabins."),
    ("wifi charging amenities facilities blanket water bottle AC sleeper",
     "Amenities: Air conditioning, high-speed WiFi, USB charging ports, personal reading lights, and sanitized blankets are available on select AC buses."),
    ("boarding points pickup dropping points locations hub",
     "Boarding Points: Major Tamil Nadu boarding hubs include Koyambedu CMBT (Chennai), Gandhipuram (Coimbatore), Mattuthavani (Madurai), and Central Bus Stand (Trichy)."),
    ("operators bus companies partner transport corporation",
     "Partner Operators: State Express Transport Corp (SETC Tamil Nadu), TNSTC Coimbatore, TNSTC Madurai, TNSTC Salem, MTC Chennai, KPN Travels, SRS Travels, IntrCity SmartBus, and Parveen Travels.")
]

def load_buses_data():
    if BUSES_JSON.exists():
        with open(BUSES_JSON, "r", encoding="utf-8") as f:
            return pd.DataFrame(json.load(f))
    return pd.DataFrame()

def answer_faq(query_text):
    q_lower = query_text.lower()
    for keywords, ans in POLICY_FAQ:
        keys = keywords.split()
        if any(k in q_lower for k in keys if len(k) > 3):
            return ans
    return "I am TransitVoice Assistant. You can ask me about bus search, timings, fares, seat availability, bookings, tracking, complaints, or feedback."

def query_database(entities):
    df = load_buses_data()
    if df.empty:
        return df

    src = entities.get("SOURCE")
    dst = entities.get("DESTINATION")
    bus_type = entities.get("BUS_TYPE")
    max_fare = entities.get("MAX_FARE")
    bus_num = entities.get("BUS_NUMBER")
    operator = entities.get("OPERATOR")
    time_period = entities.get("TIME_PERIOD")

    if bus_num:
        num_clean = str(bus_num).replace("Bus", "").replace("bus", "").strip()
        matched = df[df["service_id"].str.contains(num_clean, case=False) | 
                     df["bus_number"].str.contains(num_clean, case=False)]
        if not matched.empty:
            return matched

    if src:
        src_lower = src.lower()
        df = df[
            df["source"].str.lower().str.contains(src_lower) |
            df["via"].str.lower().str.contains(src_lower) |
            df["stops"].apply(lambda st: any(src_lower in str(s).lower() for s in st) if isinstance(st, list) else False)
        ]
    if dst:
        dst_lower = dst.lower()
        df = df[
            df["destination"].str.lower().str.contains(dst_lower) |
            df["via"].str.lower().str.contains(dst_lower) |
            df["stops"].apply(lambda st: any(dst_lower in str(s).lower() for s in st) if isinstance(st, list) else False)
        ]
    if operator:
        df = df[df["operator_name"].str.lower().str.contains(operator.lower())]
    if bus_type:
        df = df[df["bus_type"].str.contains(bus_type, case=False)]
    if max_fare:
        df = df[df["fare"] <= max_fare]

    if time_period:
        if time_period == "morning":
            df = df[df["departure_time"].between("05:00", "12:00")]
        elif time_period == "afternoon":
            df = df[df["departure_time"].between("12:00", "17:00")]
        elif time_period == "evening":
            df = df[df["departure_time"].between("17:00", "21:00")]
        elif time_period == "night":
            df = df[(df["departure_time"] >= "21:00") | (df["departure_time"] <= "05:00")]

    return df

def generate_response(intent, entities, query_text="", user_booking=None):
    src = entities.get("SOURCE")
    dst = entities.get("DESTINATION")
    bus_num = entities.get("BUS_NUMBER")
    q_lower = (query_text or "").lower()

    route_str = f"{src} → {dst}" if src and dst else (src or dst or "your specified route")

    # 1. Greeting Intent
    if intent == "greeting" or re.search(r'\b(hello|hi|hey|vanakkam|namaste)\b', q_lower):
        return "Hello! I am TransitVoice, your voice-activated transport assistant. How can I help with your bus journey today?"

    # 2. General Info & Help Intents
    if intent in ["general_information", "help"]:
        return answer_faq(query_text)

    # 3. Cancellation Intent
    if intent == "cancellation" or "cancel" in q_lower:
        return "Cancellation Policy: 100% full refund for cancellations up to 24 hours before departure. To cancel a ticket, please navigate to 'My Bookings' and click 'Cancel Ticket'."

    # Check negative complaint keywords first (cleanliness, delay, driver, service)
    is_cleanliness_complaint = any(w in q_lower for w in ["unclean", "dirty", "stink", "smell", "dust", "trash", "hygiene", "mosquito"])
    is_driver_complaint = any(w in q_lower for w in ["rude", "rash", "overspeeding", "misbehaved", "aggressive", "shouted", "driver behaviour"])
    is_delay_complaint = any(w in q_lower for w in ["delay", "delayed", "late", "waiting hours", "behind schedule"])
    is_general_complaint = (intent == "complaint" or "complain" in q_lower or "complaint" in q_lower or "worst service" in q_lower or "poor service" in q_lower)

    # 4. Complaint Intent Handling
    if intent == "complaint" or is_cleanliness_complaint or is_driver_complaint or is_delay_complaint or is_general_complaint:
        if is_cleanliness_complaint:
            return "I'm sorry about the cleanliness issue. Would you like to submit a complaint or share feedback about the bus?"
        elif is_driver_complaint:
            return "I apologize for the driver's behaviour. You can register an official grievance under 'Complaints' for Driver Behaviour."
        elif is_delay_complaint:
            return "We apologize for the bus delay. You can check live tracking in 'My Bookings' or submit a delay complaint."
        else:
            return "We apologize for the inconvenience. You can file a service grievance directly under 'Complaints' with auto-categorization for Driver Behaviour, Delay, Cleanliness, or AC issues."

    # Check positive sentiment keywords (using word boundaries to avoid matching 'unclean' with 'clean')
    pos_pattern = r'\b(comfortable|clean|good|great|excellent|superb|smooth|nice|awesome|loved|punctual)\b'
    is_positive_statement = bool(re.search(pos_pattern, q_lower)) and not bool(re.search(r'\b(unclean|not\s+clean|never|worst|bad)\b', q_lower))

    # 5. Positive Feedback Intent
    if intent == "feedback" or (is_positive_statement and not any(k in q_lower for k in ["from", "to", "bus from", "fare", "timing"])):
        return "Thank you for sharing your positive experience! You can submit detailed ratings and NLP sentiment reviews on the 'Feedback' page."

    # 6. Amenities Intent
    if intent == "amenities" or "wifi" in q_lower or "amenities" in q_lower or "blanket" in q_lower or "charging" in q_lower:
        df_all = load_buses_data()
        if bus_num:
            num_clean = str(bus_num).replace("Bus", "").replace("bus", "").strip()
            matched = df_all[df_all["service_id"].str.contains(num_clean, case=False) | df_all["bus_number"].str.contains(num_clean, case=False)]
            if not matched.empty:
                b = matched.iloc[0]
                amenities_list = ", ".join(b.get("amenities", ["WiFi", "Charging Port", "Water Bottle"]))
                return f"Bus {b['bus_number']} ({b['operator_name']}) amenities include: {amenities_list}."
        return "TransitVoice buses feature high-speed WiFi, USB charging points, personal reading lights, water bottles, and sanitized blankets on AC Sleeper services."

    # 7. Bus Tracking / "Where is my bus"
    if intent in ["tracking", "bus_status"] or "where is my bus" in q_lower:
        if "my bus" in q_lower or "where" in q_lower:
            if user_booking:
                return f"Your booked bus ({user_booking.get('operator_name')}, {user_booking.get('bus_number')}) for {user_booking.get('source')} → {user_booking.get('destination')} is currently IN_TRANSIT. Open 'My Bookings' to track live GPS."
            else:
                return "My Trips does not contain an active bus booking. Please book a bus first to track it."

    df_results = query_database(entities)

    # Bus Number Route Inquiry
    if bus_num:
        num_clean = str(bus_num).replace("Bus", "").replace("bus", "").strip()
        df_all = load_buses_data()
        matched = df_all[df_all["service_id"].str.contains(num_clean, case=False) | df_all["bus_number"].str.contains(num_clean, case=False)]
        if not matched.empty:
            b = matched.iloc[0]
            via_info = b.get("via", f"{b['source']} to {b['destination']}")
            return f"🚌 Bus **{b['service_id']} / {b['bus_number']}** ({b['operator_name']}) operates **{b['source']} → {b['destination']}** ({via_info}). Departs at **{b['departure_time']}** | Fare: **₹{b['fare']}** | Available Seats: **{b.get('available_seats', 30)}**."

    if df_results.empty:
        if src and dst:
            return f"No buses currently found operating from **{src}** to **{dst}** matching your specified budget or filter criteria. Please try alternate dates or filters."
        elif src:
            return f"I found several routes originating from **{src}** (including Chennai, Coimbatore, Madurai, Salem, and Bangalore). Please specify your destination city."
        elif dst:
            return f"I found several buses heading to **{dst}**. Please specify your departure city."
        else:
            return answer_faq(query_text)

    count = len(df_results)

    # 8. Fare Inquiry
    if intent == "fare_inquiry" or "cheapest" in q_lower or "fare" in q_lower or "price" in q_lower:
        min_f = df_results["fare"].min()
        max_f = df_results["fare"].max()
        cheapest_bus = df_results.loc[df_results["fare"].idxmin()]
        return f"Found {count} bus services for **{route_str}**. Fares range from **₹{min_f}** to **₹{max_f}**. The cheapest bus is **₹{cheapest_bus['fare']}** on **{cheapest_bus['operator_name']}** ({cheapest_bus['bus_type']})."

    # 9. Bus Timing
    if intent == "bus_timing" or "timing" in q_lower or "time" in q_lower or "schedule" in q_lower:
        times = sorted(df_results["departure_time"].unique())[:6]
        return f"Scheduled departure times for **{route_str}** include: ⏰ **{', '.join(times)}**."

    # 10. Seat Availability
    if intent == "seat_availability" or "seats" in q_lower or "available" in q_lower:
        max_seats_bus = df_results.loc[df_results["available_seats"].idxmax()]
        return f"Total **{count}** buses available for **{route_str}**. **{max_seats_bus['operator_name']}** has the highest seat availability with **{max_seats_bus['available_seats']} seats free**."

    # 11. Bus Status / Tracking
    if intent in ["tracking", "bus_status"]:
        sample = df_results.iloc[0]
        return f"Bus **{sample['bus_number']}** ({sample['operator_name']}) running **{sample['source']} → {sample['destination']}** departs at **{sample['departure_time']}**. Status: **{sample.get('bus_status', 'AT_SOURCE')}**."

    # 12. Default Bus Search Intent
    cheapest = df_results.loc[df_results["fare"].idxmin()]
    return f"I found **{count} bus services** for **{route_str}**. Earliest departure at **{df_results['departure_time'].min()}** and fares start from **₹{cheapest['fare']}** ({cheapest['operator_name']})."
