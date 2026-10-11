import React, { useState } from 'react';
import axios from 'axios';
import { Terminal, Play, Sparkles, Database, CheckCircle2, AlertCircle, Cpu, FileText, ChevronRight } from 'lucide-react';

export const NLPDemoPage = () => {
  const [queryText, setQueryText] = useState('I want an AC bus from Coimbatore to Chennai tomorrow after 8 PM under 700 rupees');
  const [nlpOutput, setNlpOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleTestCases = [
    "I need a bus from Coimbatore to Chennai.",
    "எனக்கு கோயம்புத்தூரில் இருந்து சென்னைக்கு பேருந்து வேண்டும்.",
    "मुझे कोयंबटूर से चेन्नई के लिए बस चाहिए।",
    "నాకు కోయంబత్తూరు నుండి చెన్నైకి బస్సు కావాలి.",
    "എനിക്ക് കോയമ്പത്തൂരിൽ നിന്ന് ചെന്നൈയിലേക്ക് ബസ് വേണം.",
    "சென்னையிலிருந்து மதுரைக்கு குறைந்த கட்டண பேருந்து எது?",
    "चेन्नई से मदुरै जाने वाली सबसे सस्ती बस कौन सी है?",
    "చెన్నై నుండి మదురైకి చౌకైన బస్సు ఏది?",
    "ചെന്നൈയിൽ നിന്ന് മധുരയിലേക്ക് ഏറ്റവും കുറഞ്ഞ നിരക്കിലുള്ള ബസ് ഏതാണ്?",
    "எத்தனை இருக்கைகள் காலியாக உள்ளன?",
    "कितनी सीटें उपलब्ध हैं?",
    "என் பேருந்து இப்போது எங்கே இருக்கிறது?",
    "मेरी बस बहुत देर से आई।",
    "பேருந்து மிகவும் வசதியாக இருந்தது."
  ];

  const handleRunPipeline = async (textToRun) => {
    const txt = textToRun || queryText;
    if (!txt) return;
    setLoading(true);

    try {
      const res = await axios.post('/api/nlp/process', { text: txt });
      setNlpOutput(res.data);
    } catch (e) {
      console.error('NLP demo error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>5-Language Multilingual NLP Evaluation Inspector</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">TransitVoice Multilingual Pipeline</h1>
        <p className="text-xs text-slate-400 max-w-2xl">
          Automatic Language Detection & Machine Translation for 5 Languages (English, Tamil, Hindi, Telugu, Malayalam) ➔ Intent Classification ➔ NER ➔ Grounded Database QA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Query Input & Test Cases */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Input Query Inspector</h3>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Multilingual Text Input (en, ta, hi, te, ml)</label>
              <textarea
                rows={3}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Ask anything about buses..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>

            <button
              onClick={() => handleRunPipeline()}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{loading ? 'Executing Pipeline...' : 'EXECUTE MULTILINGUAL PIPELINE'}</span>
            </button>
          </div>

          {/* Academic Test Cases Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">5-Language Matrix Test Cases</h3>
            <div className="space-y-1.5 text-xs max-h-[360px] overflow-y-auto pr-1">
              {sampleTestCases.map((tc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQueryText(tc); handleRunPipeline(tc); }}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-slate-700 transition flex items-center justify-between group"
                >
                  <span className="truncate">{idx + 1}. "{tc}"</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Pipeline Inspection Output */}
        <div className="lg:col-span-2 space-y-6">
          {nlpOutput ? (
            <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5 animate-fade-in font-mono text-xs">
              {/* Stage 1: User Input */}
              <div className="space-y-1.5 border-b border-slate-800 pb-3">
                <span className="text-cyan-400 font-bold tracking-wider text-[11px] uppercase">Stage 1: User Raw Multilingual Input</span>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-white font-bold">
                  "{nlpOutput.input_text || queryText}"
                </div>
              </div>

              {/* Stage 2 & 3: Language Detection & Machine Translation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1.5">
                  <span className="text-teal-400 font-bold tracking-wider text-[11px] uppercase">Stage 2: Language Detection</span>
                  <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <strong className="text-teal-300 text-sm">{nlpOutput.detected_language} ({nlpOutput.detected_language_code || 'en'})</strong>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-blue-400 font-bold tracking-wider text-[11px] uppercase">Stage 3: Machine Translation (to English)</span>
                  <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <strong className="text-white text-xs">{nlpOutput.translated_text || nlpOutput.input_text}</strong>
                  </div>
                </div>
              </div>

              {/* Stage 4: Intent Classification */}
              <div className="space-y-1.5 border-b border-slate-800 pb-3">
                <span className="text-purple-400 font-bold tracking-wider text-[11px] uppercase">Stage 4: Intent Classification (TF-IDF + Classifier)</span>
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Predicted Operational Intent:</span>
                    <strong className="text-purple-300 text-sm">{nlpOutput.detected_intent}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Classifier Confidence:</span>
                    <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold">
                      {Math.round((nlpOutput.confidence || 0.9) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage 5: Named Entity Recognition */}
              <div className="space-y-1.5 border-b border-slate-800 pb-3">
                <span className="text-emerald-400 font-bold tracking-wider text-[11px] uppercase">Stage 5: Named Entity Recognition (NER Gazetteer & Regex)</span>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  {Object.keys(nlpOutput.entities || {}).length === 0 ? (
                    <span className="text-slate-500">No entities detected in query.</span>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(nlpOutput.entities).map(([key, val]) => (
                        <div key={key} className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-emerald-400 block">{key}</span>
                          <strong className="text-white text-xs">{String(val)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stage 6 & 7: Database / QA Lookup & Final Response */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-yellow-400 font-bold tracking-wider text-[11px] uppercase">Stage 6: Grounded Database / FAQ Search</span>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                    Querying <strong className="text-white">buses.json</strong> registry with extracted constraints...
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-cyan-400 font-bold tracking-wider text-[11px] uppercase">Stage 7: Final Grounded Answer Response</span>
                  <div className="bg-cyan-950/40 p-4 rounded-2xl border border-cyan-500/40 font-sans text-xs leading-relaxed text-slate-100">
                    💬 {nlpOutput.response || nlpOutput.error}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Cpu className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Run Multilingual Pipeline</h4>
              <p className="text-xs text-slate-500">Enter a query in English, Tamil, Hindi, Telugu, or Malayalam and click "EXECUTE MULTILINGUAL PIPELINE".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
