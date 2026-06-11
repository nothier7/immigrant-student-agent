"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, KeyRound, RefreshCw, X } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { buttonCn } from "@/app/components/ui/Button";

type PendingResource = {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  tags: string[];
  source_tier: number;
  added_by: string;
  created_at: string;
};

const KEY_STORAGE = "admin_key";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<PendingResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (stored) {
      setAdminKey(stored);
      setUnlocked(true);
    }
  }, []);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/pending", { headers: { "x-admin-key": key } });
      if (r.status === 401) {
        setUnlocked(false);
        sessionStorage.removeItem(KEY_STORAGE);
        setErr("Invalid admin key.");
        return;
      }
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setErr(data?.error || data?.detail || `Request failed (${r.status})`);
        return;
      }
      setItems((await r.json()) as PendingResource[]);
      setUnlocked(true);
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked && adminKey) void load(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/${action}/${id}`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setErr(data?.error || data?.detail || `${action} failed (${r.status})`);
        return;
      }
      setItems((curr) => curr.filter((it) => it.id !== id));
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg text-text antialiased transition-colors">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-heading">Resource review</h1>
        <p className="mt-2 text-sm text-text/80">
          Discovered resources wait here as <code>pending_review</code>. Approving hands them to
          the verifier (<code>unverified</code>) — they are only served after it checks them.
          Rejecting deletes them.
        </p>

        {!unlocked ? (
          <form
            className="mt-6 flex max-w-md items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (adminKey.trim()) void load(adminKey.trim());
            }}
          >
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/50" />
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card py-2 pl-9 pr-3 text-sm"
                autoFocus
              />
            </div>
            <button type="submit" className={buttonCn({ variant: "outline", size: "md" })} disabled={loading}>
              {loading ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-heading">
                Pending {items.length > 0 ? `(${items.length})` : ""}
              </h2>
              <button
                type="button"
                onClick={() => void load(adminKey)}
                className={buttonCn({ variant: "ghost", size: "sm" })}
                disabled={loading}
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {items.length === 0 && !loading ? (
              <p className="mt-6 rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-6 text-center text-sm text-text/70 shadow-card">
                Review queue is empty. New candidates appear here after a discovery run.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-heading">{it.name}</p>
                        {it.description ? (
                          <p className="mt-1 text-sm text-text/80">{it.description}</p>
                        ) : null}
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{it.url}</span>
                        </a>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {it.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-[color:rgb(var(--primary)/0.08)] px-2 py-0.5 text-[11px] text-heading"
                            >
                              {t}
                            </span>
                          ))}
                          <span className="text-[11px] text-text/50">
                            via {it.added_by} · {new Date(it.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void act(it.id, "approve")}
                          disabled={acting === it.id}
                          className={buttonCn({ variant: "outline", size: "sm" })}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(it.id, "reject")}
                          disabled={acting === it.id}
                          className={buttonCn({ variant: "ghost", size: "sm" })}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {err ? <p className="mt-4 text-sm text-red-500">{err}</p> : null}
      </main>
      <Footer />
    </div>
  );
}
