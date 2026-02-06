"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  resource: {
    id: string;
    kind: string;
    name: string;
    url?: string | null;
    deadline?: string | null;
  };
};

function parseDeadline(deadline?: string | null) {
  if (!deadline) return null;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function formatICSDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcs(name: string, url: string | null | undefined, deadline: Date) {
  const start = formatICSDate(deadline);
  const end = formatICSDate(new Date(deadline.getTime() + 60 * 60 * 1000));
  const description = url ? `More info: ${url}` : "Reminder for resource deadline.";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dreamers Agent//Resource Reminder//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@dreamers-agent`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${name} deadline`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function ReminderPanel({ resource }: Props) {
  const deadlineDate = useMemo(() => parseDeadline(resource.deadline), [resource.deadline]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ ok?: string; err?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  function downloadIcs() {
    if (!deadlineDate) return;
    const ics = buildIcs(resource.name, resource.url, deadlineDate);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resource.name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40)}-deadline.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submit() {
    if (!email) {
      setStatus({ err: "Add an email so we know where to send reminders." });
      return;
    }
    setStatus(null);
    if (!hasSupabase) {
      setStatus({ err: "Reminders are not enabled yet. Use Add to calendar for now." });
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.from("reminder_signups").insert([
        {
          resource_kind: resource.kind,
          resource_id: resource.id,
          name: resource.name,
          url: resource.url,
          deadline: resource.deadline,
          email,
          status: "pending",
        },
      ]);
      if (error) throw error;
      setStatus({ ok: "Thanks! We will email you before the deadline." });
      setEmail("");
    } catch (err: any) {
      setStatus({ err: err?.message || "Could not save your reminder. Try Add to calendar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold text-heading">Deadline reminders</h3>
      <p className="mt-1 text-xs text-text/70">
        Save this deadline to your calendar or request an email reminder.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={downloadIcs}
          disabled={!deadlineDate}
          className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs text-text/80 hover:bg-[color:rgb(var(--card)/0.8)] disabled:opacity-60"
        >
          Add to calendar
        </button>
        {!deadlineDate && (
          <span className="text-[11px] text-text/60">Deadline needs a clear date to generate a calendar event.</span>
        )}
      </div>

      <div className="mt-4">
        <label className="text-xs text-text/70">Email me a reminder</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            className="min-w-[220px] flex-1 rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs text-text/80 hover:bg-[color:rgb(var(--card)/0.8)] disabled:opacity-60"
          >
            {loading ? "Saving…" : "Request reminder"}
          </button>
        </div>
        {status?.ok && <div className="mt-2 text-[11px] text-green-700">{status.ok}</div>}
        {status?.err && <div className="mt-2 text-[11px] text-red-600">{status.err}</div>}
      </div>
    </div>
  );
}

