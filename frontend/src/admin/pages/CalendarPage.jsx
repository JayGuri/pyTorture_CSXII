import React from "react";
import { APPOINTMENTS } from "../data/mockData.js";

function formatWhen(iso) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CalendarPage() {
  const sorted = [...APPOINTMENTS].sort((a, b) => new Date(a.when) - new Date(b.when));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Appointments</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Slots the AI voice agent booked during calls. Replace with Google Calendar or your CRM calendar sync when available.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {sorted.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">When</p>
                  <p className="mt-1 font-fateh-serif text-xl font-semibold text-fateh-ink">{formatWhen(a.when)}</p>
                  <p className="mt-3 text-[0.88rem] text-fateh-muted">
                    <span className="font-medium text-fateh-ink">{a.student}</span> · {a.channel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fateh-muted">Counsellor</p>
                  <p className="mt-1 font-medium text-fateh-accent">{a.counsellor}</p>
                  <p className="mt-2 inline-flex rounded-full bg-fateh-gold-pale px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink">
                    {a.bookedBy}
                  </p>
                </div>
              </div>
              {a.notes ? (
                <p className="mt-4 rounded-lg border border-fateh-border/70 bg-fateh-paper/50 px-4 py-3 text-[0.86rem] text-fateh-muted">
                  <span className="font-semibold text-fateh-ink">Notes:</span> {a.notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.05] p-6">
          <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Calendar integration</h2>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-fateh-muted">
            The public site already includes Google Calendar helpers for student flows. Mirror those endpoints here to show real availability and
            confirmed bookings from the voice agent.
          </p>
          <p className="mt-4 text-[0.78rem] text-fateh-muted">
            File: <code className="rounded bg-white/80 px-1.5 py-0.5 text-[0.72rem] text-fateh-ink">src/lib/googleCalendar.js</code>
          </p>
        </aside>
      </div>
    </div>
  );
}
