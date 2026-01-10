"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  kind: "scholarship" | "mentorship" | "resource";
  id: string;
};

export default function ResourceReport({ kind, id }: Props) {
  const supabase = createSupabaseBrowser();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState<"broken" | "invalid" | "other">("broken");
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");

  async function submit() {
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const { error } = await supabase.from("resource_flags").insert([
        {
          resource_kind: kind,
          resource_id: id,
          reason,
          comment: comment || null,
          submitted_email: email || null,
          status: "pending",
        },
      ]);
      if (error) throw error;
      setOk("Thanks for the report — we’ll review it.");
      setOpen(false);
      setComment("");
      setEmail("");
    } catch (e: any) {
      setErr(e?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  }

  // Ensure only one report popover is open at a time across the page
  useEffect(() => {
    function onOpenEvent(e: Event) {
      const detailId = (e as CustomEvent<string>).detail;
      if (detailId !== id) setOpen(false);
    }
    document.addEventListener("resource-report-open", onOpenEvent as EventListener);
    return () => document.removeEventListener("resource-report-open", onOpenEvent as EventListener);
  }, [id]);

  return (
    <div ref={containerRef} className="relative inline-block isolate">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            document.dispatchEvent(new CustomEvent("resource-report-open", { detail: id }));
          }
        }}
        className="text-xs underline underline-offset-4 text-text/80 hover:text-heading"
      >
        Report
      </button>
      {open && (
        <>
          {/* Invisible backdrop to capture clicks outside and prevent interaction with elements behind */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {/* Popover */}
          <div 
            className="absolute right-0 z-50 mt-1 w-72 rounded-xl border border-[color:rgb(var(--glass-border)/0.35)] bg-white dark:bg-[color:rgb(var(--card))] p-3 text-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
          >
            {err && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-1.5 text-xs text-red-700">{err}</div>
            )}
            <div className="space-y-2">
              <div className="text-xs text-text/70">What's wrong?</div>
              <div className="flex flex-col gap-1">
                {(["broken", "invalid", "other"] as const).map((r) => (
                  <label key={r} className="inline-flex cursor-pointer items-center gap-2">
                    <input type="radio" name={`reason-${id}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                    <span className="capitalize">{r === "broken" ? "Link broken" : r === "invalid" ? "No longer valid" : "Other"}</span>
                  </label>
                ))}
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-2 py-1 text-xs"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="text-xs text-text/70 hover:text-heading">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={submit}
                  className="rounded-md border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs hover:bg-bg/60 disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {ok && (
        <div role="status" aria-live="polite" className="mt-1 text-[11px] text-text/60">
          {ok}
        </div>
      )}
    </div>
  );
}
