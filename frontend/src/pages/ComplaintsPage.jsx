import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, Mic, CheckCircle2, Clock, Shield, Sparkles, ChevronRight, Languages, Check, RefreshCw } from 'lucide-react';
import { VoiceContext } from '../context/VoiceContext';

export const ComplaintsPage = () => {
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('booking_id') || '';
  const busIdParam = searchParams.get('bus_id') || '';

  const { startListening, transcript } = useContext(VoiceContext);

  const [bookingId, setBookingId] = useState(bookingIdParam);
  const [busId, setBusId] = useState(busIdParam);
  const [category, setCategory] = useState('Bus Delay');
  const [description, setDescription] = useState('');
  const [nlpInfo, setNlpInfo] = useState(null);
  const [nlpAnalyzing, setNlpAnalyzing] = useState(false);
  const [userComplaints, setUserComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (transcript) {
      setDescription(transcript);
    }
  }, [transcript]);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('/api/complaints');
      setUserComplaints(res.data || []);
    } catch (e) {
      console.error('Error fetching complaints:', e);
    }
  };

  const handleVoiceComplaint = () => {
    startListening();
  };

  // Analyze complaint with shared Multilingual NLP pipeline
  const handleAnalyzeComplaintNLP = async () => {
    const textToAnalyze = description || transcript;
    if (!textToAnalyze.trim()) {
      setFormError('Please enter complaint details in any of the 5 supported languages.');
      return;
    }

    setNlpAnalyzing(true);
    setFormError('');

    try {
      const res = await axios.post('/api/nlp/process', { text: textToAnalyze.trim() });
      const data = res.data;
      if (data) {
        setNlpInfo(data);

        // Auto-categorize based on detected issues, intent, or keywords
        const detectedIssues = data.sentiment?.detected_issues || [];
        const norm = (data.normalized_text || data.translated_text || '').toLowerCase();

        if (detectedIssues.includes('Bus Delay') || norm.includes('delay') || norm.includes('late')) {
          setCategory('Bus Delay');
        } else if (detectedIssues.includes('Cleanliness') || norm.includes('dirty') || norm.includes('smell') || norm.includes('trash')) {
          setCategory('Cleanliness');
        } else if (detectedIssues.includes('Driver Behaviour') || norm.includes('driver') || norm.includes('rash') || norm.includes('overspeed')) {
          setCategory('Driver Behaviour');
        } else if (detectedIssues.includes('AC Issue') || norm.includes('ac') || norm.includes('cooling') || norm.includes('hot')) {
          setCategory('AC Issue');
        } else if (detectedIssues.includes('Seat Issue') || norm.includes('seat') || norm.includes('broken')) {
          setCategory('Seat Issue');
        } else if (norm.includes('cancel')) {
          setCategory('Bus Cancellation');
        } else if (norm.includes('staff') || norm.includes('conductor')) {
          setCategory('Staff Behaviour');
        } else if (norm.includes('fare') || norm.includes('money') || norm.includes('charge')) {
          setCategory('Overcharging');
        } else if (norm.includes('safety') || norm.includes('accident') || norm.includes('danger')) {
          setCategory('Safety Issue');
        }

        // Auto-extract bus number / bus id if present in NER entities
        if (data.entities?.BUS_ID && !busId) {
          setBusId(data.entities.BUS_ID);
        } else if (data.entities?.BUS_NUMBER && !busId) {
          setBusId(data.entities.BUS_NUMBER);
        }
      }
    } catch (e) {
      console.error('NLP complaint processing error:', e);
      setFormError('Could not connect to NLP engine. You can still submit manually.');
    } finally {
      setNlpAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const textToSubmit = description || transcript;
    if (!textToSubmit.trim()) {
      setFormError('Please enter a detailed description of your grievance.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/complaints', {
        booking_id: bookingId,
        bus_id: busId,
        category,
        description: textToSubmit.trim(),
        original_text: textToSubmit.trim(),
        detected_language: nlpInfo?.detected_language || 'English',
        detected_language_code: nlpInfo?.detected_language_code || 'en',
        translated_text: nlpInfo?.translated_text || textToSubmit.trim(),
        sentiment: nlpInfo?.sentiment?.sentiment || 'NEGATIVE',
        NLP_detected_intent: nlpInfo?.detected_intent || 'complaint',
        NLP_entities: nlpInfo?.entities || {}
      });

      setSubmittedTicket(res.data.complaint);
      setDescription('');
      setNlpInfo(null);
      fetchComplaints();
    } catch (e) {
      console.error('Submit complaint error:', e);
      setFormError(e.response?.data?.error || 'Failed to register complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-rose-400 font-mono font-semibold">Passenger Grievance Redressal</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
            Multilingual NLP (en, ta, hi, te, ml)
          </span>
        </div>
        <h1 className="text-2xl font-bold">Complaint & Service Issue Portal</h1>
        <p className="text-xs text-slate-400">
          File complaints in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം — our NLP pipeline automatically translates, classifies grievance categories, and tracks resolutions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Submit Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Lodge a Service Complaint</span>
            </h3>
            <div className="flex items-center space-x-1 text-[10px] text-slate-500">
              <Languages className="w-3.5 h-3.5 text-cyan-600" />
              <span>5 Languages Supported</span>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {submittedTicket ? (
            <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-3 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-900 text-base">Complaint Registered Successfully</h4>
              <p className="text-xs text-slate-600">
                Ticket Reference: <strong className="font-mono text-emerald-800">{submittedTicket.complaint_id}</strong>
              </p>
              <div className="p-3 bg-white/80 rounded-2xl border border-emerald-200 text-left text-xs max-w-md mx-auto space-y-1">
                <p><strong>Category:</strong> {submittedTicket.category}</p>
                <p><strong>Language:</strong> {submittedTicket.detected_language} ({submittedTicket.detected_language_code})</p>
                <p className="text-[11px] text-slate-500 truncate"><strong>Original Text:</strong> {submittedTicket.original_text}</p>
                {submittedTicket.detected_language_code !== 'en' && (
                  <p className="text-[11px] text-slate-600 italic"><strong>English Translation:</strong> {submittedTicket.translated_text}</p>
                )}
              </div>
              <button
                onClick={() => setSubmittedTicket(null)}
                className="mt-3 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                File Another Complaint
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Voice Complaint Trigger */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shadow-sm">
                    <Mic className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-bold text-slate-900">Speak or Type Complaint</h4>
                    <p className="text-[11px] text-slate-600">English, தமிழ், हिन्दी, తెలుగు, or മലയാളം supported</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleVoiceComplaint}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  🎤 Speak Complaint
                </button>
              </div>

              {/* Reference IDs (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Booking ID (Optional)</label>
                  <input
                    type="text"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="e.g. BK-123456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bus Number / ID (Optional)</label>
                  <input
                    type="text"
                    value={busId}
                    onChange={(e) => setBusId(e.target.value)}
                    placeholder="e.g. TN-01-N-9012 or TV-00022"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Complaint Category Dropdown */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Complaint Category</span>
                  {nlpInfo && (
                    <span className="text-[10px] text-cyan-600 font-normal">
                      Auto-categorized via NLP
                    </span>
                  )}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                >
                  {[
                    "Bus Delay", "Bus Cancellation", "Driver Behaviour", "Staff Behaviour",
                    "Cleanliness", "Seat Issue", "Overcharging", "AC Issue", "Safety Issue", "Other"
                  ].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700 block">Detailed Description *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setFormError(''); }}
                  placeholder="Describe what occurred in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500 text-xs"
                />
                
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAnalyzeComplaintNLP}
                    disabled={nlpAnalyzing || !description.trim()}
                    className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center space-x-1.5 text-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{nlpAnalyzing ? 'Translating & Categorizing...' : 'Analyze & Translate (NLP)'}</span>
                  </button>

                  <span className="text-[10px] text-slate-400">
                    Supports 5 languages
                  </span>
                </div>
              </div>

              {/* Multilingual NLP Analysis Preview Card */}
              {nlpInfo && (
                <div className="p-4 bg-slate-950 text-white rounded-2xl text-xs space-y-2 border border-slate-800 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>NLP Multilingual Pre-Classification</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                      Language: {nlpInfo.detected_language} ({nlpInfo.detected_language_code})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">English Translation Preview</span>
                      <p className="italic text-white mt-0.5">"{nlpInfo.translated_text}"</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Detected Intent & Issue</span>
                      <p className="font-semibold text-emerald-400 mt-0.5">
                        {nlpInfo.detected_intent} {nlpInfo.sentiment?.detected_issues?.length ? `• ${nlpInfo.sentiment.detected_issues.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-rose-500/20 transition disabled:opacity-50"
              >
                {loading ? 'Submitting Grievance...' : 'REGISTER COMPLAINT'}
              </button>
            </form>
          )}
        </div>

        {/* Right Col: Complaint Tracker Status List */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Complaint Status Tracker</h3>

            {userComplaints.length === 0 ? (
              <p className="text-xs text-slate-400">No active complaints on file.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {userComplaints.map((c) => (
                  <div key={c.complaint_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-800">{c.complaint_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px]">
                      <span className="font-semibold text-slate-700">{c.category}</span>
                      {c.detected_language_code && c.detected_language_code !== 'en' && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[9px] font-mono font-bold">
                          {c.detected_language}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 text-[11px] line-clamp-2">
                      {c.original_text || c.description}
                    </p>

                    {c.detected_language_code && c.detected_language_code !== 'en' && c.translated_text && (
                      <p className="text-slate-400 text-[10px] italic line-clamp-1">
                        Translation: {c.translated_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
