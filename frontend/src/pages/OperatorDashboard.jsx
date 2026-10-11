import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Bus, MapPin, Gauge, Clock, Edit, Save, CheckCircle, Navigation } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const OperatorDashboard = () => {
  const { user, login } = useContext(AuthContext);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBusId, setEditingBusId] = useState(null);
  const [statusVal, setStatusVal] = useState('ON TIME');
  const [latVal, setLatVal] = useState(13.0827);
  const [lngVal, setLngVal] = useState(80.2707);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchOperatorBuses();
  }, [user]);

  const fetchOperatorBuses = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/buses');
      const allBuses = res.data.buses || [];
      
      // Determine assigned buses for this operator
      const targetOpId = user?.operator_id || (user?.role === 'OPERATOR' ? 'OP-101' : null);
      let assigned = [];

      if (targetOpId) {
        assigned = allBuses.filter(b => b.operator_id === targetOpId);
      }
      if (assigned.length === 0 && (user?.name || user?.role === 'OPERATOR')) {
        assigned = allBuses.filter(b => 
          (b.operator_name && b.operator_name.toLowerCase().includes('srs')) ||
          (b.operator && b.operator.toLowerCase().includes('srs'))
        );
      }
      if (assigned.length === 0) {
        // Fallback to SRS fleet or first 10 buses
        assigned = allBuses.filter(b => (b.operator_name || b.operator || '').includes('SRS'));
        if (assigned.length === 0) assigned = allBuses.slice(0, 10);
      }

      setBuses(assigned);
    } catch (e) {
      console.error('Error loading operator buses:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGPS = async (busId) => {
    setUpdateMsg({ type: '', text: '' });

    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      setUpdateMsg({ type: 'error', text: 'Latitude must be between -90 and 90 degrees.' });
      return;
    }

    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      setUpdateMsg({ type: 'error', text: 'Longitude must be between -180 and 180 degrees.' });
      return;
    }

    try {
      const token = localStorage.getItem('tv_token');
      const res = await axios.put(
        `/api/tracking/${busId}/location`,
        {
          latitude: latVal,
          longitude: lngVal,
          status: statusVal
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      setUpdateMsg({ type: 'success', text: res.data.message || 'GPS location & bus status updated live!' });
      setEditingBusId(null);
      fetchOperatorBuses();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Failed to update GPS location. Please verify operator authorization.';
      setUpdateMsg({ type: 'error', text: errMsg });
    }
  };

  const handleQuickLoginAsOperator = async () => {
    try {
      await login('operator@transitvoice.com', 'password123');
      setUpdateMsg({ type: 'success', text: 'Signed in as SRS Operations Admin (OP-101).' });
    } catch (e) {
      setUpdateMsg({ type: 'error', text: 'Could not auto-login as operator: ' + (e.response?.data?.error || e.message) });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-lg">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bus Operator Operations Portal</h1>
            <p className="text-xs text-slate-400">
              Manage schedules, fare rates, seat counts & live simulated GPS telematics • Logged in as: <strong className="text-cyan-300">{user?.name || user?.email || 'Bus Operator'}</strong> ({user?.role || 'OPERATOR'})
            </p>
          </div>
        </div>

        {(!user || user.role !== 'OPERATOR') && (
          <button
            onClick={handleQuickLoginAsOperator}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
          >
            Sign in as SRS Operator (OP-101)
          </button>
        )}
      </div>

      {updateMsg.text && (
        <div className={`p-4 rounded-2xl border text-xs font-bold ${
          updateMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {updateMsg.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Assigned Fleet Buses</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buses.map((b) => (
            <div key={b.bus_id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{b.operator_name} ({b.bus_number})</h4>
                  <span className="text-slate-500">{b.source} → {b.destination}</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">{b.bus_status}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <p>Departure: <strong className="text-slate-900">{b.departure_time}</strong></p>
                <p>Fare Rate: <strong className="text-slate-900">₹{b.fare}</strong></p>
                <p>Available Seats: <strong className="text-slate-900">{b.available_seats} / {b.total_seats}</strong></p>
                <p>Rating: <strong className="text-amber-600">★ {b.rating}</strong></p>
                <p className="col-span-2 text-[11px] font-mono text-slate-500">
                  Current GPS: <span className="text-slate-800 font-semibold">{b.latitude ?? 13.0827}, {b.longitude ?? 80.2707}</span>
                </p>
              </div>

              {/* Edit GPS Controls */}
              {editingBusId === b.bus_id ? (
                <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800">
                  <span className="text-[10px] text-cyan-400 font-mono font-bold block">UPDATE LIVE GPS COORD & STATUS</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (-90 to 90)</label>
                      <input type="number" step="0.0001" value={latVal} onChange={(e) => setLatVal(parseFloat(e.target.value))} placeholder="Lat" className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (-180 to 180)</label>
                      <input type="number" step="0.0001" value={lngVal} onChange={(e) => setLngVal(parseFloat(e.target.value))} placeholder="Lng" className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" />
                    </div>
                  </div>
                  <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs">
                    <option value="ON TIME">ON TIME</option>
                    <option value="DELAYED 15 MIN">DELAYED 15 MIN</option>
                    <option value="EN ROUTE">EN ROUTE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <div className="flex space-x-2 pt-1">
                    <button onClick={() => setEditingBusId(null)} className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded font-semibold">Cancel</button>
                    <button onClick={() => handleUpdateGPS(b.bus_id)} className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold rounded">Update Location</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingBusId(b.bus_id); setLatVal(b.latitude || 13.0827); setLngVal(b.longitude || 80.2707); setStatusVal(b.bus_status || 'ON TIME'); setUpdateMsg({ type: '', text: '' }); }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center space-x-1 transition"
                >
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Update GPS & Status</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
