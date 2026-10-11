const http = require('http');

async function runTests() {
  console.log('================================================================');
  console.log('TRANSITVOICE VERIFICATION TEST SUITE - GPS & HOME SEARCH');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- PART 1: AUTHENTICATION & TOKENS ---
  console.log('--- 1. AUTHENTICATION & TOKENS ---');
  let operatorToken = '';
  let userToken = '';

  try {
    const opLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@transitvoice.com', password: 'password123' })
    });
    const opData = await opLoginRes.json();
    operatorToken = opData.token;
    assert(opLoginRes.status === 200 && opData.user.role === 'OPERATOR', 'Operator login successful (OP-101 / SRS Operations Admin)');
    assert(opData.user.operator_id === 'OP-101', 'Operator user has operator_id: OP-101');
  } catch (e) {
    assert(false, `Operator login failed: ${e.message}`);
  }

  try {
    const userLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@transitvoice.com', password: 'password123' })
    });
    const userData = await userLoginRes.json();
    userToken = userData.token;
    assert(userLoginRes.status === 200 && userData.user.role === 'USER', 'Regular user login successful (role: USER)');
  } catch (e) {
    assert(false, `User login failed: ${e.message}`);
  }

  // --- PART 2: GPS UPDATE ENDPOINT SECURITY & VALIDATION ---
  console.log('\n--- 2. GPS UPDATE TESTS ---');

  // Test 2.1: Missing Authentication
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 13.0827, longitude: 80.2707, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 401, `Missing Auth returns 401 Unauthorized (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Missing Auth test threw error: ${e.message}`);
  }

  // Test 2.2: Invalid Token
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer INVALID_JWT_SECRET_STRING'
      },
      body: JSON.stringify({ latitude: 13.0827, longitude: 80.2707, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 401, `Invalid Token returns 401 Unauthorized (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Invalid Token test threw error: ${e.message}`);
  }

  // Test 2.3: Unauthorized Role (USER attempting GPS update)
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ latitude: 13.0827, longitude: 80.2707, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 403, `Regular USER role blocked with 403 Forbidden (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Unauthorized Role test threw error: ${e.message}`);
  }

  // Test 2.4: Unauthorized Bus Ownership (SRS Operator updating SETC bus TNSTC-120)
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TNSTC-120/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ latitude: 13.0827, longitude: 80.2707, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 403, `Unauthorized bus ownership blocked with 403 Forbidden (Actual: ${res.status}, Message: "${body.error}")`);
    assert(body.error && body.error.includes('Unauthorized'), `Error message clearly informs about ownership restriction: "${body.error}"`);
  } catch (e) {
    assert(false, `Ownership test threw error: ${e.message}`);
  }

  // Test 2.5: Invalid Latitude (> 90)
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ latitude: 95.5, longitude: 80.2707, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 400, `Invalid latitude (95.5) rejected with 400 Bad Request (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Latitude test threw error: ${e.message}`);
  }

  // Test 2.6: Invalid Longitude (> 180)
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ latitude: 13.0827, longitude: 195.0, status: 'ON TIME' })
    });
    const body = await res.json();
    assert(res.status === 400, `Invalid longitude (195.0) rejected with 400 Bad Request (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Longitude test threw error: ${e.message}`);
  }

  // Test 2.7: Invalid Status
  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ latitude: 13.0827, longitude: 80.2707, status: 'FLYING_AIRPLANE' })
    });
    const body = await res.json();
    assert(res.status === 400, `Invalid status rejected with 400 Bad Request (Actual: ${res.status}, Message: "${body.error}")`);
  } catch (e) {
    assert(false, `Status test threw error: ${e.message}`);
  }

  // Test 2.8: Valid GPS & Status Update for Authorized SRS Bus (TV-00022)
  const testLat = 13.0839;
  const testLng = 80.2715;
  const testStatus = 'DELAYED 15 MIN';

  try {
    const res = await fetch('http://localhost:5000/api/tracking/TV-00022/location', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ latitude: testLat, longitude: testLng, status: testStatus })
    });
    const body = await res.json();
    assert(res.status === 200, `Authorized GPS update successful (HTTP 200 OK)`);
    assert(body.latitude === testLat && body.longitude === testLng, `Coordinates updated to ${testLat}, ${testLng}`);
    assert(body.bus_status === testStatus, `Status updated to ${testStatus}`);
  } catch (e) {
    assert(false, `Valid GPS update test threw error: ${e.message}`);
  }

  // Test 2.9: Verify Persistence (read back from database / json)
  try {
    const verifyRes = await fetch('http://localhost:5000/api/buses');
    const verifyData = await verifyRes.json();
    const updatedBus = verifyData.buses.find(b => b.bus_id === 'TV-00022');
    assert(updatedBus !== undefined, 'Bus TV-00022 found in database');
    assert(updatedBus.latitude === testLat && updatedBus.longitude === testLng, `Persisted coordinates match: ${updatedBus.latitude}, ${updatedBus.longitude}`);
    assert(updatedBus.bus_status === testStatus, `Persisted status matches: ${updatedBus.bus_status}`);
  } catch (e) {
    assert(false, `Persistence verification threw error: ${e.message}`);
  }

  // --- PART 3: HOME SEARCH VALIDATION & PROPAGATION ---
  console.log('\n--- 3. HOME SEARCH VALIDATION LOGIC TESTS ---');

  // Simulation of Home.jsx search handler logic
  function testHomeSearchHandler(source, destination, date, passengers, todayStr) {
    if (!source.trim()) return { ok: false, error: 'Please enter departure city (From).' };
    if (!destination.trim()) return { ok: false, error: 'Please enter destination city (To).' };
    if (!date) return { ok: false, error: 'Please select a journey date before searching.' };
    if (date < todayStr) return { ok: false, error: 'Journey date cannot be in the past.' };
    const paxNum = parseInt(passengers, 10);
    if (!passengers || isNaN(paxNum) || paxNum < 1 || paxNum > 6) {
      return { ok: false, error: 'Please select number of passengers (1 to 6).' };
    }
    const url = `/search?source=${encodeURIComponent(source.trim())}&destination=${encodeURIComponent(destination.trim())}&date=${date}&passengers=${paxNum}`;
    return { ok: true, url, paxNum, date };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Case 3.1: Missing From
  const r1 = testHomeSearchHandler('', 'Madurai', '2026-10-15', '2', todayStr);
  assert(!r1.ok && r1.error === 'Please enter departure city (From).', 'Missing From rejected');

  // Case 3.2: Missing To
  const r2 = testHomeSearchHandler('Chennai', '', '2026-10-15', '2', todayStr);
  assert(!r2.ok && r2.error === 'Please enter destination city (To).', 'Missing To rejected');

  // Case 3.3: Missing Date (empty string initial state)
  const r3 = testHomeSearchHandler('Chennai', 'Madurai', '', '2', todayStr);
  assert(!r3.ok && r3.error === 'Please select a journey date before searching.', 'Empty Date rejected');

  // Case 3.4: Past Date
  const r4 = testHomeSearchHandler('Chennai', 'Madurai', '2020-01-01', '2', todayStr);
  assert(!r4.ok && r4.error === 'Journey date cannot be in the past.', 'Past Date rejected');

  // Case 3.5: Missing Passengers (empty string initial state)
  const r5 = testHomeSearchHandler('Chennai', 'Madurai', '2026-10-15', '', todayStr);
  assert(!r5.ok && r5.error === 'Please select number of passengers (1 to 6).', 'Empty Passengers rejected');

  // Case 3.6: Invalid Passengers count (> 6 or 0)
  const r6 = testHomeSearchHandler('Chennai', 'Madurai', '2026-10-15', '8', todayStr);
  assert(!r6.ok && r6.error === 'Please select number of passengers (1 to 6).', 'Passengers > 6 rejected');

  // Case 3.7: Valid Search Submission
  const r7 = testHomeSearchHandler('Chennai', 'Madurai', '2026-10-15', '3', todayStr);
  assert(r7.ok && r7.url === '/search?source=Chennai&destination=Madurai&date=2026-10-15&passengers=3', `Valid search navigates to: ${r7.url}`);

  // Test downstream search API with these parameters
  const searchApiRes = await fetch('http://localhost:5000/api/buses?source=Chennai&destination=Madurai');
  const searchApiData = await searchApiRes.json();
  assert(searchApiRes.status === 200 && searchApiData.buses.length > 0, `Search API returned ${searchApiData.buses.length} buses for Chennai -> Madurai`);

  console.log(`\n================================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
