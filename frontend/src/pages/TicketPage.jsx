import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Bus, Printer, Navigation, CheckCircle2, QrCode, AlertCircle, XCircle } from 'lucide-react';

export const TicketPage = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`/api/bookings/${id}`);
      setTicket(res.data);
    } catch (e) {
      console.error('Error loading ticket:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCancelBooking = async () => {
    if (window.confirm('Are you sure you want to cancel this booking? Refund will be processed.')) {
      try {
        await axios.put(`/api/bookings/${ticket.booking_id}/cancel`);
        fetchTicket();
      } catch (e) {
        alert(e.response?.data?.error || 'Cancellation failed.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Retrieving digital QR ticket record...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">Ticket Not Found</h3>
        <Link to="/my-bookings" className="text-xs text-cyan-600 font-bold hover:underline">← Go to My Bookings</Link>
      </div>
    );
  }

  const isCancelled = ticket.booking_status === 'CANCELLED';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between no-print">
        <Link to="/my-bookings" className="text-xs font-bold text-cyan-600 hover:underline">← My Bookings</Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Ticket Card Container */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden">
        {/* Ticket Header Banner */}
        <div className={`p-6 text-white flex items-center justify-between ${isCancelled ? 'bg-rose-900' : 'bg-slate-900'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">TransitVoice Digital Ticket</h2>
              <p className="text-xs text-slate-400 font-mono">Ticket #: {ticket.ticket_number}</p>
            </div>
          </div>

          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isCancelled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
            }`}>
              {ticket.booking_status}
            </span>
          </div>
        </div>

        {/* Ticket Body Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Operator and Bus Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-xl text-slate-900">{ticket.operator_name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{ticket.bus_type} • Reg: {ticket.bus_number}</p>
            </div>
            <div className="mt-2 sm:mt-0 text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Journey Date</span>
              <span className="text-sm font-bold text-slate-800">{ticket.journey_date}</span>
            </div>
          </div>

          {/* Source and Destination Timeline */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Boarding Hub ({ticket.source})</span>
              <p className="text-lg font-black text-slate-900">{ticket.departure_time}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{ticket.boarding_point}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Dropping Hub ({ticket.destination})</span>
              <p className="text-lg font-black text-slate-900">{ticket.arrival_time}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{ticket.dropping_point}</p>
            </div>
          </div>

          {/* Passenger & Seats Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-b border-slate-100 pb-4">
            <div>
              <span className="text-slate-400 block">Passenger Name</span>
              <span className="font-bold text-slate-900 text-sm">{ticket.passenger_details[0]?.name || ticket.user_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Seat Numbers</span>
              <span className="font-mono font-black text-cyan-700 text-sm">{ticket.selected_seats?.join(', ')}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Fare Paid</span>
              <span className="font-extrabold text-slate-900 text-sm">₹{ticket.total_amount} ({ticket.payment_method})</span>
            </div>
          </div>

          {/* Digital QR Code Container */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Boarding Security QR Pass</span>
              <p className="text-xs text-slate-400 max-w-sm">
                Show this digital QR code to bus conductor during boarding. Verified with TransitVoice API.
              </p>
            </div>
            {/* SVG Simulated QR Code */}
            <div className="mt-3 sm:mt-0 p-2 bg-white rounded-xl shadow-md">
              <div className="w-24 h-24 bg-slate-950 p-2 rounded flex flex-col justify-between">
                <div className="grid grid-cols-4 gap-1 h-full">
                  <div className="bg-white rounded-sm"></div>
                  <div className="bg-cyan-400 rounded-sm"></div>
                  <div className="bg-white rounded-sm"></div>
                  <div className="bg-white rounded-sm"></div>
                  <div className="bg-white rounded-sm"></div>
                  <div className="bg-slate-950"></div>
                  <div className="bg-cyan-400 rounded-sm"></div>
                  <div className="bg-white rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 no-print">
            <Link
              to={`/tracking/${ticket.bus_id}?booking_id=${ticket.booking_id}`}
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md"
            >
              <Navigation className="w-4 h-4" />
              <span>Track Live Bus Location</span>
            </Link>

            {!isCancelled && (
              <button
                onClick={handleCancelBooking}
                className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
              >
                Cancel Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
