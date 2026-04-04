import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  {
    label: "Counsellor ops",
    items: [
      { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { to: "/admin/live", label: "Live conversations", icon: Radio },
      { to: "/admin/leads", label: "Lead matrix", icon: Users },
      { to: "/admin/briefs", label: "Intelligence briefs", icon: ClipboardList },
    ],
  },
  {
    label: "Knowledge base",
    items: [
      { to: "/admin/kb/gaps", label: "Gap queue", icon: MessageSquare },
      { to: "/admin/kb/entities", label: "Entities", icon: Database },
      { to: "/admin/kb/triggers", label: "Manual triggers", icon: RefreshCw },
    ],
  },
  {
    label: "Premium",
    items: [
      { to: "/admin/analytics", label: "Call analytics", icon: BarChart3 },
      { to: "/admin/calendar", label: "Appointments", icon: CalendarDays },
      { to: "/admin/nurture", label: "Nurture tracking", icon: Zap },
    ],
  },
];

function AdminToast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      className="pointer-events-auto fixed bottom-6 right-6 z-[300] max-w-sm rounded-lg border border-fateh-border bg-white px-4 py-3 text-sm text-fateh-ink shadow-[0_20px_50px_-20px_rgba(11,14,26,0.35)]"
      role="status"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-fateh-gold" aria-hidden />
        <p className="leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto text-fateh-muted transition hover:text-fateh-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => setToast(message), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const outletCtx = useMemo(() => ({ showToast }), [showToast]);

  return (
    <div className="min-h-screen bg-fateh-paper text-fateh-ink">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[270px] shrink-0 flex-col border-r border-white/10 bg-fateh-ink text-white/90">
          <div className="border-b border-white/10 px-5 py-6">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-fateh-gold-light/90">Fateh Education</p>
            <h1 className="mt-2 font-fateh-serif text-xl font-semibold tracking-wide text-white">PS Console</h1>
            <p className="mt-1 text-[0.72rem] leading-relaxed text-white/50">AI voice agent — counsellor ops</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV.map((section) => (
              <div key={section.label} className="mb-6">
                <p className="mb-2 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/35">{section.label}</p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            [
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-[0.82rem] font-medium transition-colors",
                              isActive
                                ? "bg-fateh-gold/15 text-fateh-gold-light"
                                : "text-white/65 hover:bg-white/5 hover:text-white",
                            ].join(" ")
                          }
                        >
                          <ItemIcon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                          {item.label}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-white/80 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
            <LinkToSite />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-[100] border-b border-fateh-border/90 bg-fateh-paper/92 px-6 py-4 backdrop-blur-md md:px-10">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fateh-muted">Operations</p>
                <p className="text-sm text-fateh-muted">Real-time lead intelligence · KB control center</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-fateh-border bg-white/80 px-3 py-1.5 text-[0.72rem] text-fateh-muted shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live ingest simulated
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-[1400px]">
              <Outlet context={outletCtx} />
            </div>
          </main>
        </div>
      </div>

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function LinkToSite() {
  return (
    <a
      href="/"
      className="mt-3 block text-center text-[0.72rem] text-white/45 underline-offset-2 hover:text-fateh-gold-light hover:underline"
    >
      ← Public site
    </a>
  );
}
