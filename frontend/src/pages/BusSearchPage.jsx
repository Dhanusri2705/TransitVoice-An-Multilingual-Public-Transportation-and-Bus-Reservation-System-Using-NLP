import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, Star, Clock, Bus, Navigation, ShieldCheck, ArrowUpDown, ChevronRight, CheckCircle2, Info } from 'lucide-react';

export const BusSearchPage = () => {
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get('source') || '';
  const destParam = searchParams.get('destination') || '';
  const busTypeParam = searchParams.get('bus_type') || '';
  const maxFareParam = searchParams.get('max_fare') || '';
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const passengersParam = searchParams.get('passengers') || '1';

  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusType, setSelectedBusType] = useState(busTypeParam);
  const [maxFare, setMaxFare] = useState(maxFareParam ? parseInt(maxFareParam) : 2000);
  const [minRating, setMinRating] = useState(0);
  const [depTime, setDepTime] = useState('');
  const [sortBy, setSortBy] = useState('cheapest');

  const navigate = useNavigate();

  useEffect(() => {
    fetchBuses();
  }, [sourceParam, destParam, selectedBusType, maxFare, minRating, depTime, sortBy, searchQuery]);

  const fetchBuses = async () => {
    setLoading(true);
    setApiError(false);
    try {
      const res = await axios.get('/api/buses', {
        params: {
          source: sourceParam,
          destination: destParam,
          bus_type: selectedBusType,
          max_fare: maxFare,
          min_rating: minRating,
          departure_time: depTime,
          sort_by: sortBy,
          q: searchQuery
        }
      });
      setBuses(res.data.buses || []);
    } catch (e) {
      console.error('Error searching buses:', e);
      setApiError(true);
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search Header Summary */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between shadow-lg gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3 text-xl font-bold">
            <span>{sourceParam || 'All Origin Cities'}</span>
            <span className="text-cyan-400">→</span>
            <span>{destParam || 'All Destinations'}</span>
          </div>
          <p className="text-xs text-slate-400">
            All-India Master Bus Transport Registry • {buses.length} services found
          </p>
        </div>

        {/* Search Bar for Bus Number / District / Service ID */}
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bus #, District, State, or Route..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Sorting controls */}
        <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400 pl-2 flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </span>
          <button
            onClick={() => setSortBy('cheapest')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${sortBy === 'cheapest' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Cheapest
          </button>
          <button
            onClick={() => setSortBy('earliest')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${sortBy === 'earliest' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Earliest
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${sortBy === 'rating' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Top Rated
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Filter className="w-4 h-4 text-cyan-600" />
              <span>Filter Buses</span>
            </h3>
            <button
              onClick={() => { setSelectedBusType(''); setMaxFare(2000); setMinRating(0); setDepTime(''); setSearchQuery(''); }}
              className="text-[11px] text-cyan-600 hover:underline font-semibold"
            >
              Reset All
            </button>
          </div>

          {/* Bus Type Filter */}
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-700 block">Bus Class / Type</label>
            <select
              value={selectedBusType}
              onChange={(e) => setSelectedBusType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            >
              <option value="">All Bus Service Types</option>
              <option value="Ultra Deluxe">SETC Ultra Deluxe</option>
              <option value="AC Sleeper">AC Sleeper</option>
              <option value="Non-AC Sleeper">Non-AC Sleeper</option>
              <option value="Classic Express">TNSTC Express</option>
              <option value="Point-to-Point Superfast">Point-to-Point Superfast</option>
              <option value="Volvo Multi-Axle">Volvo Multi-Axle</option>
              <option value="Ordinary Town Service">Town Service</option>
            </select>
          </div>

          {/* Departure Time */}
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-700 block">Departure Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Morning (5-12)', val: 'morning' },
                { label: 'Afternoon (12-5)', val: 'afternoon' },
                { label: 'Evening (5-9)', val: 'evening' },
                { label: 'Night (9-5)', val: 'night' }
              ].map(t => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => setDepTime(depTime === t.val ? '' : t.val)}
                  className={`p-2 rounded-xl text-[11px] font-medium border text-center transition ${
                    depTime === t.val ? 'bg-cyan-500 text-white border-cyan-500 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Fare Budget Slider */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Max Budget Fare</span>
              <span className="text-cyan-600 font-bold">₹{maxFare}</span>
            </div>
            <input
              type="range"
              min={200}
              max={2000}
              step={50}
              value={maxFare}
              onChange={(e) => setMaxFare(parseInt(e.target.value))}
              className="w-full accent-cyan-600"
            />
          </div>

          {/* Data Transparency Notice */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center space-x-1 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Transport Data</span>
            </div>
            <p className="leading-relaxed text-[10px]">
              Schedules and route stops are sourced from Verified Public Timetables. Real-time GPS telematics are simulated for capstone prototype demonstration.
            </p>
          </div>
        </div>

        {/* Bus List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-medium">Fetching All-India Master bus transport registry...</p>
            </div>
          ) : apiError ? (
            <div className="bg-rose-50 p-8 rounded-3xl border border-rose-200 text-center space-y-3">
              <Info className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="font-bold text-rose-900 text-sm">Backend API Server Unreachable</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                Could not connect to the Express REST API server at <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">http://localhost:5000</code>.
              </p>
              <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-[11px] font-mono text-slate-800 text-left max-w-md mx-auto space-y-1">
                <p className="font-bold text-rose-800">To fix this, open a terminal and run:</p>
                <p className="text-cyan-800 font-semibold">cd backend</p>
                <p className="text-cyan-800 font-semibold">npm start</p>
              </div>
              <button
                onClick={fetchBuses}
                className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
              >
                Retry Connection
              </button>
            </div>
          ) : buses.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Bus className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No matching bus services found</h4>
              <p className="text-xs text-slate-500">Try searching alternate cities, districts, states, or clear filters.</p>
            </div>
          ) : (
            buses.map((b) => (
              <div
                key={b.bus_id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-cyan-500/50 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 space-y-4"
              >
                {/* Top Bar: Operator Name & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-base text-slate-900">{b.operator_name || b.operator}</h4>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                        {b.service_id || b.bus_id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">{b.bus_type}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] font-semibold">{b.bus_number}</span>
                      {b.via && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-700 font-medium text-[11px]">{b.via}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{b.rating || 4.5}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({b.review_count || 120})</span>
                    </span>
                  </div>
                </div>

                {/* Schedule & Duration Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center py-1">
                  <div>
                    <span className="text-xl font-black text-slate-900">{b.departure_time}</span>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{b.source}</p>
                    <p className="text-[11px] text-slate-400 truncate">{b.boarding_points?.[0] || b.depot || b.source}</p>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs font-semibold text-slate-500 flex items-center justify-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{b.journey_duration}</span>
                      {b.distance_km && <span className="text-[10px] text-slate-400">({b.distance_km} km)</span>}
                    </span>
                    <div className="w-full bg-slate-200 h-0.5 relative my-1">
                      <div className="w-2 h-2 bg-cyan-600 rounded-full absolute left-1/2 -top-0.5 -translate-x-1/2"></div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">{b.bus_status || 'ON TIME'}</span>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xl font-black text-slate-900">{b.arrival_time}</span>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{b.destination}</p>
                    <p className="text-[11px] text-slate-400 truncate">{b.dropping_points?.[0] || b.destination}</p>
                  </div>
                </div>

                {/* Intermediate Stops Chips */}
                {b.stops && b.stops.length > 0 && (
                  <div className="flex items-center space-x-2 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 overflow-x-auto">
                    <span className="font-bold text-slate-500 uppercase shrink-0">Stops:</span>
                    {b.stops.map((st, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium whitespace-nowrap">
                        {st}
                      </span>
                    ))}
                  </div>
                )}

                {/* Amenities & Fare Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-4 gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(b.amenities || ["WiFi", "Charging Point", "Pushback Seats"]).slice(0, 4).map((am, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-medium">
                        {am}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Seat Fare</span>
                      <span className="text-2xl font-extrabold text-slate-900">₹{b.fare}</span>
                    </div>

                    <Link
                      to={`/buses/${b.bus_id}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                    >
                      Details
                    </Link>

                    <button
                      onClick={() => navigate(`/select-seats/${b.bus_id}?date=${dateParam}&passengers=${passengersParam}`)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/20 transition flex items-center space-x-1"
                    >
                      <span>SELECT SEATS</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
