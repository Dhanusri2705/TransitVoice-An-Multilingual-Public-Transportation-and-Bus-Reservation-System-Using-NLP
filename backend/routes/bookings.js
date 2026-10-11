const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');

// POST /api/bookings (Create booking)
router.post('/', verifyToken, (req, res) => {
  const { bus_id, journey_date, selected_seats, boarding_point, dropping_point, passenger_details, payment_method } = req.body;

  if (!bus_id || !selected_seats || selected_seats.length === 0) {
    return res.status(400).json({ error: 'Bus ID and selected seats required' });
  }

  const bus = db.buses.find(b => b.bus_id === bus_id);
  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const busDateKey = `${bus_id}_${journey_date || '2026-10-01'}`;
  const currentlyBooked = db.bookedSeatsMap[busDateKey] || [];

  // Check seat conflict
  const conflict = selected_seats.some(s => currentlyBooked.includes(s));
  if (conflict) {
    return res.status(400).json({ error: 'One or more selected seats are already booked. Please choose alternate seats.' });
  }

  const bookingId = `BK-${Date.now().toString().slice(-6)}`;
  const ticketNumber = `TV-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const totalAmount = selected_seats.length * bus.fare;

  const newBooking = {
    booking_id: bookingId,
    ticket_number: ticketNumber,
    user_id: req.user.user_id,
    user_name: req.user.name,
    bus_id: bus.bus_id,
    bus_number: bus.bus_number,
    operator_name: bus.operator_name,
    bus_type: bus.bus_type,
    source: bus.source,
    destination: bus.destination,
    journey_date: journey_date || '2026-10-01',
    departure_time: bus.departure_time,
    arrival_time: bus.arrival_time,
    boarding_point: boarding_point || bus.boarding_points[0],
    dropping_point: dropping_point || bus.dropping_points[0],
    selected_seats: selected_seats,
    passenger_details: passenger_details || [{ name: req.user.name, age: 28, gender: 'Male' }],
    total_amount: totalAmount,
    payment_method: payment_method || 'UPI Mock Payment',
    payment_status: 'PAID',
    booking_status: 'CONFIRMED',
    booking_time: new Date().toISOString(),
    qr_code: `TRANSITVOICE|${ticketNumber}|${bookingId}|${bus.bus_number}|${selected_seats.join(',')}`
  };

  // Lock seats
  db.bookedSeatsMap[busDateKey] = [...currentlyBooked, ...selected_seats];
  // Decrement bus available seats
  bus.available_seats = Math.max(0, bus.available_seats - selected_seats.length);
  
  db.bookings.unshift(newBooking);
  db.saveBookings();
  db.saveBuses();

  res.status(201).json({
    message: 'Booking confirmed successfully!',
    booking: newBooking
  });
});

// GET /api/bookings (User bookings)
router.get('/', verifyToken, (req, res) => {
  const userBookings = db.bookings.filter(b => b.user_id === req.user.user_id);
  res.json(userBookings);
});

// GET /api/bookings/:id (Ticket view)
router.get('/:id', verifyToken, (req, res) => {
  const booking = db.bookings.find(b => b.booking_id === req.params.id || b.ticket_number === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Ticket/Booking not found' });
  }

  const bus = db.buses.find(b => b.bus_id === booking.bus_id);
  res.json({ ...booking, bus_details: bus });
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', verifyToken, (req, res) => {
  const booking = db.bookings.find(b => b.booking_id === req.params.id && b.user_id === req.user.user_id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.booking_status === 'CANCELLED') {
    return res.status(400).json({ error: 'Booking is already cancelled' });
  }

  booking.booking_status = 'CANCELLED';
  booking.payment_status = 'REFUND_PROCESSING';

  // Free seats
  const busDateKey = `${booking.bus_id}_${booking.journey_date}`;
  if (db.bookedSeatsMap[busDateKey]) {
    db.bookedSeatsMap[busDateKey] = db.bookedSeatsMap[busDateKey].filter(s => !booking.selected_seats.includes(s));
  }

  db.saveBookings();
  res.json({ message: 'Booking cancelled successfully. Refund initiated.', booking });
});

module.exports = router;
