import json
import csv
import pandas as pd
from datetime import datetime

# Read existing intents if available
existing_intents_path = "c:/Users/dhanu/OneDrive/Desktop/TransitVoice1/TransitVoice/data/raw/intents_raw.csv"
try:
    df_existing = pd.read_csv(existing_intents_path)
    existing_records = df_existing.to_dict(orient="records")
except Exception as e:
    existing_records = []

# Multilingual and additional intent samples (Tanglish, Hinglish, English)
multilingual_samples = [
    {"query": "coimbatore lendhu chennai ku naalaikku evening bus irukka?", "intent": "bus_search"},
    {"query": "chennai se madurai jane ke liye bus hai kya?", "intent": "bus_search"},
    {"query": "chennai to coimbatore bus search", "intent": "bus_search"},
    {"query": "i want an ac bus from coimbatore to chennai tomorrow after 8 pm under 700 rupees", "intent": "bus_search"},
    {"query": "show sleeper buses from bangalore to chennai", "intent": "bus_search"},
    {"query": "naalaikku trichy ku bus irukka", "intent": "bus_search"},
    {"query": "kal subah bangalore ki bus ticket chahiye", "intent": "bus_search"},
    {"query": "what is the ticket fare for chennai to madurai", "intent": "fare_inquiry"},
    {"query": "ticket evlo aagum coimbatore to chennai", "intent": "fare_inquiry"},
    {"query": "kitna kitna ticket price hai hyderabad to bangalore", "intent": "fare_inquiry"},
    {"query": "which bus is cheapest from chennai to madurai", "intent": "fare_inquiry"},
    {"query": "is my bus delayed", "intent": "bus_status"},
    {"query": "my bus from chennai to madurai is delayed", "intent": "complaint"},
    {"query": "bus eppo varum", "intent": "tracking"},
    {"query": "where is my bus right now", "intent": "tracking"},
    {"query": "bus live location kaatu", "intent": "tracking"},
    {"query": "live tracking link for my bus", "intent": "tracking"},
    {"query": "driver was very rude and AC was not working", "intent": "complaint"},
    {"query": "bus clean ah illa very dirty", "intent": "complaint"},
    {"query": "the journey was very comfortable driver drove safely", "intent": "feedback"},
    {"query": "super travel experience excellent bus condition", "intent": "feedback"},
    {"query": "nalla nalla travel nallaruurku rating 5", "intent": "feedback"},
    {"query": "how many seats available in TV-00102", "intent": "seat_availability"},
    {"query": "seats irukka chennai bus la", "intent": "seat_availability"},
    {"query": "i want to cancel my ticket TV-BOOK-101", "intent": "cancellation"},
    {"query": "ticket cancel panna mudiyuma", "intent": "cancellation"},
    {"query": "cancel my booking refund timing", "intent": "cancellation"},
    {"query": "hello transitvoice", "intent": "greeting"},
    {"query": "hi good morning", "intent": "greeting"},
    {"query": "vanakkam transitvoice assistant", "intent": "greeting"},
    {"query": "namaste bus search kaise kare", "intent": "help"},
    {"query": "help me book a seat", "intent": "help"},
    {"query": "how to use voice search", "intent": "help"}
]

all_intents = existing_records + multilingual_samples
df_all = pd.DataFrame(all_intents).drop_duplicates(subset=["query"])
df_all.to_csv("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/intents.csv", index=False)
print(f"Saved {len(df_all)} total intent training rows to intents.csv")

# Create Users Seed
users = [
    {
        "user_id": "USR-101",
        "name": "Arun Kumar",
        "email": "user@transitvoice.com",
        "phone": "+91 9876500001",
        "password_hash": "$2a$10$wU0uG1f/z.9Vl08k8T/6/eU7c47dE3qE6j0A7H/1Z5a4m4d4e4c4O", # hashed "password123"
        "role": "USER",
        "preferred_language": "English",
        "profile_image": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
        "created_at": "2026-01-15T10:00:00Z"
    },
    {
        "user_id": "OPR-101",
        "name": "SRS Operations Admin",
        "email": "operator@transitvoice.com",
        "phone": "+91 9876500002",
        "password_hash": "$2a$10$wU0uG1f/z.9Vl08k8T/6/eU7c47dE3qE6j0A7H/1Z5a4m4d4e4c4O",
        "role": "OPERATOR",
        "operator_id": "OP-101",
        "preferred_language": "Tamil",
        "profile_image": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
        "created_at": "2026-01-10T09:00:00Z"
    },
    {
        "user_id": "ADM-101",
        "name": "System Administrator",
        "email": "admin@transitvoice.com",
        "phone": "+91 9876500000",
        "password_hash": "$2a$10$wU0uG1f/z.9Vl08k8T/6/eU7c47dE3qE6j0A7H/1Z5a4m4d4e4c4O",
        "role": "ADMIN",
        "preferred_language": "English",
        "profile_image": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
        "created_at": "2026-01-01T00:00:00Z"
    }
]

with open("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/users.json", "w", encoding="utf-8") as f:
    json.dump(users, f, indent=2)

# Create Sample Complaints
complaints = [
    {
        "complaint_id": "CMP-9001",
        "user_id": "USR-101",
        "booking_id": "BK-501",
        "bus_id": "TV-00001",
        "bus_number": "TN-38-AX-1234",
        "operator_name": "SRS Travels",
        "category": "Bus Delay",
        "description": "Bus was delayed by over 45 minutes at Koyambedu boarding point without prior notification.",
        "NLP_detected_intent": "complaint",
        "NLP_entities": {"LOCATION": "Chennai", "ISSUE": "Bus Delay", "DURATION": "45 minutes"},
        "status": "OPEN",
        "created_at": "2026-09-28T18:30:00Z"
    },
    {
        "complaint_id": "CMP-9002",
        "user_id": "USR-101",
        "booking_id": "BK-498",
        "bus_id": "TV-00003",
        "bus_number": "TN-01-BC-5678",
        "operator_name": "KPN Travels",
        "category": "AC Issue",
        "description": "Air conditioning unit was blowing warm air throughout the night journey.",
        "NLP_detected_intent": "complaint",
        "NLP_entities": {"ISSUE": "AC Issue"},
        "status": "IN_PROGRESS",
        "created_at": "2026-09-25T11:15:00Z"
    },
    {
        "complaint_id": "CMP-9003",
        "user_id": "USR-101",
        "booking_id": "BK-450",
        "bus_id": "TV-00005",
        "bus_number": "KA-01-DE-9988",
        "operator_name": "IntrCity SmartBus",
        "category": "Driver Behaviour",
        "description": "Driver was over-speeding and using mobile phone while driving on highway.",
        "NLP_detected_intent": "complaint",
        "NLP_entities": {"ISSUE": "Driver Behaviour", "SAFETY": "High"},
        "status": "RESOLVED",
        "created_at": "2026-09-10T14:20:00Z",
        "resolved_at": "2026-09-12T10:00:00Z"
    }
]

with open("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/complaints.json", "w", encoding="utf-8") as f:
    json.dump(complaints, f, indent=2)

# Create Sample Reviews/Feedback
feedback = [
    {
        "feedback_id": "FDB-8001",
        "user_id": "USR-101",
        "user_name": "Arun Kumar",
        "booking_id": "BK-501",
        "bus_id": "TV-00001",
        "rating": 4.5,
        "driver_rating": 5,
        "cleanliness_rating": 4,
        "punctuality_rating": 4,
        "comfort_rating": 5,
        "staff_rating": 4.5,
        "comment": "Smooth sleeper journey from Coimbatore to Chennai. Very punctual and clean blankets.",
        "sentiment": "Positive",
        "created_at": "2026-09-29T07:30:00Z"
    },
    {
        "feedback_id": "FDB-8002",
        "user_id": "USR-101",
        "user_name": "Priya Sharma",
        "booking_id": "BK-495",
        "bus_id": "TV-00002",
        "rating": 4.8,
        "driver_rating": 5,
        "cleanliness_rating": 5,
        "punctuality_rating": 5,
        "comfort_rating": 4.5,
        "staff_rating": 5,
        "comment": "IntrCity SmartBus provides amazing lounge access and high speed WiFi on board!",
        "sentiment": "Positive",
        "created_at": "2026-09-27T08:00:00Z"
    }
]

with open("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/reviews.json", "w", encoding="utf-8") as f:
    json.dump(feedback, f, indent=2)

print("Saved users, complaints, and reviews seed datasets.")
