import React, { useState, useContext } from 'react';
import { X, Lock, Mail, User, Shield, Bus, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickLogin = (userType) => {
    if (userType === 'USER') {
      setEmail('user@transitvoice.com');
      setPassword('password123');
    } else if (userType === 'OPERATOR') {
      setEmail('operator@transitvoice.com');
      setPassword('password123');
    } else if (userType === 'ADMIN') {
      setEmail('admin@transitvoice.com');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register({ name, email, password, phone, role });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">{isRegister ? 'Create Account' : 'Welcome to TransitVoice'}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister ? 'Sign up to book tickets and manage voice trips' : 'Sign in to access digital tickets, tracking & complaints'}
          </p>
        </div>

        {/* Quick Demo Sign In Buttons */}
        {!isRegister && (
          <div className="mb-6 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block text-center">Quick Demo Login</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('USER')}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 border border-slate-700 font-medium text-center"
              >
                👤 Passenger
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATOR')}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-300 border border-slate-700 font-medium text-center"
              >
                🚌 Operator
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-purple-300 border border-slate-700 font-medium text-center"
              >
                🛡️ Admin
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Arun Kumar"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block mb-1 text-slate-300 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@transitvoice.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-slate-300 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block mb-1 text-slate-300 font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
              >
                <option value="USER">Passenger User</option>
                <option value="OPERATOR">Bus Operator</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-cyan-500/20 text-sm"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-cyan-400 hover:underline font-medium"
          >
            {isRegister ? 'Already have an account? Sign In' : 'New to TransitVoice? Create an Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
