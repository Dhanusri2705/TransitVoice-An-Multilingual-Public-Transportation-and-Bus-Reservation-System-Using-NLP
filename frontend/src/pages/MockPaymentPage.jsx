import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, ShieldCheck, CheckCircle2, QrCode, Sparkles, AlertCircle } from 'lucide-react';

export const MockPaymentPage = () => {
  const [bookingData, setBookingData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem('tv_pending_booking');
    if (!raw) {
      navigate('/search');
      return;
    }
    try {
      setBookingData(JSON.parse(raw));
    } catch (e) {
      navigate('/search');
    }
  }, [navigate]);

  const handleSimulatePayment = async () => {
    if (!bookingData || isProcessing || paymentSuccess) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await axios.post('/api/bookings', {
        ...bookingData,
        payment_method: 'UPI Demo QR Gateway'
      });

      setPaymentSuccess(true);
      localStorage.removeItem('tv_pending_booking');

      setTimeout(() => {
        navigate(`/ticket/${res.data.booking.booking_id}`);
      }, 1500);
    } catch (e) {
      console.error('Payment booking error:', e);
      setErrorMessage(e.response?.data?.error || 'Payment simulation failed. Selected seats may no longer be available.');
      setIsProcessing(false);
    }
  };

  if (!bookingData) return null;

  const demoQrPayload = `upi://pay?pa=transitvoice.demo@bank&pn=TransitVoice&am=${bookingData.total_amount}&tr=TV-DEMO-${Date.now()}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="font-extrabold text-lg text-slate-900">TransitVoice Payment Gateway</h2>
              <span className="text-[10px] text-slate-500">Academic Demo Payment Sandbox</span>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>UPI QR Mode</span>
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center space-x-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Booking Summary Card */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 block">Total Amount Payable</span>
            <span className="text-3xl font-black text-cyan-400">₹{bookingData.total_amount}</span>
          </div>
          <div className="text-right text-xs font-mono text-slate-300 space-y-0.5">
            <p className="font-bold text-white">Seats: {bookingData.selected_seats?.join(', ')}</p>
            <p className="text-slate-400">Date: {bookingData.journey_date}</p>
          </div>
        </div>

        {/* UPI Payment Instrument Section */}
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center space-x-3 text-cyan-950 font-semibold">
            <Smartphone className="w-5 h-5 text-cyan-600 shrink-0" />
            <div className="text-[11px]">
              <p className="font-bold text-cyan-900">UPI Digital Payment (Google Pay / PhonePe / Paytm / BHIM)</p>
              <p className="text-cyan-700 font-normal">Scan the demo QR code below or tap simulate payment to complete your reservation.</p>
            </div>
          </div>

          {/* Demo QR Code Visual Block */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-cyan-400 inline-block shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(demoQrPayload)}`}
                alt="Demo Payment QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-600 block">
                Demo Payment Ref: <strong className="text-slate-900 font-bold">TV-PAY-{Date.now().toString().slice(-6)}</strong>
              </span>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                This is a non-sensitive sandbox simulation for capstone evaluation. No real currency is charged.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Action */}
        {paymentSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-2 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="font-black text-slate-900 text-lg">Demo Payment Authorized!</h3>
            <p className="text-xs text-slate-600">Reserving seats & generating digital QR pass ticket...</p>
          </div>
        ) : (
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm shadow-lg transition flex items-center justify-center space-x-2 ${
              isProcessing
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25 active:scale-98'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying Seat Availability & Authorizing...</span>
              </div>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>SIMULATE SUCCESSFUL PAYMENT (₹{bookingData.total_amount})</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
