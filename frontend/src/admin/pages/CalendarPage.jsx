import React from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";
import { APPOINTMENTS } from "../data/mockData.js";
import { googleCalendarTimedEventUrl } from "../../lib/googleCalendar.js";

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
          Consultations booked through the voice agent or your team. Add any slot to your own Google Calendar in one click.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <ul className="space-y-4">
          {sorted.map((a) => {
            const calUrl = googleCalendarTimedEventUrl({
              title: `Fateh — ${a.student} · ${a.counsellor}`,
              details: `${a.channel}\n${a.notes ? `Notes: ${a.notes}` : "Counselling session"}`,
              startIso: a.when,
              durationMinutes: 60,
            });
            return (
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
                {calUrl ? (
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-sm border border-fateh-border bg-fateh-paper/70 px-4 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-fateh-ink transition hover:border-fateh-gold hover:bg-fateh-gold-pale/50"
                  >
                    <CalendarPlus className="h-4 w-4 text-fateh-gold" aria-hidden />
                    Add to Google Calendar
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-xl border border-fateh-border/90 bg-fateh-accent/[0.05] p-6">
          <h2 className="font-fateh-serif text-lg font-semibold text-fateh-ink">Tips</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-[0.88rem] leading-relaxed text-fateh-muted">
            <li>Use &quot;Add to Google Calendar&quot; to drop the slot into your primary calendar; adjust length or reminders in Google if needed.</li>
            <li>Share the Meet or phone details with the student from your usual comms channel.</li>
            <li>When CRM calendar sync is live, these rows can mirror confirmed bookings automatically.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
