import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Bus, User, Check, ArrowRight, ShieldCheck, MapPin, AlertCircle, UserCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const SeatSelectionPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const requiredPassengersCount = parseInt(searchParams.get('passengers') || '1', 10);

  const { user } = useContext(AuthContext);
  const [seatData, setSeatData] = useState(null);
  const [bus, setBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [boardingPoint, setBoardingPoint] = useState('');
  const [droppingPoint, setDroppingPoint] = useState('');
  const [loading, setLoading] = useState(true);

  // Array of passenger details objects, dynamically sized
  const [passengerDetails, setPassengerDetails] = useState([]);
  const [validationError, setValidationError] = useState('');

  const navigate = useNavigate();

  // Synchronize passenger form objects array based on requiredPassengersCount
  useEffect(() => {
    const targetCount = Math.max(requiredPassengersCount, 1);
    setPassengerDetails(prev => {
      const newDetails = [...prev];
      while (newDetails.length < targetCount) {
        newDetails.push({ name: '', age: '', gender: 'Male', phone: '' });
      }
      return newDetails.slice(0, targetCount);
    });
  }, [requiredPassengersCount]);

  useEffect(() => {
    fetchBusAndSeats();
  }, [id, dateParam]);

  const fetchBusAndSeats = async () => {
    setLoading(true);
    try {
      let busObj = null;
      let seatsObj = null;

      try {
        const busRes = await axios.get(`/api/buses/${id}`);
        busObj = busRes.data;
      } catch (e1) {
        console.error('Error loading bus profile:', e1);
      }

      try {
        const seatsRes = await axios.get(`/api/buses/${id}/seats?date=${dateParam}`);
        seatsObj = seatsRes.data;
      } catch (e2) {
        console.error('Error loading seat map:', e2);
      }

      if (!busObj) {
        try {
          const allBusesRes = await axios.get('/api/buses');
          if (allBusesRes.data.buses?.length) {
            busObj = allBusesRes.data.buses[0];
            const fallbackSeatsRes = await axios.get(`/api/buses/${busObj.bus_id}/seats?date=${dateParam}`);
            seatsObj = fallbackSeatsRes.data;
          }
        } catch (e3) {
          console.error('Fallback bus fetch failed:', e3);
        }
      }

      if (busObj) {
        setBus(busObj);
        if (busObj.boarding_points?.length) setBoardingPoint(busObj.boarding_points[0]);
        if (busObj.dropping_points?.length) setDroppingPoint(busObj.dropping_points[0]);
      }
      if (seatsObj) {
        setSeatData(seatsObj);
      }
    } catch (e) {
      console.error('Error loading seat layout:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatNo) => {
    setValidationError('');
    if (selectedSeats.includes(seatNo)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNo));
    } else {
      if (selectedSeats.length >= requiredPassengersCount) {
        setValidationError(`You selected ${requiredPassengersCount} passenger(s). Deselect an existing seat first to choose a different one.`);
        return;
      }
      if (selectedSeats.length >= 6) {
        setValidationError('Maximum 6 seats per booking allowed.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNo]);
    }
  };

  const handlePassengerChange = (index, field, value) => {
    setPassengerDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setValidationError('');
  };

  const handleUseMyProfile = (index) => {
    if (!user) return;
    setPassengerDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        name: user.name || '',
        age: user.dob ? (new Date().getFullYear() - new Date(user.dob).getFullYear()) : 25,
        gender: user.gender || 'Male',
        phone: user.phone || ''
      };
      return updated;
    });
  };

  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      setValidationError('Please select at least 1 seat to proceed.');
      return;
    }

    if (selectedSeats.length !== requiredPassengersCount) {
      setValidationError(`Please select exactly ${requiredPassengersCount} seat(s) for your ${requiredPassengersCount} passenger(s). Currently selected: ${selectedSeats.length}.`);
      return;
    }

    // Require exact passenger details matching selected seats
    const countNeeded = requiredPassengersCount;
    for (let i = 0; i < countNeeded; i++) {
      const p = passengerDetails[i];
      if (!p || !p.name.trim()) {
        setValidationError(`Please complete Passenger ${i + 1} Name before continuing.`);
        return;
      }
      if (!p.age || parseInt(p.age, 10) <= 0) {
        setValidationError(`Please complete Passenger ${i + 1} Age before continuing.`);
        return;
      }
      if (!p.phone || !p.phone.trim()) {
        setValidationError(`Please complete Passenger ${i + 1} Phone Number before continuing.`);
        return;
      }
    }

    setValidationError('');

    const bookingPayload = {
      bus_id: bus.bus_id,
      journey_date: dateParam,
      selected_seats: selectedSeats,
      boarding_point: boardingPoint,
      dropping_point: droppingPoint,
      passenger_details: passengerDetails.slice(0, countNeeded),
      total_amount: requiredPassengersCount * bus.fare
    };

    localStorage.setItem('tv_pending_booking', JSON.stringify(bookingPayload));
    navigate('/mock-payment');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500">Rendering seat layout matrix...</p>
      </div>
    );
  }

  const totalFare = selectedSeats.length * (bus ? bus.fare : 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between shadow-lg">
        <div>
          <span className="text-xs text-cyan-400 font-mono font-semibold">Seat Selection & Passenger Details</span>
          <h1 className="text-2xl font-bold mt-0.5">{bus.operator_name} ({bus.bus_type})</h1>
          <p className="text-xs text-slate-400 mt-1">
            {bus.source} → {bus.destination} • Journey Date: <strong className="text-white">{dateParam}</strong> • Departure: {bus.departure_time}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 text-right">
          <span className="text-xs text-slate-400 block">Single Seat Fare</span>
          <span className="text-2xl font-black text-cyan-400">₹{bus.fare}</span>
        </div>
      </div>

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center space-x-2 text-xs font-semibold shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Bus Interactive Seat Layout */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Select Your Preferred Seats</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeting <strong className="text-cyan-600">{requiredPassengersCount} seat(s)</strong> for your booking.
              </p>
            </div>

            {/* Seat Legends */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></div>
                <span className="text-slate-600">Available</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded bg-cyan-500 border border-cyan-600"></div>
                <span className="text-slate-600">Selected</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded bg-slate-300 border border-slate-400"></div>
                <span className="text-slate-600">Booked</span>
              </div>
            </div>
          </div>

          {/* Bus Shell Container */}
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 max-w-md mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-300 pb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Front Entry</span>
              <div className="w-8 h-8 rounded-full border-2 border-slate-400 flex items-center justify-center text-slate-600 font-extrabold text-[10px]" title="Driver Cabin">
                🚗
              </div>
            </div>

            {/* Seats Grid Matrix */}
            <div className="grid grid-cols-4 gap-3">
              {seatData?.seats?.map((seat) => {
                const isSelected = selectedSeats.includes(seat.seat_number);
                const isBooked = seat.is_booked;

                return (
                  <button
                    key={seat.seat_number}
                    disabled={isBooked}
                    onClick={() => toggleSeat(seat.seat_number)}
                    className={`py-3 rounded-xl font-mono text-xs font-bold transition flex flex-col items-center justify-center border shadow-xs ${
                      isBooked
                        ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-500 border-cyan-600 text-slate-950 font-extrabold shadow-md shadow-cyan-500/30 scale-105'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <span>{seat.seat_number}</span>
                    <span className="text-[9px] font-normal opacity-75">{seat.type[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Passenger details & Boarding/Dropping */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-sm">Boarding & Dropping Points</h3>

            {/* Boarding Point */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Boarding Location</label>
              <select
                value={boardingPoint}
                onChange={(e) => setBoardingPoint(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                {(bus.boarding_points || [`${bus.source} Main Hub`]).map((pt, i) => (
                  <option key={i} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            {/* Dropping Point */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Dropping Location</label>
              <select
                value={droppingPoint}
                onChange={(e) => setDroppingPoint(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                {(bus.dropping_points || [`${bus.destination} Central Stand`]).map((pt, i) => (
                  <option key={i} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Passenger Forms */}
            <div className="space-y-4 border-t border-slate-100 pt-4 text-xs">
              <h4 className="font-bold text-slate-900 text-xs">
                Passenger Details ({requiredPassengersCount} Passenger{requiredPassengersCount > 1 ? 's' : ''})
              </h4>

              {Array.from({ length: requiredPassengersCount }).map((_, idx) => {
                const details = passengerDetails[idx] || { name: '', age: '', gender: 'Male', phone: '' };

                return (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Passenger {idx + 1} {selectedSeats[idx] ? `(Seat: ${selectedSeats[idx]})` : ''}</span>
                      </span>

                      {/* Optional "Use My Profile" button */}
                      {user && (
                        <button
                          type="button"
                          onClick={() => handleUseMyProfile(idx)}
                          className="text-[10px] text-cyan-600 hover:underline font-bold flex items-center space-x-1"
                          title="Auto-fill with your logged in profile"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Use My Profile</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={details.name}
                        onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                        placeholder="Enter passenger name"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Age *</label>
                        <input
                          type="number"
                          value={details.age}
                          onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)}
                          placeholder="Age"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Gender *</label>
                        <select
                          value={details.gender}
                          onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={details.phone}
                        onChange={(e) => handlePassengerChange(idx, 'phone', e.target.value)}
                        placeholder="Phone number"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fare Summary & CTA */}
          <div className="bg-slate-900 p-6 rounded-3xl text-white border border-slate-800 shadow-xl space-y-4">
            <div className="space-y-2 border-b border-slate-800 pb-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Seats Selected ({selectedSeats.length} / {requiredPassengersCount}):</span>
                <span className="font-mono font-bold text-white">{selectedSeats.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Base Fare:</span>
                <span>₹{bus.fare} × {requiredPassengersCount}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-2 text-white border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="text-cyan-400">₹{requiredPassengersCount * bus.fare}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={selectedSeats.length === 0}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg transition ${
                selectedSeats.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              <span>PROCEED TO PAYMENT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
