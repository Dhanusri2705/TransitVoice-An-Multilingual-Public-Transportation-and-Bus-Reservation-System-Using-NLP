const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function readJSON(filename, defaultData = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error reading ${filename}:`, e);
      return defaultData;
    }
  }
  return defaultData;
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

class DBStore {
  constructor() {
    this.buses = readJSON('buses.json');
    this.users = readJSON('users.json');
    const rawOps = readJSON('operators.json');
    this.operators = Array.isArray(rawOps) ? rawOps : (rawOps.operators || []);
    this.reviews = readJSON('reviews.json');
    this.complaints = readJSON('complaints.json');
    this.bookings = readJSON('bookings.json', []);
    this.bookedSeatsMap = readJSON('booked_seats.json', {});

    // Normalize bus identifiers and map operator IDs
    const opNameToId = {};
    for (const op of this.operators) {
      if (op.operator_name && op.operator_id) {
        opNameToId[op.operator_name.toLowerCase()] = op.operator_id;
      }
    }
    for (const b of this.buses) {
      if (!b.bus_id) {
        b.bus_id = b.service_id || b.bus_number;
      }
      if (!b.operator_name) {
        b.operator_name = b.operator || 'Unknown Operator';
      }
      if (!b.operator_id) {
        const opLower = (b.operator_name || b.operator || '').toLowerCase();
        for (const [name, id] of Object.entries(opNameToId)) {
          if (opLower.includes(name) || name.includes(opLower)) {
            b.operator_id = id;
            break;
          }
        }
      }
    }
  }

  saveBookings() {
    writeJSON('bookings.json', this.bookings);
    writeJSON('booked_seats.json', this.bookedSeatsMap);
  }

  saveComplaints() {
    writeJSON('complaints.json', this.complaints);
  }

  saveReviews() {
    writeJSON('reviews.json', this.reviews);
  }

  saveBuses() {
    writeJSON('buses.json', this.buses);
  }

  saveUsers() {
    writeJSON('users.json', this.users);
  }

  saveOperators() {
    writeJSON('operators.json', { operators: this.operators });
  }
}

const db = new DBStore();

module.exports = db;
