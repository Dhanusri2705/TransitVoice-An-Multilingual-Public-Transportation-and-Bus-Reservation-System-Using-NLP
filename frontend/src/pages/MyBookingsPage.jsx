import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bus, Ticket, Navigation, MessageSquare, AlertCircle, Calendar, ChevronRight, XCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const MyBookingsPage = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const res = await axios.get('/api/bookings');
      setBookings(res.data || []);
    } catch (e) {
      console.error('Error fetching bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'UPCOMING') return b.booking_status === 'CONFIRMED';
    if (activeTab === 'COMPLETED') return b.booking_status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return b.booking_status === 'CANCELLED';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Trips & Digital Tickets</h1>
          <p className="text-xs text-slate-500">Manage your bus bookings, track live GPS, and submit feedback</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
          {['UPCOMING', 'COMPLETED', 'CANCELLED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-bold transition ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">Fetching your bookings history...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No {activeTab.toLowerCase()} trips found</h3>
          <p className="text-xs text-slate-500">Book your next journey using natural language or text search.</p>
          <Link to="/search" className="inline-block mt-2 px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl">
            Search Buses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.booking_id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <span className="text-xs font-mono text-cyan-600 font-bold">Booking #{b.booking_id}</span>
                  <h3 className="font-extrabold text-slate-900 text-base">{b.operator_name}</h3>
                  <p className="text-xs text-slate-500">{b.bus_type} • Reg: {b.bus_number}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    b.booking_status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {b.booking_status}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">₹{b.total_amount}</span>
                </div>
              </div>

              {/* Route & Timing Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Route</span>
                  <span className="font-bold text-slate-800">{b.source} → {b.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Journey Date</span>
                  <span className="font-bold text-slate-800">{b.journey_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Seats</span>
                  <span className="font-mono font-bold text-cyan-700">{b.selected_seats?.join(', ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <Link
                  to={`/ticket/${b.booking_id}`}
                  className="px-3.5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center space-x-1"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Digital Ticket</span>
                </Link>

                <Link
                  to={`/tracking/${b.bus_id}?booking_id=${b.booking_id}`}
                  className="px-3.5 py-2 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-xl font-bold hover:bg-cyan-100 transition flex items-center space-x-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Track GPS</span>
                </Link>

                <Link
                  to={`/feedback?booking_id=${b.booking_id}&bus_id=${b.bus_id}`}
                  className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold hover:bg-amber-100 transition flex items-center space-x-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Give Feedback</span>
                </Link>

                <Link
                  to={`/complaints?booking_id=${b.booking_id}&bus_id=${b.bus_id}`}
                  className="px-3.5 py-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 transition flex items-center space-x-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>File Complaint</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
