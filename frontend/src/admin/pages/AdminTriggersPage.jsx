import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchEurGbpInrSpot } from "../../lib/exchangeRates.js";

export default function AdminTriggersPage() {
  const { showToast = () => {} } = useOutletContext() ?? {};
  const [fxStatus, setFxStatus] = useState("idle");
  const [fxSnapshot, setFxSnapshot] = useState(null);
  const [visaStatus, setVisaStatus] = useState("idle");

  const refreshFx = async () => {
    setFxStatus("loading");
    setFxSnapshot(null);
    try {
      const ctrl = new AbortController();
      const data = await fetchEurGbpInrSpot(ctrl.signal);
      setFxSnapshot(data);
      setFxStatus("ok");
      showToast(`Exchange rates refreshed · EUR ₹${data.eurInr.toFixed(2)} · GBP ₹${data.gbpInr.toFixed(2)}`);
    } catch {
      setFxStatus("error");
      showToast("Exchange rate refresh failed — check network or try again.");
    }
  };

  const checkVisaFees = () => {
    setVisaStatus("loading");
    window.setTimeout(() => {
      setVisaStatus("ok");
      showToast("Visa fee scrape job started — review outputs in the gap queue when wired (simulated).");
    }, 900);
  };

  const refreshKbFull = () => {
    showToast("Full KB refresh enqueued — crawler + verifier pipeline (simulated).");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Manual triggers</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Force-refresh operational caches your voice agent and counsellors rely on. Exchange rates call the live Frankfurter API; visa and full KB
          actions are stubbed until your workers are connected.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TriggerCard
          title="Refresh exchange rates"
          description="Pulls live EUR/INR and GBP/INR spot from Frankfurter (same source as the public calculator)."
          actionLabel={fxStatus === "loading" ? "Refreshing…" : "Refresh exchange rates now"}
          onClick={refreshFx}
          disabled={fxStatus === "loading"}
          footer={
            fxSnapshot ? (
              <p className="text-[0.78rem] text-fateh-muted">
                As of {fxSnapshot.date || "today"} · EUR ₹{fxSnapshot.eurInr.toFixed(2)} · GBP ₹{fxSnapshot.gbpInr.toFixed(2)}
              </p>
            ) : fxStatus === "error" ? (
              <p className="text-[0.78rem] text-rose-700">Request failed.</p>
            ) : (
              <p className="text-[0.78rem] text-fateh-muted">No snapshot loaded yet.</p>
            )
          }
        />
        <TriggerCard
          title="Check visa fees"
          description="Starts a targeted scrape / policy diff for major study corridors. Route results into your KB review flow when wired."
          actionLabel={visaStatus === "loading" ? "Starting…" : "Check visa fees now"}
          onClick={checkVisaFees}
          disabled={visaStatus === "loading"}
          footer={<p className="text-[0.78rem] text-fateh-muted">Simulated job kick-off with toast confirmation.</p>}
        />
        <TriggerCard
          title="Full knowledge refresh"
          description="Re-runs crawlers, rebuilds chunk inventory, and schedules embedding regeneration."
          actionLabel="Enqueue full KB refresh"
          onClick={refreshKbFull}
          footer={<p className="text-[0.78rem] text-fateh-muted">Long-running — monitor your ingest pipeline for completion.</p>}
        />
      </div>
    </div>
  );
}

function TriggerCard({ title, description, actionLabel, onClick, disabled, footer }) {
  return (
    <div className="flex flex-col rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm">
      <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">{title}</h2>
      <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-fateh-muted">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 rounded-sm border border-fateh-border bg-fateh-paper/60 py-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:border-fateh-gold hover:bg-fateh-gold-pale/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionLabel}
      </button>
      <div className="mt-4 border-t border-fateh-border/70 pt-4">{footer}</div>
    </div>
  );
}
