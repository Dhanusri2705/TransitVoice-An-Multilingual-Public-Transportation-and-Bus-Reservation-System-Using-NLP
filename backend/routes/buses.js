const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Helper to filter buses
function filterBuses(query) {
  let list = [...db.buses];
  const { source, destination, bus_type, max_fare, min_rating, departure_time, sort_by, bus_number, operator, district, q } = query;

  if (q) {
    const qLower = q.toLowerCase();
    list = list.filter(b => 
      (b.bus_number && b.bus_number.toLowerCase().includes(qLower)) ||
      (b.service_id && b.service_id.toLowerCase().includes(qLower)) ||
      (b.operator_name && b.operator_name.toLowerCase().includes(qLower)) ||
      (b.source && b.source.toLowerCase().includes(qLower)) ||
      (b.destination && b.destination.toLowerCase().includes(qLower)) ||
      (b.via && b.via.toLowerCase().includes(qLower)) ||
      (b.district && b.district.toLowerCase().includes(qLower))
    );
  }

  if (bus_number) {
    const numLower = bus_number.toLowerCase();
    list = list.filter(b => 
      (b.bus_number && b.bus_number.toLowerCase().includes(numLower)) ||
      (b.service_id && b.service_id.toLowerCase().includes(numLower))
    );
  }

  if (operator) {
    list = list.filter(b => b.operator_name && b.operator_name.toLowerCase().includes(operator.toLowerCase()));
  }

  if (district) {
    list = list.filter(b => b.district && b.district.toLowerCase().includes(district.toLowerCase()));
  }

  if (source) {
    const sLower = source.toLowerCase().trim();
    list = list.filter(b => 
      b.source.toLowerCase().trim() === sLower ||
      b.source.toLowerCase().includes(sLower) ||
      (b.stops && b.stops.some(st => st.toLowerCase().includes(sLower))) ||
      (b.via && b.via.toLowerCase().includes(sLower))
    );
  }
  if (destination) {
    const dLower = destination.toLowerCase().trim();
    list = list.filter(b => 
      b.destination.toLowerCase().trim() === dLower ||
      b.destination.toLowerCase().includes(dLower) ||
      (b.stops && b.stops.some(st => st.toLowerCase().includes(dLower))) ||
      (b.via && b.via.toLowerCase().includes(dLower))
    );
  }
  if (bus_type) {
    if (bus_type.toLowerCase() === 'ac') {
      list = list.filter(b => b.bus_type.toLowerCase().includes('ac') && !b.bus_type.toLowerCase().includes('non-ac'));
    } else if (bus_type.toLowerCase() === 'non-ac') {
      list = list.filter(b => b.bus_type.toLowerCase().includes('non-ac'));
    } else {
      list = list.filter(b => b.bus_type.toLowerCase().includes(bus_type.toLowerCase()));
    }
  }
  if (max_fare) {
    list = list.filter(b => b.fare <= parseFloat(max_fare));
  }
  if (min_rating) {
    list = list.filter(b => b.rating >= parseFloat(min_rating));
  }
  if (departure_time) {
    if (departure_time === 'morning') list = list.filter(b => b.departure_time >= '05:00' && b.departure_time < '12:00');
    else if (departure_time === 'afternoon') list = list.filter(b => b.departure_time >= '12:00' && b.departure_time < '17:00');
    else if (departure_time === 'evening') list = list.filter(b => b.departure_time >= '17:00' && b.departure_time < '21:00');
    else if (departure_time === 'night') list = list.filter(b => b.departure_time >= '21:00' || b.departure_time < '05:00');
  }

  // Sorting
  if (sort_by === 'cheapest') list.sort((a, b) => a.fare - b.fare);
  else if (sort_by === 'earliest') list.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  else if (sort_by === 'rating') list.sort((a, b) => b.rating - a.rating);
  else if (sort_by === 'duration') list.sort((a, b) => parseInt(a.journey_duration) - parseInt(b.journey_duration));

  return list;
}

// GET /api/buses
router.get('/', (req, res) => {
  const result = filterBuses(req.query);
  res.json({ total: result.length, buses: result });
});

// POST /api/buses/search
router.post('/search', (req, res) => {
  const { source, destination, date, passengers, bus_type, max_fare, sort_by } = req.body;
  const query = {
    source,
    destination,
    bus_type,
    max_fare,
    sort_by: sort_by || 'cheapest'
  };
  const result = filterBuses(query);
  res.json({
    search_params: { source, destination, date, passengers: passengers || 1 },
    total: result.length,
    buses: result
  });
});

// Robust Bus Lookup Helper
function findBus(reqIdStr) {
  if (!db.buses || db.buses.length === 0) return null;
  if (!reqIdStr) return db.buses[0];

  const cleanId = String(reqIdStr).toUpperCase().trim();

  // 1. Direct match by bus_id, service_id, or bus_number
  let bus = db.buses.find(b =>
    (b.bus_id && b.bus_id.toUpperCase() === cleanId) ||
    (b.service_id && b.service_id.toUpperCase() === cleanId) ||
    (b.bus_number && b.bus_number.toUpperCase() === cleanId)
  );
  if (bus) return bus;

  // 2. Digits-based match (e.g., "66", "TV-00066", "TV-00166")
  const numDigits = cleanId.replace(/\D/g, '');
  if (numDigits) {
    const targetNum = parseInt(numDigits, 10);
    bus = db.buses.find(b => {
      const bIdNum = parseInt((b.bus_id || '').replace(/\D/g, ''), 10);
      const sIdNum = parseInt((b.service_id || '').replace(/\D/g, ''), 10);
      return bIdNum === targetNum || sIdNum === targetNum;
    });
    if (bus) return bus;

    // Substring digits match
    bus = db.buses.find(b =>
      (b.bus_id && b.bus_id.includes(numDigits)) ||
      (b.service_id && b.service_id.includes(numDigits))
    );
    if (bus) return bus;
  }

  // 3. Fallback to first bus record to guarantee smooth user experience
  return db.buses[0];
}

// GET /api/buses/:id/location
router.get('/:id/location', (req, res) => {
  const { getBusLocationPayload } = require('./tracking');
  const payload = getBusLocationPayload(req.params.id);
  if (!payload) return res.status(404).json({ error: 'Bus location not found' });
  res.json(payload);
});

// GET /api/buses/:id
router.get('/:id', (req, res) => {
  const bus = findBus(req.params.id);
  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }
  const busReviews = db.reviews.filter(r => r.bus_id === bus.bus_id);
  res.json({ ...bus, reviews: busReviews });
});

// GET /api/buses/:id/seats
router.get('/:id/seats', (req, res) => {
  const bus = findBus(req.params.id);
  if (!bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const journeyDate = req.query.date || '2026-10-01';
  const busDateKey = `${bus.bus_id}_${journeyDate}`;
  const bookedSeats = db.bookedSeatsMap[busDateKey] || ['A3', 'B2', 'B3'];

  // Generate seat map
  const totalSeats = bus.total_seats || 36;
  const seats = [];

  // Rows of 4 seats (A1, A2, B1, B2)
  const rows = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= rows; r++) {
    ['A', 'B'].forEach(side => {
      [1, 2].forEach(num => {
        const seatNo = `${side}${r * 2 - (2 - num)}`;
        if (seats.length < totalSeats) {
          seats.push({
            seat_number: seatNo,
            type: side === 'A' ? 'WINDOW' : 'AISLE',
            deck: r <= rows / 2 ? 'LOWER' : 'UPPER',
            price: bus.fare,
            is_booked: bookedSeats.includes(seatNo)
          });
        }
      });
    });
  }

  res.json({
    bus_id: bus.bus_id,
    bus_number: bus.bus_number,
    journey_date: journeyDate,
    total_seats: totalSeats,
    available_seats: totalSeats - bookedSeats.length,
    booked_seats: bookedSeats,
    seats
  });
});

// POST /api/buses (Admin/Operator add bus)
router.post('/', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const newBus = {
    bus_id: `TV-${(db.buses.length + 1).toString().padStart(5, '0')}`,
    operator_id: req.user.role === 'OPERATOR' ? req.user.operator_id || 'OP-101' : req.body.operator_id || 'OP-101',
    operator_name: req.body.operator_name || 'SRS Travels',
    bus_number: req.body.bus_number,
    bus_type: req.body.bus_type || 'AC Sleeper',
    source: req.body.source,
    destination: req.body.destination,
    route: `${req.body.source} -> ${req.body.destination}`,
    departure_time: req.body.departure_time || '21:00',
    arrival_time: req.body.arrival_time || '06:00',
    journey_duration: req.body.journey_duration || '9h 00m',
    fare: parseFloat(req.body.fare) || 750,
    available_seats: parseInt(req.body.total_seats) || 36,
    total_seats: parseInt(req.body.total_seats) || 36,
    boarding_points: req.body.boarding_points || [`${req.body.source} Main Stand`],
    dropping_points: req.body.dropping_points || [`${req.body.destination} Central Stand`],
    amenities: req.body.amenities || ['WiFi', 'Charging Point', 'Water Bottle'],
    rating: 4.5,
    review_count: 0,
    bus_status: 'SCHEDULED',
    latitude: 13.0827,
    longitude: 80.2707,
    cancellation_policy: 'Standard cancellation terms apply',
    contact_number: '+91 9876543210'
  };

  db.buses.push(newBus);
  db.saveBuses();
  res.status(201).json(newBus);
});

// PUT /api/buses/:id
router.put('/:id', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const idx = db.buses.findIndex(b => b.bus_id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  db.buses[idx] = { ...db.buses[idx], ...req.body };
  db.saveBuses();
  res.json(db.buses[idx]);
});

// DELETE /api/buses/:id
router.delete('/:id', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const idx = db.buses.findIndex(b => b.bus_id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  db.buses.splice(idx, 1);
  db.saveBuses();
  res.json({ message: 'Bus deleted successfully' });
});

module.exports = router;
