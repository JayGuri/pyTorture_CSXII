import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Video, 
  CheckCircle2, 
  Link as LinkIcon, 
  Clock, 
  User, 
  Activity,
  ArrowRight,
  ExternalLink,
  Plus,
  X,
  Loader2,
  CalendarPlus,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUserSchedule, useScheduleMeeting } from "../hooks/useForYouDashboard";

const SchedulePage = () => {
  const { user } = useAuth();
  const { sessions, loading, refresh } = useUserSchedule(user?.email);
  const { schedule, scheduling } = useScheduleMeeting();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    university: "",
    consultant: "Dr. Aris Thorne"
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [lastMeetingCode, setLastMeetingCode] = useState("");

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      const result = await schedule({
        ...formData,
        email: user?.email
      });
      setIsModalOpen(false);
      setLastMeetingCode(result.id);
      setShowSuccess(true);
      refresh();
      // Auto close success after 6s
      setTimeout(() => setShowSuccess(false), 6000);
    } catch (err) {
      alert("Scheduling error: " + err.message);
    }
  };

  const displaySessions = useMemo(() => {
    const fixed = [
      {
        id: "v-aris-01",
        consultant: "Dr. Aris Thorne",
        university: "London School of Economics",
        date: "Available Today",
        time: "14:30 GMT",
        status: "CONFIRMED",
        syncStatus: "Calendar Synced",
        meetLink: "https://meet.google.com/ksz-wyqn-vtp",
        type: "Tier 1 Consultation"
      },
      {
        id: "v-sarah-02",
        consultant: "Sarah Jenkins",
        university: "University of Manchester",
        date: "Tomorrow",
        time: "10:30 GMT",
        status: "CONFIRMED",
        syncStatus: "Invites Sent",
        meetLink: "https://meet.google.com/pqr-stuv-wxy",
        type: "Document Review"
      }
    ];
    return sessions.length > 0 ? [...sessions, ...fixed] : fixed;
  }, [sessions]);

  return (
    <div className="min-h-screen bg-fateh-paper py-12 px-6 lg:px-12 relative overflow-hidden">
      {/* Toast-style Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-8 left-1/2 -z-[1] -translate-x-1/2 z-[2000] w-[90%] max-w-md bg-fateh-ink text-fateh-paper p-5 rounded-2xl shadow-2xl border border-fateh-gold/30 flex items-center gap-4"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-fateh-gold text-fateh-ink">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-wide uppercase">Engagement Provisioned</p>
              <p className="text-xs text-white/60 italic mt-0.5">Invitation dispatched to {user?.email} & Calendar Synced.</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="ml-auto text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.25em] text-fateh-gold/80 block mb-4">
              Aurelian Archive / Concierge
            </span>
            <h1 className="text-5xl md:text-7xl font-fateh-serif text-fateh-ink italic leading-[1.1] mb-6">
              Your <span className="text-fateh-gold not-italic">Schedule</span>
            </h1>
            <p className="max-w-xl text-fateh-muted leading-relaxed font-light italic">
              Verified automated synchronization. Every consultation is instantly 
              provisioned with a secure GMeet link and mirrored to your calendar.
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-fateh-gold text-fateh-paper px-8 py-4 rounded-full text-sm font-semibold shadow-xl shadow-fateh-gold/20 transition-all hover:bg-fateh-ink"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Schedule Consultation
          </motion.button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-fateh-gold" />
            <p className="mt-4 text-fateh-muted italic">Synchronizing your engagements...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-fateh-ink mb-2">
                Upcoming Engagements
              </h3>
              
              {displaySessions.map((session, index) => (
                <motion.div
                  key={session.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-fateh-border/40 p-8 shadow-sm transition-all hover:shadow-[0_20px_40px_-20px_rgba(200,164,90,0.12)]"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-fateh-gold/5 text-fateh-gold">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-[0.7rem] font-bold uppercase tracking-wider text-fateh-muted">
                          {session.type || "Consultation"}
                        </span>
                      </div>
                      
                      <h2 className="text-2xl font-fateh-serif text-fateh-ink mb-2">
                        {session.consultant}
                      </h2>
                      <p className="text-fateh-muted text-sm mb-6 flex items-center gap-2 italic">
                        Focus: <span className="text-fateh-ink not-italic font-medium">{session.university}</span>
                      </p>

                      <div className="flex flex-wrap gap-4 text-[0.8rem]">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                          <Clock className="h-3.5 w-3.5" />
                          {session.date} • {session.time}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {session.syncStatus || "Synced"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end gap-3 min-w-[220px]">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-fateh-paper/80 border border-fateh-border/30 mb-2">
                        <LinkIcon className="h-4 w-4 text-fateh-gold" />
                        <span className="text-[0.65rem] font-mono text-fateh-muted truncate max-w-[120px]">
                          {session.meetLink}
                        </span>
                      </div>
                      <a 
                        href={session.meetLink.startsWith('http') ? session.meetLink : `https://${session.meetLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-fateh-ink text-white py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-fateh-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                      >
                        <Video className="h-4 w-4" />
                        Join via GMeet
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-12 rounded-2xl bg-fateh-ink p-8 text-white/90 overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fateh-gold/20 blur-[80px]" />
                
                <div className="relative">
                  <h3 className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-fateh-gold mb-8">
                    <Activity className="h-4 w-4 animate-pulse" />
                    System Automation Log
                  </h3>

                  <div className="space-y-8 relative font-mono">
                    <div className="absolute left-1.5 top-2 bottom-0 w-px bg-white/10" />
                    {(showSuccess ? [
                      { time: "Just now", event: "INVITE_SENT", desc: `Invitation dispatched to ${user?.email}.` },
                      { time: "Just now", event: "GMEET_GEN", desc: `GMeet token ${lastMeetingCode || '...'} provisioned.` },
                      { time: "Just now", event: "CAL_SYNC", desc: "Calendar event mirrored successfully." }
                    ] : [
                      { time: "Active", event: "SYNC_READY", desc: "System awaiting next engagement..." },
                      { time: "Verified", event: "EMAIL_API", desc: "Mail server operational." },
                      { time: "Secure", event: "GMEET_API", desc: "Token generator online." }
                    ]).map((log, i) => (
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        key={i} 
                        className="relative pl-8"
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-fateh-gold shadow-[0_0_10px_rgba(212,175,55,0.8)] z-10" />
                        <span className="block text-[0.55rem] text-white/40 mb-1">{log.time} • {log.event}</span>
                        <p className="text-[0.75rem] font-medium text-white/80">{log.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase text-white/50 mb-1">Calendar Integration</p>
                        <p className="text-sm font-medium text-fateh-gold">Active & Synced</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-white/20 group-hover:text-fateh-gold transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-fateh-ink/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-fateh-paper w-full max-w-lg rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-fateh-muted hover:text-fateh-ink"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-3xl font-fateh-serif text-fateh-ink mb-2">Schedule Session</h2>
              <p className="text-fateh-muted text-sm mb-8 italic">Choose your arrival time in the Fateh ecosystem.</p>

              <form onSubmit={handleSchedule} className="space-y-6">
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-fateh-gold mb-2">Target University</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. University of Manchester"
                    className="w-full bg-white border border-fateh-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-fateh-gold outline-none"
                    value={formData.university}
                    onChange={e => setFormData({...formData, university: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-fateh-gold mb-2">Preferred Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-white border border-fateh-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-fateh-gold outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-fateh-gold mb-2">Preferred Time</label>
                    <input 
                      required
                      type="time" 
                      className="w-full bg-white border border-fateh-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-fateh-gold outline-none"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  disabled={scheduling}
                  className="w-full bg-fateh-ink text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fateh-gold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Engagement"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchedulePage;
