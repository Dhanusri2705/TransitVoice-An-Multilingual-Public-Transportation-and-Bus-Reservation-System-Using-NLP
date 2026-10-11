import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [nlpResult, setNlpResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceState, setVoiceState] = useState('IDLE'); // IDLE, LISTENING, PROCESSING, RESULT
  const [voiceError, setVoiceError] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceState('LISTENING');
        setVoiceError(null);
      };

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceError('Microphone permission is required for voice search. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech was detected. Please click the microphone and try speaking again.');
        } else {
          setVoiceError(`Voice recognition error: ${event.error}`);
        }
        setVoiceState('IDLE');
      };

      rec.onend = () => {
        setIsListening(false);
        if (voiceState === 'LISTENING') {
          setVoiceState('IDLE');
        }
      };

      setRecognition(rec);
    } else {
      setVoiceError('Voice input is not supported in this browser. Please use a supported browser or enter your query using text.');
    }
  }, []);

  const startListening = () => {
    setTranscript('');
    setNlpResult(null);
    setVoiceError(null);
    setIsModalOpen(true);
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    } else {
      setVoiceError('Voice input is not supported in this browser. Please use a supported browser or enter your query using text.');
    }
  };

  const stopListening = () => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    setIsListening(false);
    if (voiceState === 'LISTENING') {
      setVoiceState('IDLE');
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window && text) {
      const cleanText = text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const processQuery = async (queryText) => {
    const textToProcess = queryText || transcript;
    if (!textToProcess) return null;

    setIsProcessing(true);
    setVoiceState('PROCESSING');
    try {
      const res = await axios.post('/api/nlp/process', { text: textToProcess });
      setNlpResult(res.data);
      setVoiceState('RESULT');
      if (res.data.response) {
        speakText(res.data.response);
      }
      return res.data;
    } catch (e) {
      console.error('NLP process error:', e);
      setVoiceError('Failed to process voice query with NLP engine.');
      setVoiceState('IDLE');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        transcript,
        setTranscript,
        nlpResult,
        setNlpResult,
        isProcessing,
        isModalOpen,
        setIsModalOpen,
        voiceState,
        voiceError,
        setVoiceError,
        startListening,
        stopListening,
        processQuery,
        speakText
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};
