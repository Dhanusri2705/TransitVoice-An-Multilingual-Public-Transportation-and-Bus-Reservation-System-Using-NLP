import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Mic, ArrowRightLeft, Calendar, Users, MapPin, Sparkles, Navigation, ShieldCheck, Star, Bot, Cpu, CheckCircle2, AlertCircle, Info, Languages } from 'lucide-react';
import { VoiceContext } from '../context/VoiceContext';

export const Home = () => {
  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateStr();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('');
  const [searchError, setSearchError] = useState('');

  // Natural Language Search State
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState('');
  const [nlInsight, setNlInsight] = useState(null);

  const { startListening } = useContext(VoiceContext);
  const navigate = useNavigate();

  const handleNLPSearch = async (e) => {
    e?.preventDefault();
    setNlError('');
    setNlInsight(null);
    setSearchError('');

    const query = nlQuery.trim();
    if (!query) {
      setNlError('Please enter a bus query in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം.');
      return;
    }

    setNlLoading(true);
    try {
      const res = await axios.post('/api/nlp/process', { text: query });
      const data = res.data;

      if (data.error && (!data.entities || Object.keys(data.entities).length === 0)) {
        setNlError(data.error);
        return;
      }

      const entities = data.entities || {};
      let populatedList = [];

      if (entities.SOURCE) {
        setSource(entities.SOURCE);
        populatedList.push(`From: ${entities.SOURCE}`);
      }
      if (entities.DESTINATION) {
        setDestination(entities.DESTINATION);
        populatedList.push(`To: ${entities.DESTINATION}`);
      }
      if (entities.DATE) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(entities.DATE) && entities.DATE >= todayStr) {
          setDate(entities.DATE);
          populatedList.push(`Date: ${entities.DATE}`);
        } else if (entities.DATE.toLowerCase() === 'today') {
          setDate(todayStr);
          populatedList.push(`Date: ${todayStr} (Today)`);
        } else if (entities.DATE.toLowerCase() === 'tomorrow') {
          const tm = new Date();
          tm.setDate(tm.getDate() + 1);
          const y = tm.getFullYear();
          const m = String(tm.getMonth() + 1).padStart(2, '0');
          const d = String(tm.getDate()).padStart(2, '0');
          const tmStr = `${y}-${m}-${d}`;
          setDate(tmStr);
          populatedList.push(`Date: ${tmStr} (Tomorrow)`);
        }
      }
      if (entities.PASSENGERS) {
        const pNum = parseInt(entities.PASSENGERS, 10);
        if (pNum >= 1 && pNum <= 6) {
          setPassengers(String(pNum));
          populatedList.push(`Passengers: ${pNum}`);
        }
      }

      const intent = data.detected_intent;
      const isSearchIntent = intent === 'bus_search' || intent === 'route_search';

      setNlInsight({
        language: data.detected_language,
        languageCode: data.detected_language_code,
        translation: data.translated_text,
        intent: data.detected_intent,
        confidence: data.confidence,
        entities: entities,
        response: data.response,
        isSearchIntent,
        hasPopulatedFields: populatedList.length > 0,
        populatedSummary: populatedList.length > 0 ? populatedList.join(' • ') : 'No direct cities recognized'
      });
    } catch (err) {
      console.error('NLP Search error:', err);
      setNlError('Failed to process natural language query. Please verify server connection or use manual search.');
    } finally {
      setNlLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearchError('');

    if (!source.trim()) {
      setSearchError('Please enter departure city (From).');
      return;
    }

    if (!destination.trim()) {
      setSearchError('Please enter destination city (To).');
      return;
    }

    if (!date) {
      setSearchError('Please select a journey date before searching.');
      return;
    }

    if (date < todayStr) {
      setSearchError('Journey date cannot be in the past.');
      return;
    }

    const paxNum = parseInt(passengers, 10);
    if (!passengers || isNaN(paxNum) || paxNum < 1 || paxNum > 6) {
      setSearchError('Please select number of passengers (1 to 6).');
      return;
    }

    navigate(`/search?source=${encodeURIComponent(source.trim())}&destination=${encodeURIComponent(destination.trim())}&date=${date}&passengers=${paxNum}`);
  };

  const swapCities = () => {
    setSource(destination);
    setDestination(source);
    setSearchError('');
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white pt-16 pb-24 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-cyan-500/10 to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>All-India Multilingual AI Bus Transport Portal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Travel across all states. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                Just speak naturally.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Search buses connecting all Indian states and districts, check live fares, reserve seats, track GPS location, and register complaints in English, Tamil, and Hindi.
            </p>
          </div>

          {/* Bus Search Card */}
          <div className="mt-10 max-w-4xl mx-auto bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {searchError && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-2xl font-semibold text-center">
                {searchError}
              </div>
            )}
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* FROM */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>From (City / District / State)</span>
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => { setSource(e.target.value); setSearchError(''); }}
                  placeholder="Departure city, district, state"
                  className="w-full bg-transparent font-bold text-sm text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              {/* TO */}
              <div className="relative space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>To (City / District / State)</span>
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setSearchError(''); }}
                  placeholder="Destination city, district, state"
                  className="w-full bg-transparent font-bold text-sm text-white focus:outline-none placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={swapCities}
                  className="absolute right-3 top-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-full border border-slate-700 transition"
                  title="Swap Cities"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* DATE */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Journey Date</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setSearchError(''); }}
                  className="w-full bg-transparent font-bold text-xs text-white focus:outline-none"
                />
                {!date && (
                  <span className="text-[10px] text-slate-400 block pointer-events-none">
                    Select journey date
                  </span>
                )}
              </div>

              {/* PASSENGERS */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Passengers</span>
                </label>
                <select
                  value={passengers}
                  onChange={(e) => { setPassengers(e.target.value); setSearchError(''); }}
                  className={`w-full bg-transparent font-bold text-sm focus:outline-none ${passengers ? 'text-white' : 'text-slate-400'}`}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">Select passengers</option>
                  <option value="1" className="bg-slate-900 text-white">1 Passenger</option>
                  <option value="2" className="bg-slate-900 text-white">2 Passengers</option>
                  <option value="3" className="bg-slate-900 text-white">3 Passengers</option>
                  <option value="4" className="bg-slate-900 text-white">4 Passengers</option>
                  <option value="5" className="bg-slate-900 text-white">5 Passengers</option>
                  <option value="6" className="bg-slate-900 text-white">6 Passengers</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition active:scale-98"
                >
                  <Search className="w-4 h-4" />
                  <span>SEARCH BUSES</span>
                </button>
                <button
                  type="button"
                  onClick={startListening}
                  className="px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-rose-500/25 transition active:scale-98"
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>🎤 SEARCH BY VOICE</span>
                </button>
              </div>
            </form>

            {/* Natural Language Bus Search Section */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                      <span>Search with Natural Language</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                        Multilingual NLP
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Type your route or query in your native tongue — our AI translates, classifies intent, and auto-fills the search.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-medium">English</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-medium">தமிழ்</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-medium">हिन्दी</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-medium">తెలుగు</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-pink-300 font-medium">മലയാളം</span>
                </div>
              </div>

              {nlError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-2xl font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{nlError}</span>
                </div>
              )}

              <form onSubmit={handleNLPSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={nlQuery}
                    onChange={(e) => { setNlQuery(e.target.value); setNlError(''); }}
                    placeholder="Ask for a bus in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം..."
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-950/80 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium shadow-inner"
                  />
                  {nlLoading && (
                    <div className="absolute right-3.5 top-3.5">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={nlLoading}
                  className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2 shrink-0 active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>{nlLoading ? 'Processing Query...' : 'Understand & Search'}</span>
                </button>
              </form>

              {/* Natural Language Insights & Extracted Confirmation Card */}
              {nlInsight && (
                <div className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl space-y-3 animate-fade-in text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/30">
                        {nlInsight.language} ({nlInsight.languageCode})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30">
                        Intent: {nlInsight.intent} ({Math.round(nlInsight.confidence * 100)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNlInsight(null)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">English Translation Preview</span>
                      {nlInsight.languageCode === 'en' ? (
                        <p className="font-semibold text-white mt-0.5 italic">"{nlInsight.translation}" <span className="text-slate-400 text-[10px] not-italic">(Original English)</span></p>
                      ) : nlInsight.translation ? (
                        <p className="font-semibold text-cyan-200 mt-0.5 italic">"{nlInsight.translation}"</p>
                      ) : (
                        <p className="font-medium text-amber-400 mt-0.5 italic text-[11px]">Translation service unavailable or unchanged.</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Extracted Form Fields</span>
                      <p className="font-bold text-cyan-300 mt-0.5">{nlInsight.populatedSummary}</p>
                    </div>
                  </div>

                  {nlInsight.response && !nlInsight.isSearchIntent && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                      <span className="text-[10px] text-amber-400 font-bold uppercase block">Assistant Information:</span>
                      <p className="text-xs leading-relaxed">{nlInsight.response}</p>
                    </div>
                  )}

                  {nlInsight.isSearchIntent && nlInsight.hasPopulatedFields && (
                    <div className="flex items-center space-x-2 text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Route details recognized and populated above! Confirm date and passengers, then click <strong>SEARCH BUSES</strong>.</span>
                    </div>
                  )}

                  {nlInsight.intent === 'complaint' && (
                    <div className="flex items-center justify-between text-[11px] text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Query classified as a service grievance.</span>
                      </div>
                      <Link to="/complaints" className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition">
                        Go to Complaints
                      </Link>
                    </div>
                  )}

                  {nlInsight.intent === 'feedback' && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Query classified as positive passenger feedback.</span>
                      </div>
                      <Link to="/feedback" className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition">
                        Share Feedback
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Popular Voice Command Chips */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">Popular Voice Queries:</span>
              <button
                onClick={startListening}
                className="px-3 py-1 bg-slate-800/80 hover:bg-slate-800 text-cyan-300 rounded-full border border-slate-700 transition"
              >
                "Sleeper bus from Bangalore to Mumbai"
              </button>
              <button
                onClick={startListening}
                className="px-3 py-1 bg-slate-800/80 hover:bg-slate-800 text-rose-300 rounded-full border border-slate-700 transition"
              >
                "Delhi to Jaipur bus search"
              </button>
              <button
                onClick={startListening}
                className="px-3 py-1 bg-slate-800/80 hover:bg-slate-800 text-emerald-300 rounded-full border border-slate-700 transition"
              >
                "Where is my bus TV-00102?"
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Interstate & Inter-District Routes</h2>
            <p className="text-xs text-slate-500 mt-1">Connecting key Indian states and districts with dailyRTC and private operators</p>
          </div>
          <Link to="/search" className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All Routes →</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { src: 'Bangalore', dst: 'Chennai', fare: '₹650', buses: 25 },
            { src: 'Mumbai', dst: 'Pune', fare: '₹520', buses: 30 },
            { src: 'Delhi', dst: 'Jaipur', fare: '₹699', buses: 28 },
            { src: 'Hyderabad', dst: 'Bangalore', fare: '₹750', buses: 22 },
            { src: 'Coimbatore', dst: 'Bangalore', fare: '₹600', buses: 18 },
            { src: 'Kochi', dst: 'Coimbatore', fare: '₹450', buses: 14 }
          ].map((r, idx) => (
            <Link
              key={idx}
              to={`/search?source=${r.src}&destination=${r.dst}`}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-500/50 transition group"
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-800 group-hover:text-cyan-600">
                <span>{r.src}</span>
                <span>→</span>
                <span>{r.dst}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>From <strong className="text-slate-900">{r.fare}</strong></span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">{r.buses} buses</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Capabilities & Unique Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 rounded-3xl p-8 text-white border border-slate-800 shadow-xl">
          <div className="max-w-2xl space-y-3 mb-8">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">Academic Innovation</span>
            <h2 className="text-3xl font-extrabold">End-to-End Transport App + Integrated Voice NLP</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              TransitVoice is designed as a complete real-world bus reservation engine with live simulated GPS bus tracking, interactive seat layout, digital QR ticket generation, and passenger complaint tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <Bot className="w-6 h-6 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Multilingual Input</h3>
              <p className="text-slate-400">Captures speech in English, Tamil, and Hindi, automatically detecting intent and extracting route entities.</p>
            </div>
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <Navigation className="w-6 h-6 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Live GPS Bus Tracker</h3>
              <p className="text-slate-400">Interactive Leaflet map showing real-time simulated lat/long movement, speed, and remaining ETA.</p>
            </div>
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <Cpu className="w-6 h-6 text-purple-400" />
              <h3 className="font-bold text-sm text-white">Scikit-Learn NLP Engine</h3>
              <p className="text-slate-400">TF-IDF Vectorization with Calibrated Support Vector Classifier (LinearSVC) and Gazetteer NER matcher.</p>
            </div>
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <ShieldCheck className="w-6 h-6 text-yellow-400" />
              <h3 className="font-bold text-sm text-white">Role-Based Portals</h3>
              <p className="text-slate-400">Dedicated dashboards for Passengers, Bus Operators, and System Administrators with analytics.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
