import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function App() {
  const [calls, setCalls] = useState([]);
  const [selectedCallSid, setSelectedCallSid] = useState("");
  const [callDetail, setCallDetail] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCall = useMemo(
    () => calls.find((item) => item.call_sid === selectedCallSid) || null,
    [calls, selectedCallSid],
  );

  const transcriptDownloadUrl = selectedCallSid
    ? buildApiUrl(`/api/calls/${encodeURIComponent(selectedCallSid)}/transcript.txt`)
    : "";

  async function fetchCalls() {
    try {
      setLoadingCalls(true);
      const response = await fetch(buildApiUrl("/api/calls"));
      if (!response.ok) {
        throw new Error(`Failed to load calls: HTTP ${response.status}`);
      }

      const payload = await response.json();
      const nextCalls = normalizeArray(payload.calls);
      setCalls(nextCalls);

      if (!selectedCallSid && nextCalls.length > 0) {
        setSelectedCallSid(nextCalls[0].call_sid);
      }

      if (selectedCallSid && !nextCalls.some((item) => item.call_sid === selectedCallSid)) {
        setSelectedCallSid(nextCalls.length > 0 ? nextCalls[0].call_sid : "");
      }

      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch calls.");
    } finally {
      setLoadingCalls(false);
    }
  }

  async function fetchCallDetail(callSid) {
    if (!callSid) {
      return;
    }

    try {
      setLoadingDetail(true);
      const response = await fetch(buildApiUrl(`/api/calls/${encodeURIComponent(callSid)}`));
      if (!response.ok) {
        throw new Error(`Failed to load call details: HTTP ${response.status}`);
      }

      const payload = await response.json();
      setCallDetail(payload);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch call details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function regenerateSummary() {
    if (!selectedCallSid) {
      return;
    }

    try {
      setSummaryBusy(true);
      const response = await fetch(
        buildApiUrl(`/api/calls/${encodeURIComponent(selectedCallSid)}/summary/regenerate`),
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(`Failed to regenerate summary: HTTP ${response.status}`);
      }

      await fetchCallDetail(selectedCallSid);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Summary regeneration failed.");
    } finally {
      setSummaryBusy(false);
    }
  }

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    if (!selectedCallSid) {
      setCallDetail(null);
      return;
    }
    fetchCallDetail(selectedCallSid);
  }, [selectedCallSid]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const listInterval = setInterval(fetchCalls, 2500);
    return () => clearInterval(listInterval);
  }, [autoRefresh, selectedCallSid]);

  useEffect(() => {
    if (!autoRefresh || !selectedCallSid) {
      return;
    }

    const detailInterval = setInterval(() => {
      fetchCallDetail(selectedCallSid);
    }, 1800);
    return () => clearInterval(detailInterval);
  }, [autoRefresh, selectedCallSid]);

  const segments = normalizeArray(callDetail?.segments);
  const summary = callDetail?.summary_report || {};
  const keyPoints = normalizeArray(summary.key_points);
  const nextSteps = normalizeArray(summary.next_steps);
  const actionItems = normalizeArray(summary.action_items);
  const risks = normalizeArray(summary.risks);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Fateh Voice Intelligence</p>
          <h1>Live Call Transcript Monitor</h1>
          <p className="subtext">Track call transcript in near real-time, export anytime, and auto-generate action reports.</p>
        </div>

        <div className="topbar-actions">
          <button className="ghost" onClick={fetchCalls} type="button">
            Refresh Calls
          </button>

          <button
            className={autoRefresh ? "primary" : "ghost"}
            onClick={() => setAutoRefresh((prev) => !prev)}
            type="button"
          >
            {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
          </button>
        </div>
      </header>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <div className="layout-grid">
        <aside className="panel calls-panel">
          <div className="panel-header">
            <h2>Active & Recent Calls</h2>
            <span>{loadingCalls ? "Loading..." : `${calls.length} total`}</span>
          </div>

          <div className="call-list">
            {calls.length === 0 ? (
              <p className="empty">No calls captured yet. Once a Twilio call starts, it appears here.</p>
            ) : (
              calls.map((call) => (
                <button
                  key={call.call_sid}
                  className={`call-card ${selectedCallSid === call.call_sid ? "active" : ""}`}
                  onClick={() => setSelectedCallSid(call.call_sid)}
                  type="button"
                >
                  <div className="call-row">
                    <strong>{call.call_sid.slice(0, 12)}...</strong>
                    <span className={`badge ${call.status === "completed" ? "done" : "live"}`}>{call.status}</span>
                  </div>
                  <p>{call.preview || "Waiting for first transcript turn..."}</p>
                  <div className="call-meta">
                    <span>{call.language}</span>
                    <span>{call.turns} turns</span>
                    <span>{formatTimestamp(call.updated_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="panel detail-panel">
          {!selectedCallSid ? (
            <div className="empty-state">Select a call from the left panel to monitor transcript and summary.</div>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <h2>Call Session: {selectedCallSid}</h2>
                  <p className="subtext">
                    {selectedCall?.status || callDetail?.status || "active"} • {callDetail?.language_label || callDetail?.language || "en-IN"} • Updated {formatTimestamp(callDetail?.updated_at)}
                  </p>
                </div>

                <div className="detail-actions">
                  <button className="ghost" onClick={() => fetchCallDetail(selectedCallSid)} type="button">
                    {loadingDetail ? "Refreshing..." : "Refresh Transcript"}
                  </button>

                  <button className="primary" onClick={regenerateSummary} type="button" disabled={summaryBusy || segments.length === 0}>
                    {summaryBusy ? "Generating..." : "Regenerate Summary"}
                  </button>

                  {transcriptDownloadUrl ? (
                    <a className="primary alt" href={transcriptDownloadUrl}>
                      Download Transcript
                    </a>
                  ) : null}
                </div>
              </div>

              <section className="transcript-section">
                <h3>Live Transcript Timeline</h3>
                {segments.length === 0 ? (
                  <p className="empty">No transcript turns yet. Speak on the call after language selection.</p>
                ) : (
                  <div className="timeline">
                    {segments.map((segment) => (
                      <article key={`${segment.turn}-${segment.timestamp}`} className="timeline-item">
                        <div className="timeline-meta">
                          <span>Turn {segment.turn}</span>
                          <span>{formatTimestamp(segment.timestamp)}</span>
                          <span className="intent">Intent: {segment.analysis?.intent || "general_query"}</span>
                        </div>

                        <div className="speech-block">
                          <p className="speaker">Caller</p>
                          <p>{segment.transcript || "(No speech recognized)"}</p>
                        </div>

                        <div className="speech-block assistant">
                          <p className="speaker">Assistant</p>
                          <p>{segment.reply || "(No assistant reply generated)"}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="summary-section">
                <h3>Conversation Intelligence Report</h3>
                {Object.keys(summary).length === 0 ? (
                  <p className="empty">Summary will be generated as transcript turns arrive.</p>
                ) : (
                  <div className="summary-grid">
                    <div className="summary-card wide">
                      <h4>{summary.title || "Call Summary"}</h4>
                      <p>{summary.overview || "No overview available yet."}</p>
                      <p className="subtext">Generated: {formatTimestamp(summary.generated_at)}</p>
                    </div>

                    <div className="summary-card">
                      <h4>Key Points</h4>
                      {keyPoints.length === 0 ? (
                        <p className="empty">No key points extracted yet.</p>
                      ) : (
                        <ul>
                          {keyPoints.map((item, index) => (
                            <li key={`key-point-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="summary-card">
                      <h4>Next Steps</h4>
                      {nextSteps.length === 0 ? (
                        <p className="empty">No next steps available yet.</p>
                      ) : (
                        <ul>
                          {nextSteps.map((item, index) => (
                            <li key={`next-step-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="summary-card">
                      <h4>Action Items</h4>
                      {actionItems.length === 0 ? (
                        <p className="empty">No action items captured yet.</p>
                      ) : (
                        <ul>
                          {actionItems.map((item, index) => (
                            <li key={`action-${index}`}>
                              <strong>{item.owner || "Owner"}:</strong> {item.task || "Task"} ({item.priority || "Medium"})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="summary-card">
                      <h4>Risks & Blockers</h4>
                      {risks.length === 0 ? (
                        <p className="empty">No risks highlighted.</p>
                      ) : (
                        <ul>
                          {risks.map((item, index) => (
                            <li key={`risk-${index}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="summary-card">
                      <h4>Suggested Follow-up</h4>
                      <p>{summary.suggested_follow_up || "Schedule a counsellor callback with the student and share the transcript summary."}</p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
