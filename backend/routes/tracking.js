const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Complete gazetteer of city coordinates across India for realistic route simulation
const CITY_COORDINATES = {
  // Tamil Nadu
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Madurai": { lat: 9.9252, lng: 78.1198 },
  "Tiruchirappalli": { lat: 10.7905, lng: 78.7047 },
  "Trichy": { lat: 10.7905, lng: 78.7047 },
  "Salem": { lat: 11.6643, lng: 78.1460 },
  "Tiruppur": { lat: 11.1085, lng: 77.3411 },
  "Erode": { lat: 11.3410, lng: 77.7172 },
  "Ooty": { lat: 11.4102, lng: 76.6950 },
  "Vellore": { lat: 12.9165, lng: 79.1325 },
  "Thanjavur": { lat: 10.7870, lng: 79.1378 },
  "Tirunelveli": { lat: 8.7139, lng: 77.7567 },
  "Thoothukudi": { lat: 8.7642, lng: 78.1348 },
  "Dindigul": { lat: 10.3673, lng: 77.9803 },
  "Karur": { lat: 10.9601, lng: 78.0766 },
  "Namakkal": { lat: 11.2189, lng: 78.1674 },
  "Cuddalore": { lat: 11.7480, lng: 79.7714 },
  "Villupuram": { lat: 11.9401, lng: 79.4861 },
  "Kanchipuram": { lat: 12.8342, lng: 79.7036 },
  "Chengalpattu": { lat: 12.6819, lng: 79.9888 },
  "Hosur": { lat: 12.7409, lng: 77.8253 },
  "Rameswaram": { lat: 9.2876, lng: 79.3129 },
  "Kanyakumari": { lat: 8.0883, lng: 77.5385 },
  "Avinashi": { lat: 11.1932, lng: 77.2694 },
  // Karnataka
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Bengaluru": { lat: 12.9716, lng: 77.5946 },
  "Mysore": { lat: 12.2958, lng: 76.6394 },
  "Mangalore": { lat: 12.9141, lng: 74.8560 },
  "Hubli": { lat: 15.3647, lng: 75.1240 },
  "Belgaum": { lat: 15.8497, lng: 74.4977 },
  "Udupi": { lat: 13.3409, lng: 74.7421 },
  // Kerala
  "Thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "Trivandrum": { lat: 8.5241, lng: 76.9366 },
  "Kochi": { lat: 9.9312, lng: 76.2673 },
  "Kozhikode": { lat: 11.2588, lng: 75.7804 },
  "Thrissur": { lat: 10.5276, lng: 76.2144 },
  "Palakkad": { lat: 10.7867, lng: 76.6548 },
  "Munnar": { lat: 10.0889, lng: 77.0595 },
  // Telangana & Andhra Pradesh
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Warangal": { lat: 17.9689, lng: 79.5941 },
  "Vijayawada": { lat: 16.5062, lng: 80.6480 },
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Tirupati": { lat: 13.6288, lng: 79.4192 },
  "Guntur": { lat: 16.3067, lng: 80.4365 },
  // Maharashtra & Goa
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Nagpur": { lat: 21.1458, lng: 79.0882 },
  "Nashik": { lat: 20.0059, lng: 73.7898 },
  "Shirdi": { lat: 19.7645, lng: 74.4762 },
  "Panaji": { lat: 15.4909, lng: 73.8278 },
  "Goa": { lat: 15.2993, lng: 74.1240 },
  // Delhi & North
  "Delhi": { lat: 28.6139, lng: 77.2090 },
  "New Delhi": { lat: 28.6139, lng: 77.2090 },
  "Gurgaon": { lat: 28.4595, lng: 77.0266 },
  "Noida": { lat: 28.5355, lng: 77.3910 },
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Udaipur": { lat: 24.5854, lng: 73.7125 },
  "Jodhpur": { lat: 26.2389, lng: 73.0243 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 }
};

function getCityCoords(cityName, defaultLat = null, defaultLng = null) {
  if (!cityName) return { lat: defaultLat, lng: defaultLng };
  const clean = String(cityName).trim();
  for (const [k, v] of Object.entries(CITY_COORDINATES)) {
    if (k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(clean.toLowerCase())) {
      return v;
    }
  }
  return { lat: defaultLat, lng: defaultLng };
}

function getBusLocationPayload(reqBusId, bookingId = null) {
  if (!db.buses || db.buses.length === 0) return null;

  let bus = null;
  let booking = null;

  // 1. If bookingId provided, look up booking first
  if (bookingId) {
    booking = db.bookings.find(b => b.booking_id === bookingId || b.ticket_number === bookingId);
    if (booking) {
      bus = db.buses.find(b => b.bus_id === booking.bus_id);
    }
  }

  // 2. If bus not found from booking, search by requested ID/number
  if (!bus && reqBusId) {
    const cleanId = String(reqBusId).toUpperCase().trim();
    bus = db.buses.find(b =>
      (b.bus_id && b.bus_id.toUpperCase() === cleanId) ||
      (b.service_id && b.service_id.toUpperCase() === cleanId) ||
      (b.bus_number && b.bus_number.toUpperCase() === cleanId)
    );

    if (!bus) {
      const numDigits = cleanId.replace(/\D/g, '');
      if (numDigits) {
        const targetNum = parseInt(numDigits, 10);
        bus = db.buses.find(b => {
          const bIdNum = parseInt((b.bus_id || '').replace(/\D/g, ''), 10);
          const sIdNum = parseInt((b.service_id || '').replace(/\D/g, ''), 10);
          return bIdNum === targetNum || sIdNum === targetNum;
        });
      }
    }
  }

  // If bus still not found, return null (NEVER fallback to db.buses[0])
  if (!bus) {
    return null;
  }

  // Determine realistic source and destination coordinates
  const srcCoords = (bus.src_latitude && bus.src_longitude)
    ? { lat: bus.src_latitude, lng: bus.src_longitude }
    : (bus.latitude && bus.longitude)
      ? { lat: bus.latitude, lng: bus.longitude }
      : getCityCoords(bus.source, 13.0827, 80.2707);

  const dstCoords = (bus.dst_latitude && bus.dst_longitude)
    ? { lat: bus.dst_latitude, lng: bus.dst_longitude }
    : getCityCoords(bus.destination, srcCoords.lat + 1.5, srcCoords.lng - 2.0);

  const srcLat = srcCoords.lat;
  const srcLng = srcCoords.lng;
  const dstLat = dstCoords.lat;
  const dstLng = dstCoords.lng;

  const totalDistance = bus.distance_km || Math.round(Math.hypot((dstLat - srcLat) * 111, (dstLng - srcLng) * 111)) || 340;

  // Helper to build realistic waypoints for any bus route
  const buildWaypoints = (status, progressFraction = 0) => {
    if (Array.isArray(bus.stops) && bus.stops.length >= 2) {
      const n = bus.stops.length;
      return bus.stops.map((stopName, idx) => {
        const frac = idx / (n - 1);
        const sc = getCityCoords(stopName, null, null);
        const wLat = sc.lat !== null ? sc.lat : parseFloat((srcLat + (dstLat - srcLat) * frac).toFixed(4));
        const wLng = sc.lng !== null ? sc.lng : parseFloat((srcLng + (dstLng - srcLng) * frac).toFixed(4));
        let passed = false;
        if (status === 'ARRIVED') passed = true;
        else if (status === 'IN_TRANSIT') passed = frac <= progressFraction;
        return {
          name: stopName,
          lat: wLat,
          lng: wLng,
          passed
        };
      });
    }
    return [
      { name: `${bus.source} Main Depot`, lat: srcLat, lng: srcLng, passed: status === 'ARRIVED' || (status === 'IN_TRANSIT' && progressFraction >= 0.05) },
      { name: `${bus.source} - ${bus.destination} Highway Plaza`, lat: (srcLat + dstLat) / 2, lng: (srcLng + dstLng) / 2, passed: status === 'ARRIVED' || (status === 'IN_TRANSIT' && progressFraction >= 0.5) },
      { name: `${bus.destination} Central Stand`, lat: dstLat, lng: dstLng, passed: status === 'ARRIVED' }
    ];
  };

  // Handle cancelled booking
  if (booking && booking.booking_status === 'CANCELLED') {
    return {
      bus_id: bus.bus_id,
      bus_number: bus.bus_number,
      operator_name: bus.operator_name || bus.operator,
      source: bus.source,
      destination: bus.destination,
      has_active_booking: false,
      booking_id: booking.booking_id,
      booking_status: 'CANCELLED',
      bus_status: 'CANCELLED',
      journey_status: 'CANCELLED',
      status_message: 'Your booking has been cancelled. Live tracking is unavailable.',
      current_location: {
        latitude: srcLat,
        longitude: srcLng,
        speed_kmh: 0,
        last_updated: new Date().toISOString()
      },
      source_location: { latitude: srcLat, longitude: srcLng, label: bus.source },
      destination_location: { latitude: dstLat, longitude: dstLng, label: bus.destination },
      waypoints: buildWaypoints('CANCELLED', 0),
      eta_minutes: null,
      distance_remaining_km: null,
      is_simulated: true,
      tracking_type: 'Simulated Tracking',
      tracking_mode: 'Simulated Route Timetable Tracking',
      tracking_disclaimer: 'This tracking view uses simulated timetable telematics based on scheduled route departure and arrival times.'
    };
  }

  // Determine schedule parameters (in local application timezone)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const journeyDateStr = (booking && booking.journey_date) ? booking.journey_date : todayStr;
  const depTimeStr = (booking && booking.departure_time) || bus.departure_time || '20:00';
  const arrTimeStr = (booking && booking.arrival_time) || bus.arrival_time || '06:00';

  const [depH, depM] = depTimeStr.split(':').map(Number);
  const [arrH, arrM] = arrTimeStr.split(':').map(Number);
  const [jYear, jMonth, jDay] = journeyDateStr.split('-').map(Number);

  const depDate = new Date(jYear, jMonth - 1, jDay, depH || 0, depM || 0, 0);
  let arrDate = new Date(jYear, jMonth - 1, jDay, arrH || 0, arrM || 0, 0);
  if ((arrH || 0) < (depH || 0)) {
    arrDate.setDate(arrDate.getDate() + 1);
  }

  const diffToDepMs = depDate.getTime() - now.getTime();
  const diffToArrMs = arrDate.getTime() - now.getTime();
  const totalDurationMs = Math.max(60000, arrDate.getTime() - depDate.getTime());

  let journeyStatus = 'UPCOMING';
  let speedKmh = 0;
  let curLat = srcLat;
  let curLng = srcLng;
  let etaMinutes = Math.round(totalDurationMs / 60000);
  let distanceRemaining = totalDistance;
  let statusMsg = `Scheduled departure at ${depTimeStr} on ${journeyDateStr}. Bus is stationed at ${bus.source} depot.`;
  let currentProgress = 0;

  // Lifecycle state machine based on schedule
  if (bus.bus_status === 'CANCELLED') {
    journeyStatus = 'CANCELLED';
    speedKmh = 0;
    statusMsg = `Service cancelled by operator. Please contact support.`;
  } else if (diffToDepMs > 30 * 60 * 1000) {
    // 1. UPCOMING: More than 30 mins before departure
    journeyStatus = 'UPCOMING';
    speedKmh = 0;
    curLat = srcLat;
    curLng = srcLng;
    etaMinutes = Math.round(totalDurationMs / 60000);
    distanceRemaining = totalDistance;
    statusMsg = `Scheduled departure at ${depTimeStr}. Bus is stationed at ${bus.source} depot.`;
    currentProgress = 0;
  } else if (diffToDepMs > 0 && diffToDepMs <= 30 * 60 * 1000) {
    // 2. BOARDING: Within 30 mins before departure
    journeyStatus = 'BOARDING';
    speedKmh = 0;
    curLat = srcLat;
    curLng = srcLng;
    etaMinutes = Math.round(totalDurationMs / 60000);
    distanceRemaining = totalDistance;
    const minsLeft = Math.ceil(diffToDepMs / 60000);
    statusMsg = `Boarding starts soon at ${bus.source} platform (${minsLeft} mins to departure).`;
    currentProgress = 0;
  } else if (diffToDepMs <= 0 && diffToArrMs > 0) {
    // 3. IN_TRANSIT: Between departure and arrival
    journeyStatus = 'IN_TRANSIT';
    let progress = (now.getTime() - depDate.getTime()) / totalDurationMs;
    progress = Math.max(0.02, Math.min(0.98, progress));
    currentProgress = progress;

    speedKmh = Math.floor(58 + Math.sin(now.getTime() / 4000) * 8);
    curLat = parseFloat((srcLat + (dstLat - srcLat) * progress).toFixed(4));
    curLng = parseFloat((srcLng + (dstLng - srcLng) * progress).toFixed(4));
    etaMinutes = Math.max(5, Math.round(diffToArrMs / 60000));
    distanceRemaining = Math.max(5, Math.round(totalDistance * (1 - progress)));
    statusMsg = `Bus is in transit to ${bus.destination} (ETA ${etaMinutes} mins).`;
  } else {
    // 4. ARRIVED: After scheduled arrival time
    journeyStatus = 'ARRIVED';
    speedKmh = 0;
    curLat = dstLat;
    curLng = dstLng;
    etaMinutes = 0;
    distanceRemaining = 0;
    statusMsg = `Bus arrived at ${bus.destination} Central Stand.`;
    currentProgress = 1.0;
  }

  // Preserve operator delay note if present
  if (bus.bus_status && bus.bus_status.startsWith('DELAYED')) {
    statusMsg = `${bus.bus_status} - ${statusMsg}`;
  }

  const hasActiveBooking = Boolean(booking && booking.booking_status === 'CONFIRMED');

  return {
    bus_id: bus.bus_id,
    bus_number: bus.bus_number,
    operator_name: bus.operator_name || bus.operator,
    source: bus.source,
    destination: bus.destination,
    has_active_booking: hasActiveBooking,
    booking_id: booking ? booking.booking_id : null,
    booking_status: booking ? booking.booking_status : null,
    bus_status: journeyStatus,
    journey_status: journeyStatus,
    status_message: statusMsg,
    current_location: {
      latitude: curLat,
      longitude: curLng,
      speed_kmh: speedKmh,
      last_updated: now.toISOString()
    },
    source_location: { latitude: srcLat, longitude: srcLng, label: bus.source },
    destination_location: { latitude: dstLat, longitude: dstLng, label: bus.destination },
    waypoints: buildWaypoints(journeyStatus, currentProgress),
    eta_minutes: etaMinutes,
    distance_remaining_km: distanceRemaining,
    is_simulated: true,
    tracking_type: 'Simulated Tracking',
    tracking_mode: 'Simulated Route Timetable Tracking',
    tracking_disclaimer: 'This tracking view uses simulated timetable telematics based on scheduled route departure and arrival times.'
  };
}

// GET /api/tracking/:id/location
router.get('/:id/location', (req, res) => {
  const bookingId = req.query.booking_id || null;
  const payload = getBusLocationPayload(req.params.id, bookingId);
  if (!payload) return res.status(404).json({ error: 'Bus not found' });
  res.json(payload);
});

// GET /api/tracking/:id
router.get('/:id', (req, res) => {
  const bookingId = req.query.booking_id || null;
  const payload = getBusLocationPayload(req.params.id, bookingId);
  if (!payload) return res.status(404).json({ error: 'Bus not found' });
  res.json(payload);
});

// PUT /api/tracking/:id/location (Update bus location & status)
router.put('/:id/location', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const reqId = (req.params.id || '').toUpperCase().trim();
  const bus = db.buses.find(b =>
    (b.bus_id && b.bus_id.toUpperCase() === reqId) ||
    (b.service_id && b.service_id.toUpperCase() === reqId) ||
    (b.bus_number && b.bus_number.toUpperCase() === reqId)
  );

  if (!bus) {
    return res.status(404).json({ error: `Bus not found for ID or number: ${req.params.id}` });
  }

  // Check operator assignment if user role is OPERATOR
  if (req.user.role === 'OPERATOR') {
    const userOpId = req.user.operator_id;
    const userOpObj = db.operators.find(o => o.operator_id === userOpId || o.email === req.user.email);
    const opName = userOpObj ? userOpObj.operator_name.toLowerCase() : (req.user.name || '').toLowerCase();

    const busOpName = (bus.operator_name || bus.operator || '').toLowerCase();
    const isOwner = (bus.operator_id && bus.operator_id === userOpId) ||
                    (opName && busOpName.includes(opName)) ||
                    (busOpName && opName.includes(busOpName));

    if (!isOwner) {
      return res.status(403).json({
        error: `Unauthorized: You are registered as operator '${userOpObj ? userOpObj.operator_name : (req.user.name || req.user.email)}' and cannot modify bus '${bus.bus_id || bus.service_id}' owned by '${bus.operator_name || bus.operator}'.`
      });
    }
  }

  const { latitude, longitude, speed, status } = req.body;

  if (
    (latitude === undefined || latitude === null || latitude === '') &&
    (longitude === undefined || longitude === null || longitude === '') &&
    (status === undefined || status === null || status === '')
  ) {
    return res.status(400).json({ error: 'Please provide at least one valid field to update (latitude, longitude, or status).' });
  }

  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: 'Invalid latitude value. Latitude must be a number between -90 and 90 degrees.' });
    }
    bus.latitude = lat;
    bus.src_latitude = lat;
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid longitude value. Longitude must be a number between -180 and 180 degrees.' });
    }
    bus.longitude = lng;
    bus.src_longitude = lng;
  }

  const VALID_STATUSES = [
    'ON TIME',
    'DELAYED 15 MIN',
    'DELAYED 30 MIN',
    'DELAYED 45 MIN',
    'EN ROUTE',
    'COMPLETED',
    'AT_SOURCE',
    'IN_TRANSIT',
    'CANCELLED'
  ];

  if (status !== undefined && status !== null && status !== '') {
    const statusUpper = String(status).trim().toUpperCase();
    if (!VALID_STATUSES.includes(statusUpper)) {
      return res.status(400).json({
        error: `Invalid bus status '${status}'. Status must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }
    bus.bus_status = statusUpper;
  }

  db.saveBuses();
  res.json({
    message: 'GPS location and bus status updated successfully.',
    bus_id: bus.bus_id,
    bus_number: bus.bus_number,
    operator_name: bus.operator_name || bus.operator,
    latitude: bus.latitude,
    longitude: bus.longitude,
    bus_status: bus.bus_status
  });
});

module.exports = { router, getBusLocationPayload };
