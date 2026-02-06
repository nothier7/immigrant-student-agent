"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonCn } from "@/app/components/ui/Button";

type School = { code: string; name: string };

type Props = {
  variant?: "hero" | "inline";
  initialSchoolCode?: string;
  schools?: School[];
};

const FALLBACK_SCHOOLS: School[] = [
  { code: "all-cuny", name: "All CUNY" },
  { code: "ccny", name: "City College of New York (CCNY)" },
];

const STATUS_OPTIONS = [
  { value: "undocumented", label: "Undocumented" },
  { value: "daca_tps", label: "DACA / TPS / Asylee" },
  { value: "international", label: "International / Other" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

const INSTATE_OPTIONS = [
  { value: "yes", label: "Yes, I already have in-state tuition" },
  { value: "no", label: "No, I do not have in-state tuition yet" },
  { value: "unsure", label: "Not sure" },
] as const;

const GOAL_OPTIONS = [
  { value: "tuition", label: "In-state tuition / residency" },
  { value: "aid", label: "Financial aid / Dream Act" },
  { value: "scholarships", label: "Scholarships / grants" },
  { value: "advising", label: "Advising / campus resources" },
  { value: "other", label: "Other" },
] as const;

export default function IntakeWizard({ variant = "hero", initialSchoolCode, schools }: Props) {
  const router = useRouter();
  const [school, setSchool] = useState<string>(initialSchoolCode || "ccny");
  const [status, setStatus] = useState<string>("undocumented");
  const [inState, setInState] = useState<string>("unsure");
  const [goal, setGoal] = useState<string>("tuition");
  const [options, setOptions] = useState<School[]>(schools?.length ? schools : FALLBACK_SCHOOLS);
  const [loadingSchools, setLoadingSchools] = useState(false);

  useEffect(() => {
    if (schools?.length) return;
    setLoadingSchools(true);
    fetch("/api/schools")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.schools) && data.schools.length) {
          const incoming = data.schools as School[];
          const hasAll = incoming.some((s) => s.code === "all-cuny");
          setOptions(hasAll ? incoming : [{ code: "all-cuny", name: "All CUNY" }, ...incoming]);
        }
      })
      .catch(() => {
        /* fallback already set */
      })
      .finally(() => setLoadingSchools(false));
  }, [schools]);

  const selectedSchool = useMemo(() => options.find((s) => s.code === school), [options, school]);

  function buildPrefill() {
    const schoolName = selectedSchool?.name || school.toUpperCase();
    const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    const inStateLabel = INSTATE_OPTIONS.find((s) => s.value === inState)?.label ?? inState;
    const goalLabel = GOAL_OPTIONS.find((g) => g.value === goal)?.label ?? goal;
    return `I attend ${schoolName}. Status: ${statusLabel}. ${inStateLabel}. I'm looking for help with ${goalLabel.toLowerCase()}.`;
  }

  function onSubmit() {
    const prefill = buildPrefill();
    const params = new URLSearchParams({
      prefill,
      school,
      status,
      instate: inState,
      goal,
    });
    if (school === "all-cuny") {
      router.push(`/resources?school=all-cuny`);
      return;
    }
    const target = school === "ccny" ? "/ccny" : `/schools/${encodeURIComponent(school)}`;
    router.push(`${target}?${params.toString()}`);
  }

  return (
    <section
      aria-label="Quick intake form"
      className={`rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card ${
        variant === "hero" ? "mt-8" : "mt-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-heading">Quick intake</h2>
          <p className="text-xs text-text/70">
            Answer a few questions so we can route you to the best resources fast.
          </p>
        </div>
        {loadingSchools && <span className="text-[11px] text-text/60">Loading schools…</span>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-text/70">School</label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm"
          >
            {options.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text/70">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text/70">In-state tuition</label>
          <select
            value={inState}
            onChange={(e) => setInState(e.target.value)}
            className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm"
          >
            {INSTATE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text/70">Goal</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm"
          >
            {GOAL_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          className={[
            buttonCn({ variant: "outline", size: "md" }),
            "border-[color:rgb(var(--glass-border)/0.28)] dark:border-[color:rgb(var(--glass-border)/0.5)]",
          ].join(" ")}
        >
          Get my recommendations
        </button>
        <span className="text-[11px] text-text/60">
          We only use this to personalize your guidance. No legal advice.
        </span>
      </div>
    </section>
  );
}

