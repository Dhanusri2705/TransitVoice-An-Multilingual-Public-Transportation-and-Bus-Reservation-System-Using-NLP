const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');

// POST /api/feedback (Submit passenger review)
router.post('/', verifyToken, (req, res) => {
  const {
    booking_id,
    bus_id,
    rating,
    driver_rating,
    cleanliness_rating,
    punctuality_rating,
    comfort_rating,
    staff_rating,
    comment,
    sentiment,
    original_text,
    detected_language,
    detected_language_code,
    translated_text
  } = req.body;

  if (!bus_id || !rating) {
    return res.status(400).json({ error: 'Bus ID and rating required' });
  }

  const newFeedback = {
    feedback_id: `FDB-${Date.now().toString().slice(-6)}`,
    user_id: req.user.user_id,
    user_name: req.user.name,
    booking_id: booking_id || '',
    bus_id: bus_id,
    rating: parseFloat(rating),
    driver_rating: parseFloat(driver_rating) || 5,
    cleanliness_rating: parseFloat(cleanliness_rating) || 4.5,
    punctuality_rating: parseFloat(punctuality_rating) || 4.5,
    comfort_rating: parseFloat(comfort_rating) || 5,
    staff_rating: parseFloat(staff_rating) || 4.5,
    comment: comment || original_text || '',
    original_text: original_text || comment || '',
    detected_language: detected_language || 'English',
    detected_language_code: detected_language_code || 'en',
    translated_text: translated_text || comment || '',
    sentiment: sentiment || 'Positive',
    created_at: new Date().toISOString()
  };

  db.reviews.unshift(newFeedback);
  
  // Recalculate bus rating average
  const busReviews = db.reviews.filter(r => r.bus_id === bus_id);
  const avg = busReviews.reduce((sum, r) => sum + r.rating, 0) / busReviews.length;
  const bus = db.buses.find(b => b.bus_id === bus_id);
  if (bus) {
    bus.rating = parseFloat(avg.toFixed(1));
    bus.review_count = busReviews.length;
  }

  db.saveReviews();
  db.saveBuses();

  res.status(201).json({ message: 'Feedback submitted successfully', feedback: newFeedback });
});

// GET /api/feedback/bus/:id
router.get('/bus/:id', (req, res) => {
  const reviews = db.reviews.filter(r => r.bus_id === req.params.id);
  const total = reviews.length;
  const avgOverall = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 4.5;
  const avgDriver = total ? (reviews.reduce((s, r) => s + r.driver_rating, 0) / total).toFixed(1) : 4.6;
  const avgCleanliness = total ? (reviews.reduce((s, r) => s + r.cleanliness_rating, 0) / total).toFixed(1) : 4.5;
  const avgPunctuality = total ? (reviews.reduce((s, r) => s + r.punctuality_rating, 0) / total).toFixed(1) : 4.4;
  const avgComfort = total ? (reviews.reduce((s, r) => s + r.comfort_rating, 0) / total).toFixed(1) : 4.6;

  res.json({
    bus_id: req.params.id,
    summary: {
      rating: parseFloat(avgOverall),
      review_count: total,
      driver_rating: parseFloat(avgDriver),
      cleanliness_rating: parseFloat(avgCleanliness),
      punctuality_rating: parseFloat(avgPunctuality),
      comfort_rating: parseFloat(avgComfort)
    },
    reviews
  });
});

module.exports = router;
