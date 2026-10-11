import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, Globe, Calendar, MapPin, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export const UserProfilePage = () => {
  const { user, fetchProfile } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [preferredLang, setPreferredLang] = useState('English');
  const [profileImage, setProfileImage] = useState('');
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setDob(user.dob || '');
      setGender(user.gender || 'Male');
      setPreferredLang(user.preferred_language || 'English');
      setProfileImage(user.profile_image || '');
      setAddress(user.address || '');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <h3 className="font-bold text-slate-800">Please sign in to view your profile</h3>
      </div>
    );
  }

  const isProfileIncomplete = !user.name || !user.phone || !user.profile_completed;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/api/auth/profile', {
        name,
        phone,
        dob,
        gender,
        preferred_language: preferredLang,
        profile_image: profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        address
      });
      await fetchProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src={profileImage || user.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            alt="Avatar"
            className="w-16 h-16 rounded-2xl border-2 border-cyan-400 bg-slate-800 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{user.name || 'Account User'}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">{user.role}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Your Profile Prompt for New Users */}
      {isProfileIncomplete && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950">Complete Your Profile</h4>
            <p className="text-amber-800">
              Please enter your full name, phone number, and personal details below to personalize your bookings and digital bus tickets.
            </p>
          </div>
        </div>
      )}

      {/* Profile Edit Form */}
      <form onSubmit={handleUpdate} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">Personal Profile Settings</h3>
          <span className="text-[11px] text-slate-400 font-mono">ID: {user.user_id}</span>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Profile saved successfully to database!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dhanusri"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Email (Read only) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Email Address (Account ID)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Preferred Language */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Preferred Language</label>
            <select
              value={preferredLang}
              onChange={(e) => setPreferredLang(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="English">English</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>

        {/* Profile Photo URL */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 block">Profile Photo URL (Optional)</label>
          <input
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Address */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 block">Residential Address</label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, city, district, pincode"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition"
        >
          {loading ? 'SAVING...' : 'SAVE PROFILE'}
        </button>
      </form>
    </div>
  );
};
