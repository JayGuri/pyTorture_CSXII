import React, { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, Zap, Loader } from "lucide-react";
import TranscriptSocket from "../../lib/transcriptSocket.js";
import SentinelSidebar from "../../components/forYou/SentinelSidebar";
import Toast from "../../components/Toast.jsx";
import { analyzeCallTranscript } from "../../lib/forYouApi.js";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

function formatDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return "—";
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}m ${s}s`;
}

export default function TranscriptSidebar({ call, transcript, onClose }) {
  const [activeCall, setActiveCall] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("info");
  const socketRef = useRef(null);

  // Keep a local copy of the call data so the animate-out works smoothly
  useEffect(() => {
    if (call) {
      setActiveCall(call);
      setLiveTranscript(transcript || []);
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  }, [call, transcript]);

  // Handle sentiment analysis
  const handleAnalyze = async () => {
    if (!call?.callSid) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      console.log("Starting analysis for call:", call.callSid);
      const result = await analyzeCallTranscript(call.callSid);
      console.log("Analysis result received:", result);
      setAnalysisResult(result);

      // Show toast notification
      const sentiment = result.sentiment || "unknown";
      const intent = result.intent?.replace(/_/g, " ") || "general";
      const confidence = Math.round(result.confidence * 100);
      setToastMessage(
        `📊 ${sentiment.toUpperCase()} about ${intent} (${confidence}% confident)`
      );
      setToastType("success");
    } catch (error) {
      const errorMsg = error.message || "Failed to analyze transcript";
      console.error("Sentiment analysis error:", error);
      setAnalysisError(errorMsg);
      setToastMessage(errorMsg);
      setToastType("error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // WebSocket for Live Updates
  useEffect(() => {
    if (!call?.callSid) return;
    const socket = new TranscriptSocket(call.callSid, (message) => {
      if (message.type === "message") {
        setLiveTranscript((prev) => [...prev, message.data]);
      }
      if (message.type === "status") {
        setIsConnected(true);
      }
    });

    socketRef.current = socket;
    socket.connect();
    
    return () => {
      socket.close();
      setIsConnected(false);
    };
  }, [call?.callSid]);

  const displayCall = call || activeCall;
  if (!displayCall) return null;

  return (
    <>
      <SentinelSidebar
      open={!!call}
      onClose={() => {
        onClose?.();
      }}
      title={displayCall.studentName || "Anonymous Session"}
      subtitle={`${formatWhen(displayCall.startedAt)} · ${formatDuration(displayCall.duration)}`}
      toggleLabel="Transcript"
      wrapperClass="ts-wrapper-admin"
      headerExtra={
        <div className="flex items-center gap-3 mt-1">
          {isConnected ? (
            <span className="ts-live-status text-[10px] inline-flex items-center gap-1 text-green-600 font-medium">
              <Wifi size={10} /> Live Ingest Active
            </span>
          ) : (
            <span className="ts-live-status text-[10px] inline-flex items-center gap-1 text-slate-400 font-medium opacity-50">
              <WifiOff size={10} /> Playback Archive
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || liveTranscript.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-amber-50 border border-amber-200 hover:border-amber-400 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Analyze transcript sentiment and intent"
          >
            {isAnalyzing ? (
              <>
                <Loader size={12} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap size={12} />
                Analyze
              </>
            )}
          </button>
        </div>
      }
    >
      {/* Sentiment Analysis Results */}
      {analysisResult ? (
        <div className="ts-analysis-card mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="text-[11px] font-bold uppercase tracking-wide text-amber-900 mb-2">
            📊 Sentiment Analysis
          </div>
          <div className="space-y-2 text-[10px]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-amber-700 font-semibold">Sentiment:</span>
                <div className="text-amber-900 font-bold capitalize">{analysisResult.sentiment}</div>
              </div>
              <div>
                <span className="text-amber-700 font-semibold">Intent:</span>
                <div className="text-amber-900 font-bold capitalize">
                  {analysisResult.intent?.replace(/_/g, " ") || "—"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-amber-700 font-semibold">Confidence:</span>
                <div className="text-amber-900 font-bold">
                  {(analysisResult.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-amber-700 font-semibold">Tone:</span>
                <div className="text-amber-900 font-bold capitalize">
                  {analysisResult.suggested_tone?.tone?.replace(/_/g, " ") || "—"}
                </div>
              </div>
            </div>
            {analysisResult.detected_keywords && analysisResult.detected_keywords.length > 0 && (
              <div>
                <span className="text-amber-700 font-semibold">Keywords:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.detected_keywords.slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[9px] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                  {analysisResult.detected_keywords.length > 5 && (
                    <span className="px-1.5 py-0.5 text-amber-600 text-[9px] font-medium">
                      +{analysisResult.detected_keywords.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Analysis Error */}
      {analysisError && (
        <div className="ts-error-card mb-4 p-3 rounded-lg border border-red-200 bg-red-50">
          <div className="text-[10px] text-red-700 font-medium">❌ {analysisError}</div>
        </div>
      )}

      {/* Debug: Show analysis state */}
      {isAnalyzing && (
        <div className="mb-4 p-2 rounded-lg border border-blue-200 bg-blue-50 text-[9px] text-blue-700">
          ⏳ Analyzing transcript... Please wait
        </div>
      )}

      {/* Children: Transcript Messages */}
      {liveTranscript.length === 0 ? (
        <div className="afs-message-row afs-stagger-item" data-role="assistant">
          <div className="afs-message-bubble opacity-50">
            Fetching session buffers...
          </div>
        </div>
      ) : (
        liveTranscript.map((line, idx) => (
          <div
            key={idx}
            className="afs-message-row afs-stagger-item"
            data-role={line.role === "assistant" ? "assistant" : "user"}
          >
            <div className="afs-message-bubble">
              <span className="ts-bubble-role uppercase font-bold text-[9px] block mb-0.5 tracking-widest opacity-40">
                {line.role === "assistant" ? "Fateh AI" : "Student"}
              </span>
              {line.content || line.text}
            </div>
          </div>
        ))
      )}
      </SentinelSidebar>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
