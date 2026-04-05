import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Building2, GraduationCap } from "lucide-react";

export default function ManualEntitiesPage() {
  const { showToast = () => {} } = useOutletContext() ?? {};

  const [uni, setUni] = useState({
    name: "",
    country: "",
    website: "",
    notes: "",
  });

  const [course, setCourse] = useState({
    title: "",
    level: "Masters",
    field: "",
    university: "",
    intake: "",
  });

  const submitUni = (e) => {
    e.preventDefault();
    showToast(`University “${uni.name || "Untitled"}” saved. It will be picked up for search when ingest is connected.`);
    setUni({ name: "", country: "", website: "", notes: "" });
  };

  const submitCourse = (e) => {
    e.preventDefault();
    showToast(`Course “${course.title || "Untitled"}” saved. It will be picked up for search when ingest is connected.`);
    setCourse({ title: "", level: "Masters", field: "", university: "", intake: "" });
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-fateh-serif text-3xl font-semibold text-fateh-ink md:text-[2.15rem]">Manual entities</h1>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-fateh-muted">
          Add universities and courses here so the assistant can mention them in future conversations. Saves are stored from this
          screen for now; when your ingest service is connected, each save will flow through chunking and search automatically. You&apos;ll
          get a confirmation toast either way.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={submitUni}
          className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-fateh-accent">
            <Building2 className="h-5 w-5" aria-hidden />
            <h2 className="font-fateh-serif text-xl font-semibold text-fateh-ink">New university</h2>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Official name" htmlFor="uni-name">
              <input
                id="uni-name"
                required
                value={uni.name}
                onChange={(e) => setUni((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="Country" htmlFor="uni-country">
              <input
                id="uni-country"
                value={uni.country}
                onChange={(e) => setUni((s) => ({ ...s, country: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="Website" htmlFor="uni-web">
              <input
                id="uni-web"
                type="url"
                placeholder="https://"
                value={uni.website}
                onChange={(e) => setUni((s) => ({ ...s, website: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="Counsellor notes" htmlFor="uni-notes">
              <textarea
                id="uni-notes"
                rows={3}
                value={uni.notes}
                onChange={(e) => setUni((s) => ({ ...s, notes: e.target.value }))}
                className="w-full resize-y rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-sm bg-fateh-accent py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-95"
          >
            Save & embed university
          </button>
        </form>

        <form
          onSubmit={submitCourse}
          className="rounded-xl border border-fateh-border/90 bg-white/95 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 text-fateh-accent">
            <GraduationCap className="h-5 w-5" aria-hidden />
            <h2 className="font-fateh-serif text-xl font-semibold text-fateh-ink">New course</h2>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Course title" htmlFor="c-title">
              <input
                id="c-title"
                required
                value={course.title}
                onChange={(e) => setCourse((s) => ({ ...s, title: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="Level" htmlFor="c-level">
              <select
                id="c-level"
                value={course.level}
                onChange={(e) => setCourse((s) => ({ ...s, level: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-white px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              >
                <option>Foundation</option>
                <option>Undergraduate</option>
                <option>Masters</option>
                <option>MBA</option>
                <option>PhD</option>
              </select>
            </Field>
            <Field label="Field / discipline" htmlFor="c-field">
              <input
                id="c-field"
                value={course.field}
                onChange={(e) => setCourse((s) => ({ ...s, field: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="University" htmlFor="c-uni">
              <input
                id="c-uni"
                value={course.university}
                onChange={(e) => setCourse((s) => ({ ...s, university: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
            <Field label="Primary intake" htmlFor="c-intake">
              <input
                id="c-intake"
                placeholder="e.g. September 2026"
                value={course.intake}
                onChange={(e) => setCourse((s) => ({ ...s, intake: e.target.value }))}
                className="w-full rounded-sm border border-fateh-border bg-fateh-paper/50 px-3 py-2.5 text-[0.88rem] outline-none focus:border-fateh-gold"
              />
            </Field>
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-sm bg-fateh-gold py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fateh-ink transition hover:bg-fateh-gold-light"
          >
            Save & embed course
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fateh-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
