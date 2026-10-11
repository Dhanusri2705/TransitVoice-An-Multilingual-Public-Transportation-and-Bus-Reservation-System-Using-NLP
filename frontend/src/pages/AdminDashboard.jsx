import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Bus, Users, DollarSign, AlertCircle, Star, Plus, CheckCircle, Trash, Edit } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Bus Modal state
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [busNumber, setBusNumber] = useState('TN-38-AX-9999');
  const [operatorName, setOperatorName] = useState('SRS Travels');
  const [source, setSource] = useState('Chennai');
  const [destination, setDestination] = useState('Coimbatore');
  const [fare, setFare] = useState(750);
  const [busType, setBusType] = useState('AC Sleeper');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, busesRes, complaintsRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/buses'),
        axios.get('/api/complaints')
      ]);
      setStats(statsRes.data);
      setBuses(busesRes.data.buses || []);
      setComplaints(complaintsRes.data || []);
    } catch (e) {
      console.error('Error loading admin stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/buses', {
        bus_number: busNumber,
        operator_name: operatorName,
        source,
        destination,
        fare,
        bus_type: busType
      });
      setShowAddBusModal(false);
      fetchAdminData();
    } catch (e) {
      alert('Failed to add bus.');
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    try {
      await axios.put(`/api/complaints/${complaintId}/status`, {
        status: 'RESOLVED',
        resolution_notes: 'Remediated by Admin operations team.'
      });
      fetchAdminData();
    } catch (e) {
      alert('Failed to update complaint status.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Loading admin analytics portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">TransitVoice System Admin Portal</h1>
            <p className="text-xs text-slate-400">Platform fleet metrics, operator management, & complaint resolution</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddBusModal(true)}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Bus</span>
        </button>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Fleet Buses', val: stats?.totalBuses, icon: Bus, color: 'text-cyan-400' },
          { label: 'Registered Users', val: stats?.totalUsers, icon: Users, color: 'text-emerald-400' },
          { label: 'Active Operators', val: stats?.totalOperators, icon: Shield, color: 'text-purple-400' },
          { label: 'Total Bookings', val: stats?.totalBookings, icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Platform Revenue', val: `₹${stats?.totalRevenue}`, icon: DollarSign, color: 'text-cyan-300' },
          { label: 'Open Grievances', val: stats?.openComplaints, icon: AlertCircle, color: 'text-rose-400' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{kpi.label}</span>
            <span className={`text-xl font-black ${kpi.color} text-slate-900 block`}>{kpi.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fleet Buses Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Active Fleet Buses</h3>
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="py-2">Bus #</th>
                  <th className="py-2">Operator</th>
                  <th className="py-2">Route</th>
                  <th className="py-2">Fare</th>
                  <th className="py-2">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {buses.slice(0, 15).map((b) => (
                  <tr key={b.bus_id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-bold">{b.bus_number}</td>
                    <td className="py-2.5">{b.operator_name}</td>
                    <td className="py-2.5">{b.source} → {b.destination}</td>
                    <td className="py-2.5 font-bold">₹{b.fare}</td>
                    <td className="py-2.5 text-amber-600 font-bold">★ {b.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complaints Resolution Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Open Passenger Complaints</h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {complaints.filter(c => c.status !== 'RESOLVED').length === 0 ? (
              <p className="text-xs text-slate-400">All passenger complaints resolved! ✓</p>
            ) : (
              complaints.filter(c => c.status !== 'RESOLVED').map((c) => (
                <div key={c.complaint_id} className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">{c.complaint_id} ({c.category})</span>
                      {c.detected_language && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono">
                          {c.detected_language}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] font-bold">{c.status}</span>
                  </div>
                  <p className="text-slate-800 text-[11px] font-medium">"{c.original_text || c.description}"</p>
                  {c.detected_language_code && c.detected_language_code !== 'en' && c.translated_text && (
                    <p className="text-slate-500 text-[10px] italic bg-white p-2 rounded-xl border border-rose-100">
                      Translated: "{c.translated_text}"
                    </p>
                  )}
                  <button
                    onClick={() => handleResolveComplaint(c.complaint_id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Bus Modal */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 text-white p-6 rounded-3xl max-w-md w-full border border-slate-800 space-y-4 text-xs">
            <h3 className="text-base font-bold">Add New Bus to Fleet</h3>

            <form onSubmit={handleAddBus} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Bus Registration #</label>
                <input type="text" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Operator Name</label>
                <input type="text" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Source</label>
                  <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Destination</label>
                  <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Ticket Fare (₹)</label>
                <input type="number" value={fare} onChange={(e) => setFare(parseFloat(e.target.value))} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl" />
              </div>

              <div className="flex space-x-2 pt-2">
                <button type="button" onClick={() => setShowAddBusModal(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl">Save Bus</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
