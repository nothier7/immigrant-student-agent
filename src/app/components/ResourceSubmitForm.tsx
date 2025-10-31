"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Props = { schoolCode: string };

export default function ResourceSubmitForm({ schoolCode }: Props) {
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOk(null);
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const submission_type = String(fd.get("submission_type") || "resource");
    const name = String(fd.get("name") || "").trim();
    const url = String(fd.get("url") || "").trim() || null;
    const description = String(fd.get("description") || "").trim() || null;
    const category = String(fd.get("category") || "").trim() || null;
    const authority = String(fd.get("authority") || "").trim() || null;
    const deadline = String(fd.get("deadline") || "").trim() || null;
    const submitted_email = String(fd.get("email") || "").trim() || null;

    if (!name) {
      setErr("Name is required");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from("resource_submissions").insert([
        {
          submission_type,
          name,
          url,
          description,
          category,
          authority,
          schools: [schoolCode],
          eligibility_tags: [],
          deadline,
          amount_min: null,
          amount_max: null,
          contact_info: {},
          status: "pending",
          submitted_email,
        },
      ]);
      if (error) throw error;
      setOk("Thanks! We received your submission and will review it shortly.");
      formRef.current?.reset();
    } catch (er: any) {
      setErr(er?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {err}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Type</label>
          <select name="submission_type" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm">
            <option value="resource">Resource</option>
            <option value="scholarship">Scholarship</option>
            <option value="mentorship">Mentorship</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Authority/Org (optional)</label>
          <input name="authority" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <input name="name" required className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Link (URL)</label>
        <input name="url" type="url" placeholder="https://example.org" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description (optional)</label>
        <textarea name="description" rows={3} className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Category (optional)</label>
          <input name="category" placeholder="e.g., tutoring, legal, basic-needs" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Deadline (optional)</label>
          <input name="deadline" placeholder="e.g., 2025-02-15 or rolling" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Your email (for follow‑up, optional)</label>
        <input name="email" type="email" className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-2 text-sm" />
      </div>

      <div className="pt-2">
        <button type="submit" disabled={loading} className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-4 py-2 text-sm text-heading/90 hover:bg-bg/60 disabled:opacity-60">
          {loading ? "Submitting…" : "Submit resource"}
        </button>
        {ok && (
          <div role="status" aria-live="polite" className="mt-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
            {ok}
          </div>
        )}
      </div>
    </form>
  );
}
