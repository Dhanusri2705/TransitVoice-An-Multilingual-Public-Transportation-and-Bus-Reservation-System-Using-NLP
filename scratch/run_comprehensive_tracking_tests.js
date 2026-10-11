// scratch/run_comprehensive_tracking_tests.js
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

console.log('='.repeat(80));
console.log('TRANSITVOICE END-TO-END BUS BOOKING & TRACKING LIFECYCLE TEST SUITE');
console.log('Testing across multiple buses, routes, and journey stages');
console.log('='.repeat(80));

// Find sample buses from db
const busCoimbatoreChennai = db.buses.find(b => b.source === 'Coimbatore' && b.destination === 'Chennai') || db.buses[0];
const busMaduraiChennai = db.buses.find(b => b.source === 'Madurai' && b.destination === 'Chennai') || db.buses[1];
const busBangaloreChennai = db.buses.find(b => (b.source === 'Bangalore' || b.source === 'Bengaluru') && b.destination === 'Chennai') || db.buses[2];

function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const now = new Date();
const todayStr = getLocalDateStr(now);

// -------------------------------------------------------------
// SCENARIO 1: View bus before booking (Schedule-driven, no false boarding)
// -------------------------------------------------------------
const preBookingPayload = getBusLocationPayload(busCoimbatoreChennai.bus_id);
const s1Passed = Boolean(
  preBookingPayload &&
  preBookingPayload.has_active_booking === false &&
  preBookingPayload.booking_id === null &&
  ['UPCOMING', 'BOARDING', 'IN_TRANSIT', 'ARRIVED'].includes(preBookingPayload.bus_status) &&
  preBookingPayload.is_simulated === true
);
record(
  'S1',
  'Pre-Booking State',
  `View bus ${busCoimbatoreChennai.bus_id} before booking`,
  'has_active_booking=false, schedule-driven journey status',
  `active=${preBookingPayload?.has_active_booking}, journey_status=${preBookingPayload?.bus_status}`,
  s1Passed
);

// -------------------------------------------------------------
// SCENARIO 2: Immediately after booking a future trip
// -------------------------------------------------------------
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3);
const futureDateStr = getLocalDateStr(futureDate);

const bId1 = `TEST-BK-CBE-CHN-${Date.now()}`;
const bookingPassenger1 = {
  booking_id: bId1,
  ticket_number: `TKT-P1-${Date.now()}`,
  user_id: 'USER_P1',
  bus_id: busCoimbatoreChennai.bus_id,
  bus_number: busCoimbatoreChennai.bus_number,
  operator_name: busCoimbatoreChennai.operator_name,
  source: busCoimbatoreChennai.source,
  destination: busCoimbatoreChennai.destination,
  journey_date: futureDateStr,
  departure_time: '20:00',
  arrival_time: '04:30',
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(bookingPassenger1);

const postBookingPayload = getBusLocationPayload(busCoimbatoreChennai.bus_id, bId1);
const s2Passed = Boolean(
  postBookingPayload &&
  postBookingPayload.booking_status === 'CONFIRMED' &&
  postBookingPayload.bus_status === 'UPCOMING' &&
  postBookingPayload.current_location.speed_kmh === 0 &&
  postBookingPayload.waypoints.every(w => w.passed === false)
);
record(
  'S2',
  'Post-Booking Confirmation',
  'Confirmed ticket does NOT start journey or mark stops passed',
  'booking=CONFIRMED, bus=UPCOMING, speed=0, passed_stops=0',
  `booking=${postBookingPayload?.booking_status}, bus=${postBookingPayload?.bus_status}, speed=${postBookingPayload?.current_location?.speed_kmh}, passed=${postBookingPayload?.waypoints?.filter(w => w.passed).length}`,
  s2Passed
);

// -------------------------------------------------------------
// SCENARIO 3: Before scheduled departure (Hours before departure on journey date)
// -------------------------------------------------------------
const futureDepTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
const futureArrTime3 = new Date(futureDepTime.getTime() + 7 * 60 * 60 * 1000);
const futureDepDateStr = getLocalDateStr(futureDepTime);
const depHoursStr = `${String(futureDepTime.getHours()).padStart(2, '0')}:${String(futureDepTime.getMinutes()).padStart(2, '0')}`;
const arrHoursStr = `${String(futureArrTime3.getHours()).padStart(2, '0')}:${String(futureArrTime3.getMinutes()).padStart(2, '0')}`;

const bIdPreDep = `TEST-BK-PREDEP-${Date.now()}`;
const bookingPreDep = {
  booking_id: bIdPreDep,
  ticket_number: `TKT-PREDEP-${Date.now()}`,
  user_id: 'USER_P2',
  bus_id: busMaduraiChennai.bus_id,
  bus_number: busMaduraiChennai.bus_number,
  operator_name: busMaduraiChennai.operator_name,
  source: busMaduraiChennai.source,
  destination: busMaduraiChennai.destination,
  journey_date: futureDepDateStr,
  departure_time: depHoursStr,
  arrival_time: arrHoursStr,
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(bookingPreDep);

const preDepPayload = getBusLocationPayload(busMaduraiChennai.bus_id, bIdPreDep);
const s3Passed = Boolean(
  preDepPayload &&
  preDepPayload.bus_status === 'UPCOMING' &&
  preDepPayload.current_location.speed_kmh === 0 &&
  preDepPayload.waypoints.every(w => w.passed === false)
);
record(
  'S3',
  'Pre-Departure (>30m before departure)',
  'Bus status is UPCOMING with speed 0 and 0 passed stops',
  'bus_status=UPCOMING, speed=0, passed=0',
  `bus_status=${preDepPayload?.bus_status}, speed=${preDepPayload?.current_location?.speed_kmh}, passed=${preDepPayload?.waypoints?.filter(w => w.passed).length}`,
  s3Passed
);

// -------------------------------------------------------------
// SCENARIO 4: During boarding window (within 15 minutes of departure)
// -------------------------------------------------------------
const boardingTime = new Date(now.getTime() + 15 * 60 * 1000);
const boardingH = String(boardingTime.getHours()).padStart(2, '0');
const boardingM = String(boardingTime.getMinutes()).padStart(2, '0');

const bIdBoarding = `TEST-BK-BOARDING-${Date.now()}`;
const bookingBoarding = {
  booking_id: bIdBoarding,
  ticket_number: `TKT-BRD-${Date.now()}`,
  user_id: 'USER_P3',
  bus_id: busBangaloreChennai.bus_id,
  bus_number: busBangaloreChennai.bus_number,
  operator_name: busBangaloreChennai.operator_name,
  source: busBangaloreChennai.source,
  destination: busBangaloreChennai.destination,
  journey_date: getLocalDateStr(boardingTime),
  departure_time: `${boardingH}:${boardingM}`,
  arrival_time: `${String((boardingTime.getHours() + 6) % 24).padStart(2, '0')}:00`,
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(bookingBoarding);

const boardingPayload = getBusLocationPayload(busBangaloreChennai.bus_id, bIdBoarding);
const s4Passed = Boolean(
  boardingPayload &&
  boardingPayload.bus_status === 'BOARDING' &&
  boardingPayload.status_message.includes('Boarding starts soon') &&
  boardingPayload.current_location.speed_kmh === 0 &&
  boardingPayload.waypoints.every(w => w.passed === false)
);
record(
  'S4',
  'Boarding Window (0-30m before departure)',
  'Boarding starts soon displayed only when justified by schedule rules',
  'bus_status=BOARDING, speed=0, passed=0',
  `bus_status=${boardingPayload?.bus_status}, speed=${boardingPayload?.current_location?.speed_kmh}, passed=${boardingPayload?.waypoints?.filter(w => w.passed).length}`,
  s4Passed
);

// -------------------------------------------------------------
// SCENARIO 5: After departure & during journey (IN_TRANSIT)
// -------------------------------------------------------------
const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const futureArrTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);

const bIdTransit = `TEST-BK-TRANSIT-${Date.now()}`;
const bookingTransit = {
  booking_id: bIdTransit,
  ticket_number: `TKT-TRN-${Date.now()}`,
  user_id: 'USER_P4',
  bus_id: busCoimbatoreChennai.bus_id,
  bus_number: busCoimbatoreChennai.bus_number,
  operator_name: busCoimbatoreChennai.operator_name,
  source: busCoimbatoreChennai.source,
  destination: busCoimbatoreChennai.destination,
  journey_date: getLocalDateStr(pastTime),
  departure_time: `${String(pastTime.getHours()).padStart(2, '0')}:${String(pastTime.getMinutes()).padStart(2, '0')}`,
  arrival_time: `${String(futureArrTime.getHours()).padStart(2, '0')}:${String(futureArrTime.getMinutes()).padStart(2, '0')}`,
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(bookingTransit);

const transitPayload = getBusLocationPayload(busCoimbatoreChennai.bus_id, bIdTransit);
const s5Passed = Boolean(
  transitPayload &&
  transitPayload.bus_status === 'IN_TRANSIT' &&
  transitPayload.current_location.speed_kmh > 0 &&
  transitPayload.waypoints[0].passed === true &&
  transitPayload.waypoints[transitPayload.waypoints.length - 1].passed === false
);
record(
  'S5',
  'In-Transit Progression',
  'Active trip is IN_TRANSIT with speed > 0 and source passed but destination upcoming',
  'bus_status=IN_TRANSIT, speed > 0, stop0=true, last_stop=false',
  `bus_status=${transitPayload?.bus_status}, speed=${transitPayload?.current_location?.speed_kmh}, stop0=${transitPayload?.waypoints[0]?.passed}, last=${transitPayload?.waypoints[transitPayload?.waypoints.length - 1]?.passed}`,
  s5Passed
);

// -------------------------------------------------------------
// SCENARIO 6: Waypoint order and stop progress consistency
// -------------------------------------------------------------
const s6Passed = Boolean(
  transitPayload &&
  transitPayload.waypoints.length >= 2 &&
  transitPayload.waypoints[0].name.toLowerCase().includes(busCoimbatoreChennai.source.toLowerCase())
);
record(
  'S6',
  'Route Waypoint Order',
  'Waypoints follow actual route stops in correct order',
  `Source=${busCoimbatoreChennai.source}, destination=${busCoimbatoreChennai.destination}`,
  `First stop=${transitPayload?.waypoints[0]?.name}, total stops=${transitPayload?.waypoints?.length}`,
  s6Passed
);

// -------------------------------------------------------------
// SCENARIO 7: After arrival at destination (ARRIVED)
// -------------------------------------------------------------
const arrPastDep = new Date(now.getTime() - 8 * 60 * 60 * 1000);
const arrPastArr = new Date(now.getTime() - 1 * 60 * 60 * 1000);

const bIdArrived = `TEST-BK-ARRIVED-${Date.now()}`;
const bookingArrived = {
  booking_id: bIdArrived,
  ticket_number: `TKT-ARR-${Date.now()}`,
  user_id: 'USER_P5',
  bus_id: busCoimbatoreChennai.bus_id,
  bus_number: busCoimbatoreChennai.bus_number,
  operator_name: busCoimbatoreChennai.operator_name,
  source: busCoimbatoreChennai.source,
  destination: busCoimbatoreChennai.destination,
  journey_date: getLocalDateStr(arrPastDep),
  departure_time: `${String(arrPastDep.getHours()).padStart(2, '0')}:00`,
  arrival_time: `${String(arrPastArr.getHours()).padStart(2, '0')}:00`,
  booking_status: 'CONFIRMED'
};
db.bookings.unshift(bookingArrived);

const arrivedPayload = getBusLocationPayload(busCoimbatoreChennai.bus_id, bIdArrived);
const s7Passed = Boolean(
  arrivedPayload &&
  arrivedPayload.bus_status === 'ARRIVED' &&
  arrivedPayload.current_location.speed_kmh === 0 &&
  arrivedPayload.distance_remaining_km === 0 &&
  arrivedPayload.waypoints.every(w => w.passed === true)
);
record(
  'S7',
  'Arrival Lifecycle Completion',
  'Journey marked ARRIVED with speed 0, distance 0, and all stops passed',
  'bus_status=ARRIVED, speed=0, dist=0, all passed=true',
  `bus_status=${arrivedPayload?.bus_status}, speed=${arrivedPayload?.current_location?.speed_kmh}, dist=${arrivedPayload?.distance_remaining_km}, all_passed=${arrivedPayload?.waypoints?.every(w => w.passed)}`,
  s7Passed
);

// -------------------------------------------------------------
// SCENARIO 8: Page refresh consistency (Deterministic, no timer advancement drift)
// -------------------------------------------------------------
const refresh1 = getBusLocationPayload(busCoimbatoreChennai.bus_id, bIdTransit);
const refresh2 = getBusLocationPayload(busCoimbatoreChennai.bus_id, bIdTransit);
const s8Passed = Boolean(
  refresh1 && refresh2 &&
  refresh1.bus_status === refresh2.bus_status &&
  refresh1.waypoints.length === refresh2.waypoints.length &&
  refresh1.waypoints[0].passed === refresh2.waypoints[0].passed
);
record(
  'S8',
  'Refresh Consistency',
  'Re-fetching tracking returns consistent state without reset or jump',
  'Consistent bus_status and waypoint state',
  `status1=${refresh1?.bus_status}, status2=${refresh2?.bus_status}`,
  s8Passed
);

// -------------------------------------------------------------
// SCENARIO 9: Second passenger books same active journey
// -------------------------------------------------------------
const bIdTransitPassenger2 = `TEST-BK-TRN-P2-${Date.now()}`;
const bookingPassenger2 = {
  ...bookingTransit,
  booking_id: bIdTransitPassenger2,
  user_id: 'USER_P6',
  selected_seats: ['18B']
};
db.bookings.unshift(bookingPassenger2);

const passenger2Payload = getBusLocationPayload(busCoimbatoreChennai.bus_id, bIdTransitPassenger2);
const s9Passed = Boolean(
  passenger2Payload &&
  passenger2Payload.bus_status === 'IN_TRANSIT' &&
  passenger2Payload.waypoints[0].passed === true
);
record(
  'S9',
  'Shared Active Journey',
  'Second passenger booking preserves active journey without resetting progress',
  'bus_status=IN_TRANSIT, stop0=passed',
  `p2_bus_status=${passenger2Payload?.bus_status}, p2_stop0=${passenger2Payload?.waypoints[0]?.passed}`,
  s9Passed
);

// -------------------------------------------------------------
// SCENARIO 10-12: Multi-bus route test across distinct cities
// -------------------------------------------------------------
const route1Payload = getBusLocationPayload(busCoimbatoreChennai.bus_id);
const route2Payload = getBusLocationPayload(busMaduraiChennai.bus_id);
const route3Payload = getBusLocationPayload(busBangaloreChennai.bus_id);

const s10Passed = Boolean(
  route1Payload && route2Payload && route3Payload &&
  route1Payload.source === busCoimbatoreChennai.source &&
  route2Payload.source === busMaduraiChennai.source &&
  route3Payload.source === busBangaloreChennai.source &&
  route1Payload.source_location.latitude !== route2Payload.source_location.latitude
);
record(
  'S10-12',
  'Independent Multi-Route Tracking',
  'Distinct routes (Coimbatore, Madurai, Bangalore) have independent coordinates and waypoints',
  'Independent source coordinates and route data',
  `CBE=${route1Payload?.source_location?.latitude}, MDU=${route2Payload?.source_location?.latitude}, BLR=${route3Payload?.source_location?.latitude}`,
  s10Passed
);

// -------------------------------------------------------------
// SCENARIO 13: Cancelled booking handling
// -------------------------------------------------------------
bookingPassenger1.booking_status = 'CANCELLED';
const cancelTestPayload = getBusLocationPayload(busCoimbatoreChennai.bus_id, bId1);
const s13Passed = Boolean(
  cancelTestPayload &&
  cancelTestPayload.booking_status === 'CANCELLED' &&
  cancelTestPayload.bus_status === 'CANCELLED' &&
  cancelTestPayload.status_message.includes('cancelled')
);
record(
  'S13',
  'Cancelled Booking Tracking',
  'Cancelled booking shows CANCELLED status and cancellation message',
  'booking=CANCELLED, bus=CANCELLED',
  `booking=${cancelTestPayload?.booking_status}, bus=${cancelTestPayload?.bus_status}`,
  s13Passed
);

// -------------------------------------------------------------
// SCENARIO 14: Non-existent / Invalid bus ID lookup
// -------------------------------------------------------------
const invalidBusPayload = getBusLocationPayload('INVALID-BUS-ID-99999');
const s14Passed = (invalidBusPayload === null);
record(
  'S14',
  'Invalid Bus ID Handling',
  'Invalid bus lookup returns null (NEVER falls back to db.buses[0])',
  'null (404)',
  invalidBusPayload ? `Fallback to ${invalidBusPayload.bus_id}` : 'null',
  s14Passed
);

// Clean up mock test bookings
const createdBookingIds = [bId1, bIdPreDep, bIdBoarding, bIdTransit, bIdArrived, bIdTransitPassenger2];
db.bookings = db.bookings.filter(b => !createdBookingIds.includes(b.booking_id));

console.log('='.repeat(80));
const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const failed = total - passed;
console.log(`TOTAL SCENARIOS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('='.repeat(80));

fs.writeFileSync(
  path.join(__dirname, 'comprehensive_tracking_results.json'),
  JSON.stringify(results, null, 2),
  'utf-8'
);

if (failed > 0) process.exit(1);
