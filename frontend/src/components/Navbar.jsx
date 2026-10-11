import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Mic, User, Shield, Compass, Navigation, MessageSquare, AlertCircle, Bot, Terminal, LogOut, Menu, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { VoiceContext } from '../context/VoiceContext';

export const Navbar = ({ onOpenAuth }) => {
  const { user, logout } = useContext(AuthContext);
  const { startListening } = useContext(VoiceContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-700/50 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-cyan-400">
                Transit<span className="text-cyan-400">Voice</span>
              </span>
              <span className="text-[10px] text-cyan-300/80 tracking-widest font-medium uppercase">Multilingual AI Transport</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
            <Link to="/search" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition">Search Buses</Link>
            <Link to="/tracking/TV-00001" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center space-x-1">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Track Bus</span>
            </Link>
            <Link to="/my-bookings" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition">My Bookings</Link>
            <Link to="/feedback" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center space-x-1">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              <span>Feedback</span>
            </Link>
            <Link to="/complaints" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center space-x-1">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Complaints</span>
            </Link>
            <Link to="/ai-assistant" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center space-x-1">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Assistant</span>
            </Link>
            <Link to="/nlp-demo" className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
              <Terminal className="w-4 h-4" />
              <span>Academic Demo</span>
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Mic Voice Button */}
            <button
              onClick={startListening}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-pink-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 hover:scale-105 active:scale-95 transition-all"
              title="Click to speak naturally"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Voice Assist</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 border-l border-slate-700 pl-3">
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="p-2 text-cyan-400 hover:bg-slate-800 rounded-lg" title="Admin Portal">
                    <Shield className="w-5 h-5" />
                  </Link>
                )}
                {user.role === 'OPERATOR' && (
                  <Link to="/operator" className="p-2 text-emerald-400 hover:bg-slate-800 rounded-lg" title="Operator Portal">
                    <Bus className="w-5 h-5" />
                  </Link>
                )}
                <Link to="/profile" className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold">
                    {user.name ? user.name.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Profile')}
                  </span>
                </Link>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-400 rounded-lg" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button onClick={startListening} className="p-2 rounded-lg bg-rose-600 text-white">
              <Mic className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-6 space-y-2 text-sm">
          <Link to="/search" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">Search Buses</Link>
          <Link to="/tracking/TV-00001" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">Track Bus</Link>
          <Link to="/my-bookings" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">My Bookings</Link>
          <Link to="/feedback" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">Feedback</Link>
          <Link to="/complaints" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">Complaints</Link>
          <Link to="/ai-assistant" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-200">AI Assistant</Link>
          <Link to="/nlp-demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-cyan-300">Academic Demo</Link>
          {user ? (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-cyan-400 font-semibold">{user.name}</span>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-rose-400">Logout</button>
            </div>
          ) : (
            <button onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} className="w-full mt-3 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg">
              Sign In
            </button>
          )}
        </div>
      )}
    </header>
  );
};
