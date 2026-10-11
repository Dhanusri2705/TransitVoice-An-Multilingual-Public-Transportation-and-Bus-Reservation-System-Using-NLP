import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Mic, MessageSquare, CheckCircle2, Sparkles, Languages, AlertCircle, RefreshCw, ThumbsUp, ThumbsDown, Info, HelpCircle } from 'lucide-react';
import { VoiceContext } from '../context/VoiceContext';
import { AuthContext } from '../context/AuthContext';

export const FeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('booking_id') || '';
  const busIdParam = searchParams.get('bus_id') || 'TNSTC-120';

  const { startListening, transcript } = useContext(VoiceContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Ratings state
  const [rating, setRating] = useState(4.5);
  const [driverRating, setDriverRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(4.5);
  const [punctualityRating, setPunctualityRating] = useState(4.5);
  const [comfortRating, setComfortRating] = useState(5);
  const [staffRating, setStaffRating] = useState(4.5);

  // Review & NLP state
  const [comment, setComment] = useState('');
  const [analyzedText, setAnalyzedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [detectedLangCode, setDetectedLangCode] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [sentimentScore, setSentimentScore] = useState(null);
  const [suggestedRating, setSuggestedRating] = useState(null);
  const [isQuestionNotice, setIsQuestionNotice] = useState('');
  const [isStale, setIsStale] = useState(false);

  // Async request ID tracker to prevent race conditions
  const requestIdRef = useRef(0);

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nlpError, setNlpError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);

  // Past reviews for current bus
  const [busReviews, setBusReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Dynamic language detection helper for immediate user feedback
  const getLanguageFromText = (str) => {
    if (!str || !str.trim()) return { name: '', code: '' };
    if (/[\u0B80-\u0BFF]/.test(str)) return { name: 'Tamil', code: 'ta' };
    if (/[\u0900-\u097F]/.test(str)) return { name: 'Hindi', code: 'hi' };
    if (/[\u0C00-\u0C7F]/.test(str)) return { name: 'Telugu', code: 'te' };
    if (/[\u0D00-\u0D7F]/.test(str)) return { name: 'Malayalam', code: 'ml' };
    return { name: 'English', code: 'en' };
  };

  const handleCommentChange = (newVal) => {
    setComment(newVal);
    setNlpError('');

    if (!newVal.trim()) {
      // Requirement 8: When the textarea is empty, clear or invalidate previous results
      setOriginalText('');
      setAnalyzedText('');
      setDetectedLang('');
      setDetectedLangCode('');
      setTranslatedText('');
      setSentiment('');
      setSentimentScore(null);
      setSuggestedRating(null);
      setIsQuestionNotice('');
      setIsStale(false);
    } else {
      // Requirement 12: Update displayed language when input changes
      const qLang = getLanguageFromText(newVal);
      setDetectedLang(qLang.name);
      setDetectedLangCode(qLang.code);

      // Requirement 3: When user edits the review, mark previous results as stale
      if (analyzedText && newVal.trim() !== analyzedText.trim()) {
        setIsStale(true);
      } else if (analyzedText && newVal.trim() === analyzedText.trim()) {
        setIsStale(false);
      }
    }
  };

  // Sync voice transcript
  useEffect(() => {
    if (transcript) {
      handleCommentChange(transcript);
      handleAnalyzeSentiment(transcript);
    }
  }, [transcript]);

  // Load past reviews
  useEffect(() => {
    fetchBusReviews(busIdParam);
  }, [busIdParam]);

  const fetchBusReviews = async (bId) => {
    if (!bId) return;
    setReviewsLoading(true);
    try {
      const res = await axios.get(`/api/feedback/bus/${bId}`);
      if (res.data && res.data.reviews) {
        setBusReviews(res.data.reviews);
      }
    } catch (e) {
      console.error('Failed to fetch bus reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleVoiceFeedback = () => {
    startListening();
  };

  const handleAnalyzeSentiment = async (textToAnalyze) => {
    const txt = (textToAnalyze !== undefined ? textToAnalyze : comment).trim();
    if (!txt) {
      setNlpError('Please enter review text in any of the 5 supported languages.');
      setSentiment('');
      setSentimentScore(null);
      setSuggestedRating(null);
      setTranslatedText('');
      setAnalyzedText('');
      setIsQuestionNotice('');
      setIsStale(false);
      return;
    }

    const currentReqId = ++requestIdRef.current;
    setNlpError('');
    setIsQuestionNotice('');
    setIsAnalyzing(true);
    setIsStale(false);

    try {
      const res = await axios.post('/api/nlp/sentiment', { text: txt });

      // Requirement 6: Discard older asynchronous responses if a newer request was sent
      if (currentReqId !== requestIdRef.current) {
        return;
      }

      if (res.data) {
        setOriginalText(txt);
        setAnalyzedText(txt);
        setDetectedLang(res.data.detected_language || 'English');
        setDetectedLangCode(res.data.detected_language_code || 'en');

        // Requirement 9 & 13: Handle inquiries / questions vs genuine passenger reviews
        if (res.data.is_review === false) {
          setIsQuestionNotice(res.data.message || 'This input appears to be an inquiry rather than a passenger review. Suggested rating is not applicable.');
          setSentiment('');
          setSentimentScore(null);
          setSuggestedRating(null);
          setTranslatedText(res.data.translated_text || '');
          return;
        }

        // Translation verification
        if (res.data.detected_language_code !== 'en') {
          setTranslatedText(res.data.translated_text || '');
        } else {
          setTranslatedText(txt);
        }

        setSentiment(res.data.sentiment || 'POSITIVE');
        setSentimentScore(res.data.score !== undefined ? res.data.score : 0.85);

        if (res.data.suggested_rating !== undefined && res.data.suggested_rating !== null) {
          setSuggestedRating(res.data.suggested_rating);
          setRating(res.data.suggested_rating);
        }
      }
    } catch (e) {
      if (currentReqId === requestIdRef.current) {
        console.error('Sentiment analysis error:', e);
        setNlpError('Failed to analyze sentiment with NLP engine. Please check connection.');
        setSentiment('');
        setSentimentScore(null);
        setSuggestedRating(null);
        setTranslatedText('');
        setAnalyzedText('');
        setIsStale(false);
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit your verified passenger review.');
      navigate('/login');
      return;
    }

    const reviewText = (comment || transcript).trim();
    if (!reviewText) {
      setNlpError('Please write your review before submitting.');
      return;
    }

    setSubmitting(true);
    setNlpError('');

    try {
      // If user hasn't run analyze yet, run it silently or submit with what we have
      let lang = detectedLang;
      let langCode = detectedLangCode;
      let trans = translatedText;
      let sent = sentiment;

      if (!lang || !trans) {
        try {
          const nlpRes = await axios.post('/api/nlp/sentiment', { text: reviewText });
          if (nlpRes.data) {
            lang = nlpRes.data.detected_language || 'English';
            langCode = nlpRes.data.detected_language_code || 'en';
            trans = nlpRes.data.translated_text || reviewText;
            sent = nlpRes.data.sentiment || 'POSITIVE';
          }
        } catch (nlpErr) {
          console.warn('NLP pre-submit analysis skipped:', nlpErr);
        }
      }

      const payload = {
        booking_id: bookingIdParam,
        bus_id: busIdParam,
        rating,
        driver_rating: driverRating,
        cleanliness_rating: cleanlinessRating,
        punctuality_rating: punctualityRating,
        comfort_rating: comfortRating,
        staff_rating: staffRating,
        comment: reviewText,
        original_text: reviewText,
        detected_language: lang || 'English',
        detected_language_code: langCode || 'en',
        translated_text: trans || reviewText,
        sentiment: sent || (rating >= 3.5 ? 'POSITIVE' : rating <= 2.5 ? 'NEGATIVE' : 'NEUTRAL')
      };

      const res = await axios.post('/api/feedback', payload);
      setSubmittedFeedback(res.data?.feedback || payload);
      setSubmitted(true);
      fetchBusReviews(busIdParam);
    } catch (e) {
      console.error('Feedback submit error:', e);
      setNlpError(e.response?.data?.error || 'Failed to submit review. Please ensure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sample quick chips in all 5 languages
  const sampleChips = [
    { label: 'English', text: 'The bus was clean and comfortable with smooth driving.' },
    { label: 'தமிழ்', text: 'இந்தப் பேருந்து மிகவும் சுத்தமாகவும் வசதியாகவும் இருந்தது.' },
    { label: 'हिन्दी', text: 'बस बहुत साफ और आरामदायक थी।' },
    { label: 'తెలుగు', text: 'బస్సు చాలా శుభ్రంగా మరియు సౌకర్యవంతంగా ఉంది.' },
    { label: 'മലയാളം', text: 'ബസ് വളരെ വൃത്തിയുള്ളതും സുഖകരവുമായിരുന്നു.' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-xs text-cyan-400 font-mono font-semibold">Multilingual Passenger Feedback</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Rate Your Travel Experience</h1>
            <p className="text-xs text-slate-400">
              Submit genuine passenger reviews in any of our 5 supported languages. NLP automatically detects language and analyzes sentiment.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 text-xs font-mono border border-slate-700">
              Bus ID: {busIdParam}
            </span>
            {bookingIdParam && (
              <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 text-xs font-mono border border-slate-700">
                Booking: {bookingIdParam}
              </span>
            )}
          </div>
        </div>

        {/* 5 Language Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 flex items-center space-x-1 mr-1">
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>Supported Languages:</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px]">English (en)</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px]">தமிழ் (ta)</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px]">हिन्दी (hi)</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px]">తెలుగు (te)</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[11px]">മലയാളം (ml)</span>
        </div>
      </div>

      {!user && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You are currently not logged in. Please sign in to submit a verified passenger review.</span>
          </div>
          <Link to="/login" className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition">
            Sign In
          </Link>
        </div>
      )}

      {submitted ? (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-5 animate-fade-in shadow-md">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900">Thank You for Your Feedback!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your multilingual review has been recorded in the database, analyzed for sentiment, and linked to bus ratings.
            </p>
          </div>

          {submittedFeedback && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 max-w-lg mx-auto text-left space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Verified Rating:</span>
                <span className="font-black text-amber-600 flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
                  <span>{submittedFeedback.rating} ★</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Detected Language:</span>
                <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  {submittedFeedback.detected_language} ({submittedFeedback.detected_language_code})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">NLP Sentiment:</span>
                <span className={`px-2 py-0.5 rounded font-mono font-black text-[11px] ${
                  submittedFeedback.sentiment?.toUpperCase() === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800' :
                  submittedFeedback.sentiment?.toUpperCase() === 'NEGATIVE' ? 'bg-rose-100 text-rose-800' :
                  'bg-slate-200 text-slate-800'
                }`}>
                  {submittedFeedback.sentiment}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Original Passenger Review:</span>
                <p className="font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                  "{submittedFeedback.original_text}"
                </p>
              </div>
              {submittedFeedback.detected_language_code !== 'en' && submittedFeedback.translated_text && (
                <div>
                  <span className="text-slate-500 block mb-0.5">English Translation:</span>
                  <p className="font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 italic">
                    "{submittedFeedback.translated_text}"
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmitted(false);
                setComment('');
                setOriginalText('');
                setTranslatedText('');
                setSentiment('');
                setSentimentScore(null);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Submit Another Review
            </button>
            <button
              onClick={() => navigate('/my-bookings')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              Return to My Bookings
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Voice Input Prompt */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-md">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Speak Your Review in Any Language</h4>
                <p className="text-[11px] text-slate-600">The NLP pipeline will transcribe speech, translate to English, and extract sentiment.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleVoiceFeedback}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0"
            >
              🎤 Speak Review
            </button>
          </div>

          {/* Multilingual Text Review Input */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block text-sm">
                Detailed Review Comment (English / தமிழ் / हिन्दी / తెలుగు / മലയാളം)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">5-language NLP enabled</span>
            </div>

            {/* Quick Sample Input Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick examples:</span>
              {sampleChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleCommentChange(chip.text);
                    handleAnalyzeSentiment(chip.text);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition"
                >
                  <span className="font-bold text-cyan-600 mr-1">[{chip.label}]</span>
                  <span>{chip.text.slice(0, 24)}...</span>
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Write in English, தமிழ், हिन्दी, తెలుగు, or മലയാളം... e.g. 'இந்தப் பேருந்து மிகவும் சுத்தமாகவும் வசதியாகவும் இருந்தது.'"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500 focus:bg-white text-xs transition"
            />

            {/* Invalidation / Staleness Warning */}
            {isStale && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Text modified since last analysis. Click <strong>Analyze Review</strong> below to update results for the current text.</span>
              </div>
            )}

            {/* Question / Inquiry Notice (Requirement 9 & 13) */}
            {isQuestionNotice && !isStale && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-xs flex items-center space-x-2 animate-fade-in">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{isQuestionNotice}</span>
              </div>
            )}

            {/* Analyze Sentiment Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleAnalyzeSentiment(comment)}
                disabled={isAnalyzing || !comment.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-xs"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Analyzing Sentiment & Translation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Analyze Review (NLP Sentiment & Translation)</span>
                  </>
                )}
              </button>

              {!isStale && !isQuestionNotice && sentiment && (
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center space-x-2.5">
                  <span className="font-bold text-slate-700 text-xs">Sentiment:</span>
                  <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-[11px] flex items-center space-x-1 ${
                    sentiment.toUpperCase() === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800' :
                    sentiment.toUpperCase() === 'NEGATIVE' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {sentiment.toUpperCase() === 'POSITIVE' && <ThumbsUp className="w-3 h-3 inline mr-1" />}
                    {sentiment.toUpperCase() === 'NEGATIVE' && <ThumbsDown className="w-3 h-3 inline mr-1" />}
                    {sentiment.toUpperCase() === 'NEUTRAL' && <Info className="w-3 h-3 inline mr-1" />}
                    <span>{sentiment}</span>
                  </span>
                  {sentimentScore !== null && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      (VADER: {sentimentScore > 0 ? `+${sentimentScore}` : sentimentScore})
                    </span>
                  )}
                </div>
              )}
            </div>

            {nlpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{nlpError}</span>
              </div>
            )}

            {/* Multilingual NLP Review Preview Card (Only shown for fresh, verified analysis) */}
            {!isStale && (detectedLang || translatedText) && (
              <div className="p-4 bg-gradient-to-r from-slate-50 to-cyan-50/30 border border-cyan-100 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">NLP Language Detection:</span>
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 font-mono font-bold rounded text-[11px]">
                      {detectedLang} ({detectedLangCode})
                    </span>
                  </div>
                  {!isQuestionNotice && suggestedRating && (
                    <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                      <span>Suggested Rating:</span>
                      <span className="px-2 py-0.5 bg-amber-100 rounded text-amber-900 font-mono font-black">
                        {suggestedRating} ★
                      </span>
                    </div>
                  )}
                </div>

                {detectedLangCode !== 'en' && translatedText && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-600 block text-[11px]">English Translation Preview:</span>
                    <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium italic">
                      "{translatedText}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6 Rating Categories Grid */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Rate Travel Dimensions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Overall Rating</label>
                  <span className="font-black text-amber-600">{rating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Driver Safety</label>
                  <span className="font-black text-amber-600">{driverRating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={driverRating}
                  onChange={(e) => setDriverRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Cleanliness & Hygiene</label>
                  <span className="font-black text-amber-600">{cleanlinessRating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={cleanlinessRating}
                  onChange={(e) => setCleanlinessRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Punctuality</label>
                  <span className="font-black text-amber-600">{punctualityRating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={punctualityRating}
                  onChange={(e) => setPunctualityRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Seat Comfort</label>
                  <span className="font-black text-amber-600">{comfortRating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={comfortRating}
                  onChange={(e) => setComfortRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Staff Behaviour</label>
                  <span className="font-black text-amber-600">{staffRating} ★</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={staffRating}
                  onChange={(e) => setStaffRating(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Persisting Verified Review to Database...</span>
              </>
            ) : (
              <span>SUBMIT VERIFIED REVIEW</span>
            )}
          </button>
        </form>
      )}

      {/* Verified Reviews for Current Bus */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Verified Bus Reviews</h3>
            <p className="text-[11px] text-slate-500">Showing reviews recorded for bus {busIdParam}</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
            {busReviews.length} Reviews
          </span>
        </div>

        {reviewsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading verified reviews...</div>
        ) : busReviews.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No passenger reviews yet for this bus. Be the first to submit a review!
          </div>
        ) : (
          <div className="space-y-3">
            {busReviews.map((rev, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">{rev.user_name || 'Passenger'}</span>
                    <span className="text-[11px] text-slate-400">• {new Date(rev.created_at).toLocaleDateString()}</span>
                    {rev.detected_language && (
                      <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono font-bold text-[10px]">
                        {rev.detected_language}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      rev.sentiment?.toUpperCase() === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800' :
                      rev.sentiment?.toUpperCase() === 'NEGATIVE' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {rev.sentiment || 'NEUTRAL'}
                    </span>
                    <span className="font-black text-amber-600 flex items-center space-x-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                      <span>{rev.rating} ★</span>
                    </span>
                  </div>
                </div>

                <p className="text-slate-800 font-medium">"{rev.original_text || rev.comment}"</p>

                {rev.detected_language_code && rev.detected_language_code !== 'en' && rev.translated_text && (
                  <p className="text-slate-500 text-[11px] italic bg-white p-2 rounded-xl border border-slate-200">
                    Translation: "{rev.translated_text}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
