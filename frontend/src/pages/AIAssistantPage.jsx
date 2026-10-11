import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Mic, Bot, Sparkles, User, RefreshCw, Volume2, Search } from 'lucide-react';
import { VoiceContext } from '../context/VoiceContext';

export const AIAssistantPage = () => {
  const navigate = useNavigate();
  const { startListening, processQuery, speakText } = useContext(VoiceContext);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am TransitVoice Assistant. How can I assist your transport booking or tracking today?',
      intent: 'greeting',
      entities: {}
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputVal;
    if (!query.trim()) return;

    // Add user message
    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    const nlpRes = await processQuery(query);
    setLoading(false);

    if (nlpRes) {
      const assistantMsg = {
        sender: 'assistant',
        text: nlpRes.response || 'I processed your query.',
        intent: nlpRes.detected_intent,
        entities: nlpRes.entities || {},
        matched_buses: nlpRes.matched_buses || [],
        detected_language: nlpRes.detected_language,
        detected_language_code: nlpRes.detected_language_code,
        translated_text: nlpRes.translated_text
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
            <Bot className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold">TransitVoice AI Conversational Hub</h1>
            <p className="text-xs text-slate-400">Natural language search, grounded QA & voice assistance</p>
          </div>
        </div>

        <button
          onClick={startListening}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md transition"
        >
          <Mic className="w-4 h-4 animate-pulse" />
          <span>🎤 Speak</span>
        </button>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: 'en', text: "AC bus from Coimbatore to Chennai tomorrow under 700 rupees" },
          { label: 'ta', text: "நாளை கோயம்புத்தூரிலிருந்து சென்னைக்கு பேருந்து உள்ளதா?" },
          { label: 'hi', text: "चेन्नई से मदुरै के लिए सबसे सस्ती बस कौन सी है?" },
          { label: 'te', text: "హైదరాబాద్ నుండి విజయవాడకు బస్సులు ఉన్నాయా?" },
          { label: 'ml', text: "എറണാകുളത്ത് നിന്ന് തിരുവനന്തപുരത്തേക്ക് ബസ് ഉണ്ടോ?" },
          { label: 'qa', text: "What is the cancellation refund policy?" }
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.text)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-medium transition shadow-xs flex items-center space-x-1"
          >
            <span className="font-mono text-[10px] text-cyan-600 font-bold uppercase">[{chip.label}]</span>
            <span>"{chip.text.length > 35 ? chip.text.slice(0, 35) + '...' : chip.text}"</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[420px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              m.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-cyan-400'
            }`}>
              {m.sender === 'user' ? 'U' : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-xl p-4 rounded-2xl text-xs space-y-2 ${
              m.sender === 'user'
                ? 'bg-cyan-600 text-white font-medium rounded-tr-none'
                : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <p className="leading-relaxed">{m.text}</p>

              {/* Multilingual Translation Info Pill */}
              {m.sender === 'assistant' && m.detected_language && m.detected_language_code !== 'en' && m.translated_text && (
                <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-slate-700 text-[11px] space-y-0.5">
                  <div className="flex items-center space-x-1.5 font-bold text-cyan-800">
                    <span>Language: {m.detected_language} ({m.detected_language_code})</span>
                  </div>
                  <p className="italic text-slate-600">English query: "{m.translated_text}"</p>
                </div>
              )}

              {/* Speaker TTS & View Search Results Buttons */}
              {m.sender === 'assistant' && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  {/* Intent-Driven Action Buttons */}
                  {m.intent === 'complaint' && (
                    <button
                      type="button"
                      onClick={() => navigate('/complaints')}
                      className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <span>SUBMIT COMPLAINT</span>
                    </button>
                  )}

                  {m.intent === 'feedback' && (
                    <button
                      type="button"
                      onClick={() => navigate('/feedback')}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <span>SUBMIT FEEDBACK</span>
                    </button>
                  )}

                  {(m.intent === 'tracking' || m.intent === 'bus_status') && (
                    <button
                      type="button"
                      onClick={() => navigate('/my-bookings')}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <span>TRACK BUS</span>
                    </button>
                  )}

                  {!['complaint', 'feedback', 'tracking', 'bus_status', 'greeting', 'help'].includes(m.intent) && (m.entities?.SOURCE || m.entities?.DESTINATION || ['bus_search', 'route_search', 'fare_inquiry', 'bus_timing', 'seat_availability'].includes(m.intent)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const src = m.entities?.SOURCE || '';
                        const dst = m.entities?.DESTINATION || '';
                        const date = m.entities?.DATE || '';
                        const dateQuery = date ? `&date=${encodeURIComponent(date)}` : '';
                        navigate(`/search?source=${encodeURIComponent(src)}&destination=${encodeURIComponent(dst)}${dateQuery}`);
                      }}
                      className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>VIEW SEARCH RESULTS</span>
                    </button>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex space-x-2">
                      {m.intent && <span className="font-mono font-semibold text-purple-700">Intent: {m.intent}</span>}
                    </div>
                    <button onClick={() => speakText(m.text)} className="p-1 hover:text-cyan-600" title="Read aloud">
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium italic">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Assistant is thinking & processing database QA...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-3">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask a question in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം..."
          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:outline-none focus:border-cyan-500 shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-1"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
