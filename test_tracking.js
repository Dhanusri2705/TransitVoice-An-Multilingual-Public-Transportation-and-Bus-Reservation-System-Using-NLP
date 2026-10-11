const { getBusLocationPayload } = require('./backend/routes/tracking');
const payload = getBusLocationPayload('TV-00001');
console.log('GET BUS LOCATION SUCCESS:', payload.bus_id, payload.bus_number, payload.current_location);
