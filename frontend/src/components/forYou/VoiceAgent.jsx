import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, StopCircle, Loader2, AlertCircle, Volume2, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { voiceAgentAPI } from '../../lib/voiceAgentAPI';
import './VoiceAgent.css';

const SENTIMENT_ICONS = {
  excited: '🎉',
  confused: '🤔',
  hesitant: '😟',
  neutral: '😐',
  interested: '👂',
};

const SENTIMENT_COLORS = {
  excited: '#10b981', // emerald
  confused: '#f59e0b', // amber
  hesitant: '#ef4444', // red
  neutral: '#6b7280', // gray
  interested: '#3b82f6', // blue
};

export default function VoiceAgent() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const sessionId = user?.sessionId;
  const userId = user?.id;

  // Debug user context
  useEffect(() => {
    if (open) {
      console.log('[VoiceAgent] Component mounted, user context:', {
        user: user ? 'exists' : 'null',
        sessionId: sessionId || 'MISSING',
        userId: userId || 'MISSING',
        userKeys: user ? Object.keys(user) : []
      });
    }
  }, [open, user, sessionId, userId]);

  const onClose = () => setOpen(false);

  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [userSentiment, setUserSentiment] = useState(null);
  const [sentimentHistory, setSentimentHistory] = useState([]);
  const [extractedData, setExtractedData] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recordingDots, setRecordingDots] = useState('');
  const [sessionSummary, setSessionSummary] = useState(null);

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    blobToBase64,
    setIsProcessing,
  } = useVoiceRecording();

  const timeoutRef = useRef(null);
  const listRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(t);
  }, [open, messages]);

  // Recording dots animation
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      setRecordingDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '●';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle recording
  const handleStartRecording = async () => {
    setError(null);
    try {
      await startRecording();
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    // Validate required fields before API call
    if (!sessionId) {
      setError('Session ID is missing. Please refresh the page and try again.');
      setIsProcessing(false);
      setLoading(false);
      return;
    }

    setIsProcessing(true);
    setLoading(true);

    try {
      const audioBlob = await stopRecording();
      const audioBase64 = await blobToBase64(audioBlob);

      if (!audioBase64 || audioBase64.trim() === '') {
        setError('No audio recorded. Please try again.');
        setIsProcessing(false);
        setLoading(false);
        return;
      }

      setTranscript('Processing audio...');

      // Call voice agent API
      const result = await voiceAgentAPI.transcribeVoice(
        audioBase64,
        sessionId,
        language,
        userId
      );

      if (!result.success) {
        setError(result.error || 'Failed to process audio');
        setIsProcessing(false);
        setLoading(false);
        return;
      }

      // Update transcript
      setTranscript(result.transcription);

      // Update sentiment
      if (result.userSentiment) {
        setUserSentiment(result.userSentiment);
        setSentimentHistory((prev) => [...prev, result.userSentiment]);
      }

      // Update extracted data
      if (result.extractedData) {
        setExtractedData((prev) => ({
          ...prev,
          ...result.extractedData,
        }));
      }

      // Add message
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          text: result.transcription,
          sentiment: result.userSentiment,
          latency: result.latencyMs,
        },
      ]);

      // Update session summary
      if (result.sessionSummary) {
        setSessionSummary(result.sessionSummary);
      }

      // Add AI response placeholder (in real app, this would come from backend)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Great! I understood: <strong>${result.transcription}</strong>. Now, tell me more about your study plans.`,
          sentiment: null,
        },
      ]);

      // Clear transcript after delay
      timeoutRef.current = setTimeout(() => {
        setTranscript('');
      }, 2000);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentEmoji = (sentiment) => SENTIMENT_ICONS[sentiment] || '😐';
  const getSentimentColor = (sentiment) => SENTIMENT_COLORS[sentiment] || '#6b7280';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="voice-agent-fab"
        title="Voice Advisor"
      >
        <Mic className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {open && (
        <div key="voice-agent" className="contents">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-fateh-ink/55 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-agent-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="voice-agent-modal fixed left-1/2 top-1/2 z-[610] flex max-h-[min(640px,85vh)] w-[min(500px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-fateh-gold/25 bg-fateh-paper shadow-[0_32px_100px_-24px_rgba(11,14,26,0.45)]"
          >
            {/* Header */}
            <div className="voice-agent-header flex items-center justify-between border-b border-fateh-border/90 bg-gradient-to-r from-fateh-ink to-fateh-ink/95 px-5 py-4 text-fateh-paper">
              <div className="flex items-center gap-3">
                <span className="voice-icon flex h-10 w-10 items-center justify-center rounded-xl bg-fateh-gold/20 text-xl">
                  {userSentiment ? getSentimentEmoji(userSentiment) : '🎙️'}
                </span>
                <div>
                  <h2
                    id="voice-agent-title"
                    className="font-fateh-serif text-lg font-semibold normal-case"
                  >
                    Voice Advisor
                  </h2>
                  <p className="text-[0.65rem] uppercase tracking-wider text-white/45">
                    Ask in English, Hindi, or Marathi
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Language selector */}
            <div className="voice-language-selector flex gap-2 border-b border-fateh-border/50 bg-fateh-ink/5 px-5 py-3">
              {['en', 'hi', 'mr'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    language === lang
                      ? 'bg-fateh-gold text-fateh-ink font-semibold'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {lang === 'en' ? '🇬🇧 English' : lang === 'hi' ? '🇮🇳 हिन्दी' : '🇮🇳 मराठी'}
                </button>
              ))}
            </div>

            {/* Sentiment & Data Coverage */}
            {userSentiment && sessionSummary && (
              <div className="voice-stats flex gap-3 border-b border-fateh-border/30 bg-white/2.5 px-5 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getSentimentColor(userSentiment) }}
                  />
                  <span className="text-fateh-muted">
                    Sentiment: <strong>{userSentiment}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-fateh-muted">
                  <Zap className="h-4 w-4 text-fateh-gold" />
                  Data: {sessionSummary.data_points_extracted}/12
                </div>
              </div>
            )}

            {/* Messages area */}
            <div
              ref={listRef}
              className="voice-messages min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              {messages.length === 0 && !transcript && (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <Volume2 className="mx-auto mb-3 h-12 w-12 text-fateh-gold/30" />
                    <p className="text-sm text-fateh-muted">
                      Press and hold the mic to start speaking
                    </p>
                    <p className="text-xs text-fateh-muted/60 mt-2">
                      Tell us about your study abroad plans
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-fateh-accent text-white'
                        : 'border border-fateh-border/80 bg-white text-fateh-ink'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                    {msg.sentiment && (
                      <div className="mt-1 text-xs opacity-70">
                        {getSentimentEmoji(msg.sentiment)} {msg.sentiment}
                      </div>
                    )}
                    {msg.latency && (
                      <div className="mt-1 text-xs opacity-60">
                        ⚡ {msg.latency}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {transcript && !loading && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl border border-fateh-border/80 bg-white px-4 py-3 text-sm text-fateh-ink">
                    <em>{transcript}</em>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-fateh-border/80 bg-white px-4 py-3 text-sm text-fateh-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-fateh-gold" />
                    Analyzing...
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="border-t border-fateh-border/60 bg-red-50 px-5 py-2 flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Recording control */}
            <div className="voice-controls border-t border-fateh-border/90 bg-fateh-ink/2.5 p-4">
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={loading}
                className={`voice-record-btn w-full rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-fateh-gold hover:bg-fateh-gold-light text-fateh-ink disabled:opacity-40'
                }`}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="h-5 w-5" />
                    Stop {recordingDots} {formatTime(recordingTime)}
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Hold to Record
                  </>
                )}
              </button>

              {/* Extracted data preview */}
              {Object.keys(extractedData).length > 0 && (
                <div className="voice-extracted mt-3 grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(extractedData)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      value && (
                        <div key={key} className="rounded bg-white/5 p-2 text-fateh-muted/80">
                          <div className="font-medium capitalize text-fateh-muted">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-white/70 font-semibold truncate">
                            {String(value).substring(0, 15)}...
                          </div>
                        </div>
                      )
                    ))}
                </div>
              )}

              <p className="voice-disclaimer mt-2 text-[0.65rem] text-fateh-muted normal-case">
                Your voice is transcribed & analyzed for sentiment. Data is stored securely.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
