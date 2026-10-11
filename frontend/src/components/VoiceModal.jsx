import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Sparkles, Send, MapPin, Calendar, Tag, ArrowRight, AlertCircle } from 'lucide-react';
import { VoiceContext } from '../context/VoiceContext';

export const VoiceModal = () => {
  const {
    isListening,
    transcript,
    setTranscript,
    nlpResult,
    isProcessing,
    isModalOpen,
    setIsModalOpen,
    voiceState,
    voiceError,
    startListening,
    stopListening,
    processQuery
  } = useContext(VoiceContext);

  const [inputVal, setInputVal] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (transcript) {
      setInputVal(transcript);
    }
  }, [transcript]);

  if (!isModalOpen) return null;

  const handleIntentAction = () => {
    setIsModalOpen(false);
    const intent = nlpResult?.detected_intent;

    if (intent === 'complaint') {
      navigate('/complaints');
    } else if (intent === 'feedback') {
      navigate('/feedback');
    } else if (intent === 'tracking' || intent === 'bus_status') {
      navigate('/my-bookings');
    } else {
      const entities = nlpResult?.entities || {};
      const { SOURCE, DESTINATION, BUS_TYPE, MAX_FARE, DATE } = entities;
      const dateParam = DATE ? `&date=${encodeURIComponent(DATE)}` : '';
      navigate(`/search?source=${encodeURIComponent(SOURCE || '')}&destination=${encodeURIComponent(DESTINATION || '')}&bus_type=${encodeURIComponent(BUS_TYPE || '')}&max_fare=${encodeURIComponent(MAX_FARE || '')}${dateParam}`);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const query = inputVal || transcript;
    if (query) {
      const res = await processQuery(query);
      if (res) {
        const intent = res.detected_intent;
        if (intent === 'complaint') {
          setTimeout(() => {
            setIsModalOpen(false);
            navigate('/complaints');
          }, 2500);
        } else if (intent === 'feedback') {
          setTimeout(() => {
            setIsModalOpen(false);
            navigate('/feedback');
          }, 2500);
        } else if (intent === 'tracking') {
          setTimeout(() => {
            setIsModalOpen(false);
            navigate('/my-bookings');
          }, 2500);
        } else if (res.entities && (res.entities.SOURCE || res.entities.DESTINATION)) {
          const { SOURCE, DESTINATION, BUS_TYPE, MAX_FARE, DATE } = res.entities;
          const dateParam = DATE ? `&date=${encodeURIComponent(DATE)}` : '';
          setTimeout(() => {
            setIsModalOpen(false);
            navigate(`/search?source=${encodeURIComponent(SOURCE || '')}&destination=${encodeURIComponent(DESTINATION || '')}&bus_type=${encodeURIComponent(BUS_TYPE || '')}&max_fare=${encodeURIComponent(MAX_FARE || '')}${dateParam}`);
          }, 2500);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={() => { stopListening(); setIsModalOpen(false); }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30">
            <Sparkles className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-lg font-bold">TransitVoice AI Voice Assistant</h3>
            <p className="text-xs text-slate-400">Speak naturally in English, Tamil, Hindi, or Tanglish</p>
          </div>
        </div>

        {/* Microphone Error Alert */}
        {voiceError && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Microphone Pulse Animation Container with Explicit UI States */}
        <div className="flex flex-col items-center justify-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-600 text-white voice-active shadow-lg shadow-rose-600/50 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
            }`}
          >
            {isListening ? <Mic className="w-9 h-9 animate-pulse" /> : <MicOff className="w-9 h-9" />}
          </button>
          
          <span className="mt-3 text-xs font-bold tracking-wide uppercase">
            {isListening && <span className="text-rose-400 animate-pulse">🔴 Listening...</span>}
            {isProcessing && <span className="text-cyan-400">⏳ Processing your request...</span>}
            {!isListening && !isProcessing && voiceState === 'RESULT' && <span className="text-emerald-400">✓ Result Generated</span>}
            {!isListening && !isProcessing && voiceState === 'IDLE' && <span className="text-slate-300">🎤 Click mic to speak</span>}
          </span>
        </div>

        {/* Live Recognized Speech Transcript */}
        {(transcript || inputVal) && (
          <div className="mb-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-200">
            <span className="text-[10px] text-cyan-400 font-mono uppercase block mb-0.5">You said:</span>
            <p className="font-semibold text-white">"{inputVal || transcript}"</p>
          </div>
        )}

        {/* Form input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. 'I want an AC bus from Coimbatore to Chennai tomorrow'"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pr-12"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="absolute right-2 top-2 p-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg transition font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Sample Voice Prompts */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="text-slate-500 self-center">Try saying:</span>
          <button
            onClick={() => { setInputVal("Coimbatore lendhu Chennai ku naalaikku evening bus irukka?"); processQuery("Coimbatore lendhu Chennai ku naalaikku evening bus irukka?"); }}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
          >
            "Coimbatore lendhu Chennai ku bus irukka?"
          </button>
          <button
            onClick={() => { setInputVal("My bus from Chennai to Madurai is delayed"); processQuery("My bus from Chennai to Madurai is delayed"); }}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700"
          >
            "My bus is delayed"
          </button>
        </div>

        {/* NLP Extraction Result Card */}
        {nlpResult && (
          <div className="mt-6 p-4 bg-slate-950/80 rounded-2xl border border-cyan-500/30 text-xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                  Lang: {nlpResult.detected_language}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                  Intent: {nlpResult.detected_intent} ({Math.round(nlpResult.confidence * 100)}%)
                </span>
              </div>
            </div>

            {/* Extracted Entities */}
            {nlpResult.entities && Object.keys(nlpResult.entities).length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                {nlpResult.entities.SOURCE && (
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>From: <strong>{nlpResult.entities.SOURCE}</strong></span>
                  </div>
                )}
                {nlpResult.entities.DESTINATION && (
                  <div className="flex items-center space-x-1.5 text-cyan-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>To: <strong>{nlpResult.entities.DESTINATION}</strong></span>
                  </div>
                )}
                {nlpResult.entities.DATE && (
                  <div className="flex items-center space-x-1.5 text-yellow-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date: <strong>{nlpResult.entities.DATE}</strong></span>
                  </div>
                )}
                {nlpResult.entities.BUS_TYPE && (
                  <div className="flex items-center space-x-1.5 text-pink-400">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Type: <strong>{nlpResult.entities.BUS_TYPE}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Assistant Text Response */}
            <p className="text-slate-200 leading-relaxed font-medium bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20">
              💬 "{nlpResult.response}"
            </p>

            {/* Intent-Aware CTA Button */}
            {nlpResult.detected_intent === 'complaint' ? (
              <button
                onClick={handleIntentAction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-rose-500/20"
              >
                <span>Submit Complaint</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : nlpResult.detected_intent === 'feedback' ? (
              <button
                onClick={handleIntentAction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Submit Feedback</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (nlpResult.detected_intent === 'tracking' || nlpResult.detected_intent === 'bus_status') ? (
              <button
                onClick={handleIntentAction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20"
              >
                <span>Track Bus</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleIntentAction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
              >
                <span>View Search Results</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
