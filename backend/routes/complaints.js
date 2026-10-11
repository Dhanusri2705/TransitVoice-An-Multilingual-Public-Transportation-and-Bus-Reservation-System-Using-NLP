const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/complaints (Lodge complaint)
router.post('/', verifyToken, (req, res) => {
  const {
    booking_id,
    bus_id,
    category,
    description,
    NLP_detected_intent,
    NLP_entities,
    original_text,
    detected_language,
    detected_language_code,
    translated_text,
    sentiment
  } = req.body;

  if (!category || (!description && !original_text)) {
    return res.status(400).json({ error: 'Complaint category and description required' });
  }

  const bus = db.buses.find(b => b.bus_id === bus_id) || {};
  const complaintId = `CMP-${Date.now().toString().slice(-6)}`;

  const newComplaint = {
    complaint_id: complaintId,
    user_id: req.user.user_id,
    user_name: req.user.name,
    booking_id: booking_id || '',
    bus_id: bus_id || '',
    bus_number: bus.bus_number || 'N/A',
    operator_name: bus.operator_name || 'TransitVoice Partner',
    category: category,
    description: description || original_text,
    original_text: original_text || description,
    detected_language: detected_language || 'English',
    detected_language_code: detected_language_code || 'en',
    translated_text: translated_text || description,
    sentiment: sentiment || 'NEGATIVE',
    NLP_detected_intent: NLP_detected_intent || 'complaint',
    NLP_entities: NLP_entities || {},
    status: 'OPEN',
    created_at: new Date().toISOString(),
    resolved_at: null
  };

  db.complaints.unshift(newComplaint);
  db.saveComplaints();

  res.status(201).json({ message: 'Complaint registered successfully', complaint: newComplaint });
});

// GET /api/complaints
router.get('/', verifyToken, (req, res) => {
  if (req.user.role === 'ADMIN') {
    return res.json(db.complaints);
  }
  if (req.user.role === 'OPERATOR') {
    const operatorComplaints = db.complaints.filter(c => c.operator_name.toLowerCase().includes(req.user.name.toLowerCase()) || req.user.role === 'OPERATOR');
    return res.json(operatorComplaints);
  }

  const userComplaints = db.complaints.filter(c => c.user_id === req.user.user_id);
  res.json(userComplaints);
});

// GET /api/complaints/:id
router.get('/:id', verifyToken, (req, res) => {
  const complaint = db.complaints.find(c => c.complaint_id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }
  res.json(complaint);
});

// PUT /api/complaints/:id/status (Admin/Operator update status)
router.put('/:id/status', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const complaint = db.complaints.find(c => c.complaint_id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { status, resolution_notes } = req.body;
  if (status) complaint.status = status;
  if (resolution_notes) complaint.resolution_notes = resolution_notes;
  if (status === 'RESOLVED') complaint.resolved_at = new Date().toISOString();

  db.saveComplaints();
  res.json({ message: 'Complaint status updated successfully', complaint });
});

module.exports = router;
