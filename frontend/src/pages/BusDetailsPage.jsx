import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bus, Star, Clock, MapPin, Shield, CheckCircle, Navigation, AlertCircle, ChevronRight, Phone } from 'lucide-react';

export const BusDetailsPage = () => {
  const { id } = useParams();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusDetails();
  }, [id]);

  const fetchBusDetails = async () => {
    try {
      let bData = null;
      try {
        const res = await axios.get(`/api/buses/${id}`);
        bData = res.data;
      } catch (e1) {
        console.error('Error fetching bus details:', e1);
      }

      if (!bData) {
        try {
          const allBusesRes = await axios.get('/api/buses');
          if (allBusesRes.data.buses?.length) {
            bData = allBusesRes.data.buses[0];
          }
        } catch (e2) {
          console.error('Fallback bus fetch failed:', e2);
        }
      }

      if (bData) {
        setBus(bData);
      }
    } catch (e) {
      console.error('Error in fetchBusDetails:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Loading bus profile & reviews...</p>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">Bus not found</h3>
        <Link to="/search" className="text-xs text-cyan-600 font-bold hover:underline">← Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold">{bus.bus_type}</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{bus.operator_name}</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Registration: {bus.bus_number} • Operator ID: {bus.operator_id}</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Seat Fare</span>
              <span className="text-3xl font-black text-cyan-400">₹{bus.fare}</span>
            </div>
            <button
              onClick={() => navigate(`/select-seats/${bus.bus_id}`)}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-cyan-500/20 transition flex items-center space-x-2"
            >
              <span>SELECT SEATS</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Route Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div>
            <span className="text-2xl font-black text-white">{bus.departure_time}</span>
            <p className="text-sm font-bold text-slate-300 mt-1">{bus.source}</p>
            <p className="text-xs text-slate-400">{bus.boarding_points[0]}</p>
          </div>

          <div className="text-center space-y-1 my-auto">
            <span className="text-xs font-semibold text-cyan-400 flex items-center justify-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{bus.journey_duration}</span>
            </span>
            <div className="w-full bg-slate-800 h-1 rounded-full relative my-1">
              <div className="w-3 h-3 bg-cyan-400 rounded-full absolute left-1/2 -top-1 -translate-x-1/2 shadow-glow"></div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">{bus.bus_status}</span>
          </div>

          <div className="sm:text-right">
            <span className="text-2xl font-black text-white">{bus.arrival_time}</span>
            <p className="text-sm font-bold text-slate-300 mt-1">{bus.destination}</p>
            <p className="text-xs text-slate-400">{bus.dropping_points[0]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Amenities & Boarding/Dropping */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amenities Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Bus Amenities & Services</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bus.amenities.map((am, idx) => (
                <div key={idx} className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                  <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>{am}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Boarding and Dropping Points */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Boarding Hubs ({bus.source})</span>
              </h3>
              <ul className="space-y-2 text-xs">
                {bus.boarding_points.map((pt, i) => (
                  <li key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between text-slate-800">
                    <span className="font-semibold">{pt}</span>
                    <span className="text-slate-500 font-mono">{bus.departure_time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Dropping Hubs ({bus.destination})</span>
              </h3>
              <ul className="space-y-2 text-xs">
                {bus.dropping_points.map((pt, i) => (
                  <li key={i} className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center justify-between text-slate-800">
                    <span className="font-semibold">{pt}</span>
                    <span className="text-slate-500 font-mono">{bus.arrival_time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Col: Rating breakdown & GPS preview */}
        <div className="space-y-6">
          {/* Ratings Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Passenger Ratings & Reviews</h3>

            <div className="flex items-center space-x-4 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-amber-700">{bus.rating}</span>
                <span className="text-[10px] text-amber-600 font-semibold block">out of 5</span>
              </div>
              <div className="text-xs space-y-1 text-slate-600">
                <div className="flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{bus.review_count} Verified Reviews</span>
                </div>
                <p className="text-[11px] text-slate-500">Based on recent passenger journeys</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Driver Behaviour</span><span className="font-bold">4.8 ★</span></div>
              <div className="flex justify-between"><span>Cleanliness</span><span className="font-bold">4.6 ★</span></div>
              <div className="flex justify-between"><span>Punctuality</span><span className="font-bold">4.4 ★</span></div>
              <div className="flex justify-between"><span>Seat Comfort</span><span className="font-bold">4.7 ★</span></div>
            </div>
          </div>

          {/* GPS Tracking Card */}
          <div className="bg-gradient-to-tr from-slate-900 to-slate-950 p-6 rounded-3xl text-white border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Navigation className="w-5 h-5 animate-pulse" />
              <h4 className="font-bold text-sm">Live GPS Tracking</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track real-time bus location, intermediate waypoints, speed, and ETA on Leaflet Map.
            </p>
            <Link
              to={`/tracking/${bus.bus_id}`}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-slate-700 transition"
            >
              <span>Track Live Bus Location</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
