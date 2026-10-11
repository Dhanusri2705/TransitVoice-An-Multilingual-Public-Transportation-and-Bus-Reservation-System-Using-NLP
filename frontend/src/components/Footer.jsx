import React from 'react';
import { Bus, Mic, ShieldCheck, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl text-white">Transit<span className="text-cyan-400">Voice</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered Multilingual Voice-Enabled Public Transport Information, Bus Booking, Live Tracking and Passenger Assistance Platform.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Academic NLP Capstone Prototype 2026</span>
            </div>
          </div>

          {/* Popular Routes */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs tracking-wider uppercase">Popular Bus Routes</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/search?source=Chennai&destination=Coimbatore" className="hover:text-cyan-400">Chennai → Coimbatore</a></li>
              <li><a href="/search?source=Coimbatore&destination=Chennai" className="hover:text-cyan-400">Coimbatore → Chennai</a></li>
              <li><a href="/search?source=Chennai&destination=Madurai" className="hover:text-cyan-400">Chennai → Madurai</a></li>
              <li><a href="/search?source=Bangalore&destination=Chennai" className="hover:text-cyan-400">Bangalore → Chennai</a></li>
              <li><a href="/search?source=Bangalore&destination=Hyderabad" className="hover:text-cyan-400">Bangalore → Hyderabad</a></li>
            </ul>
          </div>

          {/* Voice Features */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs tracking-wider uppercase">Multilingual Voice Commands</h4>
            <ul className="space-y-2 text-xs italic text-slate-400">
              <li>"I want an AC bus from Coimbatore to Chennai tomorrow"</li>
              <li>"Coimbatore lendhu Chennai ku bus irukka?"</li>
              <li>"Chennai se Madurai jane ke liye bus hai kya?"</li>
              <li>"My bus from Chennai to Madurai is delayed"</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs tracking-wider uppercase">Quick Access</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/nlp-demo" className="hover:text-cyan-400 text-cyan-300">NLP Debug & Academic Demo</a></li>
              <li><a href="/tracking/TV-00001" className="hover:text-cyan-400">Live GPS Bus Tracker</a></li>
              <li><a href="/my-bookings" className="hover:text-cyan-400">Digital Ticket QR Code</a></li>
              <li><a href="/complaints" className="hover:text-cyan-400">Complaint Status Tracker</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <p>© 2026 TransitVoice Platform. All rights reserved.</p>
          <div className="flex items-center space-x-1 mt-2 md:mt-0">
            <span>Built with NLP & Voice Interaction for Public Transport</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
