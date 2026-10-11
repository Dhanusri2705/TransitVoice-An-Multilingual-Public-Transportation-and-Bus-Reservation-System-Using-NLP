const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../models/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const PYTHON_NLP_URL = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:5001';

// Internal fallback NLP processor if Python service is offline
function internalNLPFallback(rawText, userBooking = null) {
  const t = String(rawText || '').toLowerCase().trim();

  let langName = 'English';
  let langCode = 'en';
  if (/[\u0B80-\u0BFF]/.test(rawText)) { langName = 'Tamil'; langCode = 'ta'; }
  else if (/[\u0900-\u097F]/.test(rawText)) { langName = 'Hindi'; langCode = 'hi'; }
  else if (/[\u0C00-\u0C7F]/.test(rawText)) { langName = 'Telugu'; langCode = 'te'; }
  else if (/[\u0D00-\u0D7F]/.test(rawText)) { langName = 'Malayalam'; langCode = 'ml'; }
  else if (t.includes('lendhu') || t.includes('irukka') || t.includes('naalaikku')) { langName = 'Tamil'; langCode = 'ta'; }
  else if (t.includes('jaye') || t.includes('chahiye') || t.includes('hai kya')) { langName = 'Hindi'; langCode = 'hi'; }
  else if (t.includes('nundi') || t.includes('kaavali')) { langName = 'Telugu'; langCode = 'te'; }
  else if (t.includes('ninnu') || t.includes('venam')) { langName = 'Malayalam'; langCode = 'ml'; }

  // Check intent categories
  const isCleanlinessIssue = t.includes('unclean') || t.includes('dirty') || t.includes('stink') || t.includes('smell') || t.includes('dust') || t.includes('trash') || t.includes('mosquito') || t.includes('அழுக்காக') || t.includes('गंदी') || t.includes('అపరిశుభ్రంగా') || t.includes('വൃത്തിഹീനമാണ്');
  const isDriverIssue = t.includes('rude') || t.includes('rash') || t.includes('overspeeding') || t.includes('misbehaved') || t.includes('aggressive') || t.includes('shouted') || t.includes('மரியாதைக்குறைவாக') || t.includes('बदतमीज') || t.includes('దురుసుగా') || t.includes('മോശമായി');
  const isDelayIssue = t.includes('delay') || t.includes('delayed') || t.includes('late') || t.includes('தாமதம்') || t.includes('देर से') || t.includes('లేట్') || t.includes('വൈകി');
  const isGeneralComplaint = t.includes('worst service') || t.includes('poor service') || t.includes('pathetic') || t.includes('complaint') || t.includes('complain') || t.includes('grievance') || t.includes('புகார்') || t.includes('शिकायत') || t.includes('ఫిర్యాదు') || t.includes('പരാതി');
  const isPositiveFeedback = (t.includes('comfortable') && !t.includes('uncomfortable')) || t.includes('clean and comfortable') || t.includes('comfortable and clean') || t.includes('superb') || t.includes('smooth journey') || t.includes('pleasant') || t.includes('safe driving') || t.includes('polite driver') || t.includes('5 star') || t.includes('five star') || t.includes('வசதியாக') || t.includes('आरामदायक') || t.includes('సౌకర్యవంతంగా') || t.includes('സുഖകരമായ');

  let intent = 'bus_search';
  let confidence = 0.82;

  if (t.includes('hello') || t.includes('hi') || t.includes('hey') || t.includes('vanakkam') || t.includes('namaste')) {
    intent = 'greeting';
    confidence = 0.90;
  } else if (isCleanlinessIssue || isDriverIssue || isDelayIssue || isGeneralComplaint) {
    intent = 'complaint';
    confidence = 0.88;
  } else if (isPositiveFeedback || t.includes('feedback') || t.includes('review') || t.includes('rating')) {
    intent = 'feedback';
    confidence = 0.86;
  } else if (t.includes('cheapest') || t.includes('fare') || t.includes('price') || t.includes('rate') || t.includes('cost') || t.includes('rupees') || t.includes('evlo') || t.includes('கட்டணம்') || t.includes('किराया') || t.includes('ఛార్జీ') || t.includes('നിരക്ക്')) {
    intent = 'fare_inquiry';
    confidence = 0.89;
  } else if (t.includes('time') || t.includes('timing') || t.includes('schedule') || t.includes('departs') || t.includes('eppo') || t.includes('நேரம்') || t.includes('समय') || t.includes('సమయం') || t.includes('സമയം')) {
    intent = 'bus_timing';
    confidence = 0.87;
  } else if (t.includes('where is my bus') || t.includes('track') || t.includes('tracking') || t.includes('live location') || t.includes('எங்கே இருக்கிறது') || t.includes('कहां है') || t.includes('ఎక్కడ ఉంది') || t.includes('എവിടെയാണ്')) {
    intent = 'tracking';
    confidence = 0.88;
  } else if (t.includes('cancel') || t.includes('refund') || t.includes('ரத்து')) {
    intent = 'cancellation';
    confidence = 0.91;
  } else if (t.includes('seats') || t.includes('available') || t.includes('vacant') || t.includes('இருக்கைகள்') || t.includes('सीटें') || t.includes('సీట్లు') || t.includes('സീറ്റുകൾ')) {
    intent = 'seat_availability';
    confidence = 0.88;
  } else if (t.includes('wifi') || t.includes('amenities') || t.includes('blanket') || t.includes('charging')) {
    intent = 'amenities';
    confidence = 0.85;
  } else if (t.includes('help') || t.includes('support') || t.includes('how to use')) {
    intent = 'help';
    confidence = 0.84;
  }

  // Extract cities (only for travel/search intents)
  const cities = [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Ooty",
    "Bangalore", "Mysore", "Mangalore", "Hubli", "Thiruvananthapuram", "Kochi", "Kozhikode",
    "Hyderabad", "Vijayawada", "Visakhapatnam", "Tirupati", "Mumbai", "Pune", "Nagpur", "Nashik",
    "Delhi", "Gurgaon", "Noida", "Jaipur", "Udaipur", "Lucknow", "Varanasi", "Kolkata", "Pondicherry"
  ];
  let src = null, dst = null;

  if (!['complaint', 'feedback', 'greeting', 'help'].includes(intent)) {
    for (let c of cities) {
      if (t.includes(c.toLowerCase())) {
        if (!src) src = c;
        else if (!dst && c !== src) dst = c;
      }
    }
  }

  let maxFare = null;
  const fareMatch = t.match(/(?:under|below|less than)\s*(\d+)/i);
  if (fareMatch) maxFare = parseInt(fareMatch[1], 10);

  const busNumMatch = t.match(/(?:bus|service)\s*(\d+)/i);
  const busNum = busNumMatch ? `Bus ${busNumMatch[1]}` : null;

  const entities = {};
  if (src) entities.SOURCE = src;
  if (dst) entities.DESTINATION = dst;

  // Strict date extraction: Never invent Tomorrow when date is not mentioned!
  if (t.includes('tomorrow') || t.includes('naalaikku') || t.includes('kal')) {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    entities.DATE = tm.toISOString().split('T')[0];
  } else if (t.includes('today') || t.includes('tonight') || t.includes('innikku') || t.includes('aaj')) {
    entities.DATE = new Date().toISOString().split('T')[0];
  } else {
    const isoMatch = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) entities.DATE = isoMatch[1];
  }

  if (maxFare) entities.MAX_FARE = maxFare;
  if (busNum) entities.BUS_NUMBER = busNum;

  // Search matching buses only for search/fare/timing/seat queries
  let matchedBuses = [];
  if (['bus_search', 'route_search', 'fare_inquiry', 'bus_timing', 'seat_availability'].includes(intent)) {
    matchedBuses = db.buses;
    if (src) matchedBuses = matchedBuses.filter(b => b.source.toLowerCase() === src.toLowerCase());
    if (dst) matchedBuses = matchedBuses.filter(b => b.destination.toLowerCase() === dst.toLowerCase());
    if (maxFare) matchedBuses = matchedBuses.filter(b => b.fare <= maxFare);
  }

  const routeText = (src && dst) ? `${src} to ${dst}` : src ? `from ${src}` : dst ? `to ${dst}` : 'across India';

  let responseText = '';
  if (intent === 'greeting') {
    responseText = "Hello! I am TransitVoice, your voice-activated transport assistant. How can I help your journey today?";
  } else if (intent === 'cancellation') {
    responseText = "Cancellation Policy: 100% full refund up to 24 hours prior to departure. To cancel a ticket, please navigate to 'My Bookings' and click 'Cancel Ticket'.";
  } else if (intent === 'amenities') {
    responseText = "TransitVoice buses feature high-speed WiFi, USB charging points, personal reading lights, water bottles, and sanitized blankets on AC Sleeper services.";
  } else if (intent === 'complaint') {
    if (isCleanlinessIssue) {
      responseText = "I'm sorry about the cleanliness issue. Would you like to submit a complaint or share feedback about the bus?";
    } else if (isDriverIssue) {
      responseText = "I apologize for the driver's behaviour. You can register an official grievance under 'Complaints' for Driver Behaviour.";
    } else if (isDelayIssue) {
      responseText = "We apologize for the bus delay. You can check live tracking in 'My Bookings' or submit a delay complaint.";
    } else {
      responseText = "We apologize for the inconvenience. You can file a grievance directly under 'Complaints' with category options for Driver Behaviour, Delay, Cleanliness, or AC issues.";
    }
  } else if (intent === 'feedback') {
    responseText = "Thank you for sharing your positive experience! You can submit detailed ratings and NLP sentiment reviews on the 'Feedback' page.";
  } else if (intent === 'tracking' && (t.includes('my bus') || t.includes('where'))) {
    if (userBooking) {
      responseText = `Your booked bus (${userBooking.operator_name}, ${userBooking.bus_number}) for ${userBooking.source} → ${userBooking.destination} is currently IN_TRANSIT. Open 'My Bookings' to track live GPS.`;
    } else {
      responseText = "My Trips does not contain an active bus booking. Please book a bus first to track it.";
    }
  } else if (intent === 'fare_inquiry') {
    if (matchedBuses.length > 0) {
      const minF = Math.min(...matchedBuses.map(b => b.fare));
      const maxF = Math.max(...matchedBuses.map(b => b.fare));
      const cheapestBus = matchedBuses.reduce((prev, curr) => prev.fare < curr.fare ? prev : curr);
      responseText = `Found ${matchedBuses.length} bus services for ${routeText}. Fares range from ₹${minF} to ₹${maxF}. The cheapest bus is ₹${cheapestBus.fare} on ${cheapestBus.operator_name} (${cheapestBus.bus_type}).`;
    } else {
      responseText = `Fares for ${routeText} typically start from ₹450 to ₹950 depending on bus class.`;
    }
  } else if (intent === 'seat_availability') {
    if (matchedBuses.length > 0) {
      const maxSeatBus = matchedBuses.reduce((prev, curr) => (prev.available_seats || 30) > (curr.available_seats || 30) ? prev : curr);
      responseText = `Total ${matchedBuses.length} buses available for ${routeText}. ${maxSeatBus.operator_name} has the highest seat availability with ${maxSeatBus.available_seats || 24} seats free.`;
    } else {
      responseText = "Seats are currently available across morning, afternoon, and night departures.";
    }
  } else if (intent === 'bus_timing') {
    if (matchedBuses.length > 0) {
      const times = matchedBuses.map(b => b.departure_time).slice(0, 5).join(', ');
      responseText = `Scheduled departure times for ${routeText} include: ⏰ ${times}.`;
    } else {
      responseText = "Buses depart regularly between 06:00 AM and 11:30 PM.";
    }
  } else {
    responseText = matchedBuses.length > 0
      ? `Found ${matchedBuses.length} bus services ${routeText}. Earliest departure at ${matchedBuses[0].departure_time} with fares from ₹${matchedBuses[0].fare}.`
      : `I am TransitVoice Assistant. I can help you search buses, check fares, view seat availability, track live bus status, submit complaints, or answer policy questions.`;
  }

  return {
    input_text: rawText,
    detected_language: langName,
    detected_language_code: langCode,
    translation_status: langCode === 'en' ? 'N/A' : 'FAILED',
    translated_text: langCode === 'en' ? rawText : null,
    normalized_text: t,
    detected_intent: intent,
    confidence: confidence,
    entities,
    response: responseText,
    matched_buses: matchedBuses
  };
}

// POST /api/nlp/process
router.post('/process', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text query is required' });
  }

  // Extract user booking context if token is present
  let userBooking = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userBooking = db.bookings.find(b => b.user_id === decoded.user_id && b.booking_status === 'CONFIRMED');
    } catch (e) {}
  }

  try {
    const payload = { ...req.body, user_booking: userBooking };
    const response = await axios.post(`${PYTHON_NLP_URL}/api/nlp/process`, payload, { timeout: 10000 });
    
    const nlpRes = response.data;
    if (nlpRes.entities && ['bus_search', 'route_search', 'fare_inquiry', 'bus_timing', 'seat_availability'].includes(nlpRes.detected_intent)) {
      const src = nlpRes.entities.SOURCE;
      const dst = nlpRes.entities.DESTINATION;
      if (src && dst) {
        nlpRes.matched_buses = db.buses.filter(b => 
          b.source.toLowerCase() === src.toLowerCase() && 
          b.destination.toLowerCase() === dst.toLowerCase()
        );
      }
    }
    return res.json(nlpRes);
  } catch (err) {
    console.warn('NLP Python service unavailable or timed out, executing backend fallback.');
    const fallback = internalNLPFallback(text, userBooking);
    return res.json(fallback);
  }
});

// POST /api/nlp/sentiment
router.post('/sentiment', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.json({
      is_review: true,
      sentiment: 'NEUTRAL',
      score: 0.50,
      confidence: 0.50,
      suggested_rating: 3.5,
      detected_issues: []
    });
  }

  try {
    const response = await axios.post(`${PYTHON_NLP_URL}/api/nlp/sentiment`, req.body, { timeout: 10000 });
    return res.json(response.data);
  } catch (err) {
    console.warn('Python NLP sentiment service offline or error, using internal fallback.');
    const tLower = text.toLowerCase().trim();

    // Check if input is a question / inquiry rather than review
    const isQuestion = tLower.includes('?') || 
      tLower.startsWith('how many') || tLower.startsWith('how much') || tLower.startsWith('what is') ||
      tLower.startsWith('where is') || tLower.startsWith('is there') || tLower.startsWith('are there') ||
      tLower.includes('ఎన్ని') || tLower.includes('எத்தனை') || tLower.includes('कितनी') || tLower.includes('എത്ര');

    if (isQuestion) {
      return res.json({
        is_review: false,
        sentiment: 'NEUTRAL',
        score: 0.50,
        confidence: 0.50,
        suggested_rating: null,
        detected_issues: [],
        message: 'Input is recognized as a transport question or inquiry, not a passenger review. Rating is not applicable.',
        original_text: text,
        translated_text: null
      });
    }

    let sentimentLabel = 'NEUTRAL';
    let score = 0.50;
    let rating = 3.5;

    const posWords = ['good', 'great', 'clean', 'comfortable', 'nice', 'super', 'awesome', 'best', 'nalla', 'safe', 'punctual', 'smooth', 'excellent'];
    const negWords = ['bad', 'dirty', 'unclean', 'filthy', 'late', 'delay', 'delayed', 'worst', 'rude', 'broken', 'rash', 'horrible', 'cheated', 'slow', 'poor'];

    let posCount = posWords.filter(w => tLower.includes(w)).length;
    let negCount = negWords.filter(w => tLower.includes(w)).length;

    if (posCount > negCount) {
      sentimentLabel = 'POSITIVE';
      score = 0.85;
      rating = 4.5;
    } else if (negCount > posCount) {
      sentimentLabel = 'NEGATIVE';
      score = 0.85;
      rating = 2.0;
    }

    return res.json({
      is_review: true,
      sentiment: sentimentLabel,
      score: score,
      confidence: score,
      suggested_rating: rating,
      detected_issues: [],
      original_text: text,
      translated_text: null
    });
  }
});

module.exports = router;
