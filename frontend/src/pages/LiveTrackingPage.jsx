import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Clock, Gauge, Shield, AlertCircle, Info } from 'lucide-react';

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const cityIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

export const LiveTrackingPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const busId = id || 'TV-00001';
  const bookingId = searchParams.get('booking_id') || '';

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 4000);
    return () => clearInterval(interval);
  }, [busId, bookingId]);

  const fetchLocation = async () => {
    try {
      const res = await axios.get(`/api/tracking/${busId}?booking_id=${bookingId}`);
      if (res.data && res.data.current_location) {
        setTrackingData(res.data);
      }
    } catch (e) {
      console.error('Error fetching tracking data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trackingData) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Connecting to bus GPS telematics feed...</p>
      </div>
    );
  }

  const data = trackingData || {
    bus_id: busId,
    bus_number: 'TN-38-N-1234',
    operator_name: 'TransitVoice Service',
    source: 'Coimbatore',
    destination: 'Chennai',
    bus_status: 'AT_SOURCE',
    status_message: 'Bus is at Coimbatore - Ready for boarding',
    has_active_booking: false,
    current_location: { latitude: 11.0168, longitude: 76.9558, speed_kmh: 0 },
    source_location: { latitude: 11.0168, longitude: 76.9558, label: 'Coimbatore' },
    destination_location: { latitude: 13.0827, longitude: 80.2707, label: 'Chennai' },
    waypoints: [
      { name: 'Coimbatore Main Hub', lat: 11.0168, lng: 76.9558, passed: false },
      { name: 'Intermediate Highway Plaza', lat: 12.0500, lng: 78.6000, passed: false },
      { name: 'Chennai Central Stand', lat: 13.0827, lng: 80.2707, passed: false }
    ],
    eta_minutes: 360,
    distance_remaining_km: 340
  };

  const { current_location, source_location, destination_location, waypoints } = data;
  const polylineCoords = (waypoints && waypoints.length >= 2)
    ? waypoints.map(w => [w.lat, w.lng])
    : [
        [source_location.latitude, source_location.longitude],
        [current_location.latitude, current_location.longitude],
        [destination_location.latitude, destination_location.longitude]
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${data.bus_status === 'IN_TRANSIT' ? 'bg-emerald-400 animate-ping' : data.bus_status === 'BOARDING' ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
              <span>Simulated Tracking</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
              data.bus_status === 'IN_TRANSIT' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' :
              data.bus_status === 'BOARDING' ? 'bg-amber-900/60 text-amber-300 border border-amber-700' :
              data.bus_status === 'ARRIVED' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' :
              data.bus_status === 'CANCELLED' ? 'bg-rose-900/60 text-rose-300 border border-rose-700' :
              'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              Journey: {data.bus_status || 'UPCOMING'}
            </span>
            {data.booking_status && (
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                data.booking_status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                data.booking_status === 'CANCELLED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                Booking: {data.booking_status}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{data.operator_name} ({data.bus_number})</h1>
          <p className="text-xs text-slate-400">{data.source} → {data.destination}</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Simulated Speed</span>
            <span className="text-lg font-black text-cyan-400 flex items-center justify-center space-x-1">
              <Gauge className="w-4 h-4" />
              <span>{current_location.speed_kmh} km/h</span>
            </span>
          </div>
          <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">ETA</span>
            <span className="text-lg font-black text-emerald-400 flex items-center justify-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{data.eta_minutes !== null ? `${data.eta_minutes} mins` : '—'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Simulation Disclaimer & Lifecycle Notice (Requirements 16 & 19) */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center space-x-2.5">
          <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-bold text-slate-900 block sm:inline mr-2">Status: {data.status_message}</span>
            <span className="text-slate-500">
              {data.tracking_disclaimer || 'Speed, ETA, coordinates, and waypoint progress are simulated based on scheduled timetable.'}
            </span>
          </div>
        </div>
        {data.booking_status === 'CANCELLED' ? (
          <Link
            to="/my-bookings"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shrink-0"
          >
            My Bookings
          </Link>
        ) : !data.has_active_booking && (
          <Link
            to={`/select-seats/${data.bus_id}`}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shrink-0"
          >
            Book This Bus
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet OpenStreetMap Container */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md h-[480px] relative z-0">
          <MapContainer
            center={[current_location.latitude, current_location.longitude]}
            zoom={8}
            scrollWheelZoom={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Bus Marker */}
            <Marker position={[current_location.latitude, current_location.longitude]} icon={busIcon}>
              <Popup>
                <div className="text-xs font-sans space-y-1">
                  <strong className="block text-slate-900">{data.operator_name} ({data.bus_number})</strong>
                  <p className="text-slate-600">Status: <span className="font-bold text-cyan-600">{data.bus_status}</span></p>
                  <p className="text-slate-500">Speed: {current_location.speed_kmh} km/h</p>
                </div>
              </Popup>
            </Marker>

            {/* Source Marker */}
            <Marker position={[source_location.latitude, source_location.longitude]} icon={cityIcon}>
              <Popup>Source: {source_location.label}</Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={[destination_location.latitude, destination_location.longitude]} icon={cityIcon}>
              <Popup>Destination: {destination_location.label}</Popup>
            </Marker>

            {/* Intermediate Waypoint Markers */}
            {waypoints && waypoints.slice(1, -1).map((wp, i) => (
              <Marker key={i} position={[wp.lat, wp.lng]} icon={cityIcon}>
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <strong className="block text-slate-900">{wp.name}</strong>
                    <p className={`font-bold ${wp.passed ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {wp.passed ? 'Status: Passed ✓' : 'Status: Upcoming Stop'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Connecting Route Line */}
            <Polyline positions={polylineCoords} color="#06b6d4" weight={4} dashArray="5, 10" />
          </MapContainer>
        </div>

        {/* Right Col: Waypoints & Telematics */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-cyan-600" />
              <span>Route Waypoints & Stops</span>
            </h3>

            <div className="space-y-4 text-xs relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {waypoints.map((wp, idx) => (
                <div key={idx} className="flex items-start space-x-3 relative z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    wp.passed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 border border-slate-300 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{wp.name}</h4>
                    <span className="text-[10px] text-slate-400">{wp.passed ? 'Passed ✓' : 'Upcoming Stop'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">Telematics Feed</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Simulated</span>
            </div>
            <div className="text-xs space-y-1.5">
              <p>Distance Remaining: <strong className="text-cyan-400 font-mono">{data.distance_remaining_km !== null ? `${data.distance_remaining_km} km` : '—'}</strong></p>
              <p>Coordinates: <span className="font-mono text-slate-400">{current_location.latitude}, {current_location.longitude}</span></p>
              <p className="text-[10px] text-slate-400 italic pt-1">{data.tracking_mode || 'Simulated Route Timetable Tracking'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
