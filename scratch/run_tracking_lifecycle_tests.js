// scratch/run_tracking_lifecycle_tests.js
const fs = require('fs');
const path = require('path');
const db = require('../backend/models/db');
const { getBusLocationPayload } = require('../backend/routes/tracking');

const results = [];

function record(testId, category, description, expected, actual, passed, details = '') {
  results.push({
    id: testId,
    category,
    description,
    expected,
    actual,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  console.log(`${passed ? '[PASS]' : '[FAIL]'} #${testId} [${category}] ${description} -> ${actual}`);
}

console.log('='.repeat(70));
console.log('RUNNING BOOKING & TRACKING LIFECYCLE TESTS');
console.log('='.repeat(70));

// TEST 1: Non-existent bus ID returns null (NO fallback to db.buses[0])
const nonExistentPayload = getBusLocationPayload('NON-EXISTENT-BUS-99999');
const p1Passed = (nonExistentPayload === null);
record(
  'T29',
  'Bus Tracking Lookup',
  'Non-existent bus lookup returns null (no fallback to db.buses[0])',
  'null',
  nonExistentPayload ? `Fallback to ${nonExistentPayload.bus_id}` : 'null',
  p1Passed
);

// TEST 2: Existing bus lookup retrieves correct bus
const validBus = db.buses[0];
const validPayload = getBusLocationPayload(validBus.bus_id);
const p2Passed = Boolean(validPayload && validPayload.bus_id === validBus.bus_id);
record(
  'T30',
  'Bus Tracking Lookup',
  `Valid bus lookup for ${validBus.bus_id}`,
  validBus.bus_id,
  validPayload ? validPayload.bus_id : 'null',
  p2Passed
);

// TEST 3: Simulation labeling and transparency (Requirement 19)
const p3Passed = Boolean(
  validPayload &&
  validPayload.is_simulated === true &&
  validPayload.tracking_type === 'Simulated Tracking' &&
  validPayload.tracking_disclaimer
);
record(
  'T31',
  'Simulated Tracking Transparency',
  'Payload is explicitly flagged as Simulated Tracking with disclaimer',
  'is_simulated=true, tracking_type=Simulated Tracking',
  `is_simulated=${validPayload?.is_simulated}, type=${validPayload?.tracking_type}`,
  p3Passed
);

// TEST 4: Separation of Booking Status from Journey Status (Requirement 16)
// Create a mock confirmed booking with journey date in the future
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 5);
const futureDateStr = futureDate.toISOString().split('T')[0];

const testBookingId = `TEST-BK-FUTURE-${Date.now()}`;
const mockFutureBooking = {
  booking_id: testBookingId,
  ticket_number: `TKT-${Date.now()}`,
  user_id: 'TEST_USER',
  bus_id: validBus.bus_id,
  bus_number: validBus.bus_number,
  operator_name: validBus.operator_name,
  source: validBus.source,
  destination: validBus.destination,
  journey_date: futureDateStr,
  departure_time: '20:00',
  arrival_time: '04:00',
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(mockFutureBooking);

const futurePayload = getBusLocationPayload(validBus.bus_id, testBookingId);
const p4Passed = Boolean(
  futurePayload &&
  futurePayload.booking_status === 'CONFIRMED' &&
  futurePayload.bus_status === 'UPCOMING' &&
  futurePayload.current_location.speed_kmh === 0 &&
  futurePayload.waypoints.every(wp => wp.passed === false)
);
record(
  'T32',
  'Booking / Journey Status Separation',
  'Confirmed booking for future trip does NOT start journey or mark stops passed',
  'booking_status=CONFIRMED, bus_status=UPCOMING, speed=0, passed stops=0',
  `booking=${futurePayload?.booking_status}, journey=${futurePayload?.bus_status}, speed=${futurePayload?.current_location?.speed_kmh}, passed=${futurePayload?.waypoints?.filter(w => w.passed).length}`,
  p4Passed
);

// TEST 5: Cancelled Booking Handling (Requirement 17)
mockFutureBooking.booking_status = 'CANCELLED';
const cancelledPayload = getBusLocationPayload(validBus.bus_id, testBookingId);
const p5Passed = Boolean(
  cancelledPayload &&
  cancelledPayload.booking_status === 'CANCELLED' &&
  cancelledPayload.bus_status === 'CANCELLED' &&
  cancelledPayload.status_message.includes('cancelled')
);
record(
  'T33',
  'Cancelled Booking Tracking',
  'Cancelled booking shows CANCELLED status and tracking unavailable message',
  'booking_status=CANCELLED, bus_status=CANCELLED',
  `booking=${cancelledPayload?.booking_status}, journey=${cancelledPayload?.bus_status}`,
  p5Passed
);

// Clean up mock booking
db.bookings = db.bookings.filter(b => b.booking_id !== testBookingId);

// TEST 6: Timetable-driven in-transit simulation
// Create a mock active booking whose departure is 1 hour ago and arrival is 4 hours from now
const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const pastH = String(Math.max(0, now.getHours() - 1)).padStart(2, '0');
const futureH = String(Math.min(23, now.getHours() + 4)).padStart(2, '0');

const activeBookingId = `TEST-BK-ACTIVE-${Date.now()}`;
const mockActiveBooking = {
  booking_id: activeBookingId,
  ticket_number: `TKT-ACT-${Date.now()}`,
  user_id: 'TEST_USER',
  bus_id: validBus.bus_id,
  bus_number: validBus.bus_number,
  operator_name: validBus.operator_name,
  source: validBus.source,
  destination: validBus.destination,
  journey_date: todayStr,
  departure_time: `${pastH}:00`,
  arrival_time: `${futureH}:00`,
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(mockActiveBooking);

const activePayload = getBusLocationPayload(validBus.bus_id, activeBookingId);
const p6Passed = Boolean(
  activePayload &&
  activePayload.bus_status === 'IN_TRANSIT' &&
  activePayload.current_location.speed_kmh > 0 &&
  activePayload.waypoints[0].passed === true &&
  activePayload.waypoints[2].passed === false
);
record(
  'T34',
  'Journey Lifecycle (In Transit)',
  'Active trip past departure time is IN_TRANSIT with speed > 0 and source stop passed',
  'bus_status=IN_TRANSIT, speed > 0, stop 0 passed, stop 2 not passed',
  `status=${activePayload?.bus_status}, speed=${activePayload?.current_location?.speed_kmh}, wp0=${activePayload?.waypoints[0]?.passed}, wp2=${activePayload?.waypoints[2]?.passed}`,
  p6Passed
);

// Clean up active mock booking
db.bookings = db.bookings.filter(b => b.booking_id !== activeBookingId);

console.log('='.repeat(70));
const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const failed = total - passed;
console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(70));

fs.writeFileSync(
  path.join(__dirname, 'tracking_test_results.json'),
  JSON.stringify(results, null, 2),
  'utf-8'
);

if (failed > 0) process.exit(1);
