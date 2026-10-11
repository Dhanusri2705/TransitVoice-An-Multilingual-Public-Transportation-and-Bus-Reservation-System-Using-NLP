
# TransitVoice - AI-Powered Multilingual Voice-Based Public Transport Information, Bus Booking, Live Tracking and Complaint Platform

TransitVoice is a full-stack, realistic bus-booking application and intelligent passenger assistant platform. It combines modern bus reservation workflows (similar to RedBus) with multilingual natural language processing (NLP) and Web Speech API interaction.


## 🚀 Key Features

1. **Multilingual Voice-First Interface**: Speak naturally in English, Tamil (Tanglish), or Hindi (Hinglish) to search buses, inspect fares, select seats, file complaints, or leave reviews.
2. **Interactive Seat Reservation**: Real-time visual bus layout grid (Lower/Upper deck, Window/Aisle) with instant fare calculation and seat locking.
3. **Live GPS Bus Tracking**: Interactive Leaflet OpenStreetMap view with animated moving bus marker, real-time simulated lat/long telematics, speed, waypoints, and ETA countdown.
4. **Instant Digital QR Ticket**: Generates printable PDF-friendly ticket with embedded security QR code pass.
5. **Grievance Redressal & Complaint Tracker**: Lodge service complaints using voice or text with auto-categorization and live status timeline (`OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED`).
6. **Passenger Feedback & Sentiment Engine**: Rate driver safety, cleanliness, punctuality, and comfort with NLP sentiment extraction.
7. **Role-Based Portals**:
   - **Passengers**: Search, book, track, feedback, and complaint tracking.
   - **Bus Operators**: Manage fleet buses, update schedules/fares, and adjust live bus GPS status.
   - **System Administrators**: Platform analytics KPI dashboard, revenue graphs, and complaint remediation.
8. **Academic NLP Debug Panel**: Dedicated inspection interface showcasing raw preprocessing, language detection, TF-IDF n-gram vectorization, LinearSVC intent classification, gazetteer NER extraction, and grounded database QA.



🏗️ Architecture & Technology Stack


TransitVoice/
├── frontend/             # React (Vite) + Tailwind CSS + Leaflet + Lucide + Web Speech API
├── backend/              # Node.js + Express REST API + JWT Auth + Local JSON/MongoDB DB store
├── nlp_service/          # Python Flask + scikit-learn (TF-IDF + LinearSVC) + Gazetteer NER
└── data/                 # 124+ Realistic Indian Bus records, Intent Datasets, Seed Users
```

- **Frontend**: React 18, React Router DOM v6, Axios, Leaflet / React-Leaflet, Tailwind CSS, Lucide React Icons.
- **Backend**: Node.js, Express.js, JWT, bcryptjs, REST APIs.
- **NLP Service**: Python 3.11, Flask, scikit-learn, pandas, joblib, deep-translator, NumPy.
- **Database**: 124 realistic records across Chennai, Coimbatore, Madurai, Trichy, Salem, Bangalore, Hyderabad, Mysore, Pondicherry, etc.

---

## 🧠 Implementation of Core NLP Concepts

| Concept | Implementation Details | Target File |
| :--- | :--- | :--- |
| **1. Speech Processing** | Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) capturing audio input and voicing natural responses | [VoiceContext.jsx](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/frontend/src/context/VoiceContext.jsx) |
| **2. Machine Translation** | Deep-translator + rule-based dictionary mapping Tanglish/Hinglish/Tamil script to English while preserving city names & dates | [translator.py](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/nlp_service/translator.py) |
| **3. Text Preprocessing** | Lowercasing, punctuation stripping, stopword handling, and whitespace normalization | [normalizer.py](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/nlp_service/normalizer.py) |
| **4. Intent Classification** | TF-IDF n-gram (1,2) vectorizer + Calibrated LogisticRegression / LinearSVC classifier trained on 652 intent queries | [intent_classifier.py](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/nlp_service/intent_classifier.py) |
| **5. Entity Extraction (NER)** | Hybrid Gazetteer dictionary matching for 15+ Indian cities + Regex patterns for Dates, Times, Max Fares, and Bus IDs | [ner.py](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/nlp_service/ner.py) |
| **6. Grounded Question Answering** | Grounded database aggregator & TF-IDF Cosine Similarity policy FAQ matcher preventing hallucination | [qa_chatbot.py](file:///c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/nlp_service/qa_chatbot.py) |

---

## 🔑 Demo User Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Passenger User** | `user@transitvoice.com` | `password123` | Book tickets, track GPS, submit complaints & reviews |
| **Bus Operator** | `operator@transitvoice.com` | `password123` | Update assigned bus schedules, fares, and live GPS location |
| **System Admin** | `admin@transitvoice.com` | `password123` | View platform analytics, revenue, add buses, resolve complaints |

---

## 🛠️ How to Run Locally

### 1. Start Python NLP Engine (Port 5001)
```bash
cd nlp_service
python app.py
```

### 2. Start Express Backend Server (Port 5000)
```bash
cd backend
npm start
```

### 3. Start Frontend React Development Server (Port 3000)
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your web browser.

---

## 🧪 Academic Test Cases

You can run these test queries in the **Academic Demo** page (`/nlp-demo`) or using the voice assistant button:

1. `"I need a bus from Chennai to Madurai."`
2. `"Show AC buses from Coimbatore to Chennai."`
3. `"Which bus is cheapest?"`
4. `"Bus 120 departure time?"`
5. `"Where is my bus?"`
6. `"My bus is delayed."`
7. `"I want to cancel my ticket."`
8. `"How many seats are available?"`
9. `"Coimbatore lendhu Chennai ku bus irukka?"` (Tanglish)
10. `"Chennai se Madurai jane ke liye bus hai kya?"` (Hinglish)
=======
# TransitVoice

**An Intelligent Multilingual Public Transportation and Bus Reservation System Using Natural Language Processing**

## About the Project

TransitVoice is an NLP-based public transportation assistant that enables users to search for bus information, ask questions in supported languages, interact through voice features, make demo bookings, track journeys, and submit complaints or feedback.

## Key Features

- Multilingual text processing and translation
- Speech input and voice-based interaction
- Intent classification using TF-IDF and Logistic Regression
- Named Entity Recognition (NER)
- Question Answering and chatbot functionality
- Sentiment analysis of passenger feedback
- Bus search, demo booking, and simulated tracking
- Passenger, operator, and admin dashboards

## Technologies Used

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- NLP Service: Python, Flask, scikit-learn
- Data Processing: pandas
- Authentication: JWT and bcrypt
- Data Storage: CSV and JSON files

## NLP Concepts

1. Speech Processing
2. Machine Translation
3. Text Preprocessing
4. Intent Classification
5. Named Entity Recognition
6. Question Answering

## Important Note

Bus schedules and tracking information should be treated as demonstration data unless verified against an official live transport source. Tracking may use simulation rather than live GPS.

## Project Status

Academic NLP project developed for educational and demonstration purposes.
a43294a96b462f817409325e134a7e73f7ff114b
