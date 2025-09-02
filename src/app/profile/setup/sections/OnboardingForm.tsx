"use client";

import { useMemo, useState } from "react";
import { saveProfileAction } from "@/app/actions/profile";

export default function OnboardingForm({ email, name }: { email: string; name?: string }) {
  const [school] = useState("ccny"); // default for MVP; expand later
  const schools = useMemo(
    () => [
      { value: "ccny", label: "CCNY — City College of New York" },
      { value: "baruch", label: "Baruch College" },
      { value: "hunter", label: "Hunter College" },
      { value: "brooklyn", label: "Brooklyn College" },
      { value: "queens", label: "Queens College" },
      { value: "lehman", label: "Lehman College" },
      { value: "csi", label: "College of Staten Island" },
      { value: "york", label: "York College" },
      { value: "bmcc", label: "Borough of Manhattan CC" },
      { value: "hostos", label: "Hostos CC" },
      { value: "kbcc", label: "Kingsborough CC" },
      { value: "lagcc", label: "LaGuardia CC" },
      { value: "qcc", label: "Queensborough CC" },
      { value: "bronxcc", label: "Bronx CC" },
      { value: "guttman", label: "Guttman CC" },
      { value: "medgar", label: "Medgar Evers College" },
      { value: "sps", label: "CUNY School of Professional Studies" },
      { value: "soj", label: "Craig Newmark Graduate School of Journalism" },
      { value: "spuhc", label: "CUNY Graduate School of Public Health" },
      { value: "gradcenter", label: "CUNY Graduate Center" },
      { value: "law", label: "CUNY School of Law" },
      { value: "btech", label: "CUNY Baccalaureate (BA/BS)" },
    ],
    []
  );
  const [initialName] = useState(name ?? "");

  const classifications = useMemo(
    () => [
      "Freshman",
      "Sophomore",
      "Junior",
      "Senior",
      "Graduate",
      "Other",
    ],
    []
  );

  const immigrationStatuses = useMemo(
    () => ["DACA", "TPS", "SIJS", "Undocumented", "prefer_not_to_say"],
    []
  );

  const ynp = useMemo(() => ["yes", "no", "prefer_not_to_say"], []);

  return (
    <form action={saveProfileAction} className="space-y-5">
      <input type="hidden" name="redirect" value="/ccny" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">School email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2 text-neutral-600 dark:text-neutral-300"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">School</label>
          <select
            name="school"
            defaultValue={school}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          >
            {schools.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Full name<span className="text-red-500">*</span></label>
          <input
            name="name"
            type="text"
            required
            defaultValue={initialName}
            placeholder="Your name"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Major / intended major<span className="text-red-500">*</span></label>
          <input
            name="major"
            type="text"
            required
            placeholder="e.g., Computer Science"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Classification<span className="text-red-500">*</span></label>
          <select
            name="classification"
            required
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          >
            <option value="" disabled>Select</option>
            {classifications.map((c) => (
              <option key={c} value={c.toLowerCase()}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Immigration status</label>
          <select name="immigrationStatus" className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2">
            {immigrationStatuses.map((s) => (
              <option key={s} value={s}>{s === "prefer_not_to_say" ? "Prefer not to say" : s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Already pay in-state tuition?</label>
          <select name="inStateTuition" className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2">
            {ynp.map((v) => (
              <option key={v} value={v}>{v === "prefer_not_to_say" ? "Prefer not to say" : v[0].toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Work authorization / SSN</label>
          <select name="workAuth" className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2">
            {ynp.map((v) => (
              <option key={v} value={v}>{v === "prefer_not_to_say" ? "Prefer not to say" : v[0].toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 text-sm font-semibold hover:opacity-95"
        >
          Save and continue
        </button>
        <a href="/ccny" className="text-sm underline text-neutral-600 dark:text-neutral-400">Skip for now</a>
      </div>
    </form>
  );
}
