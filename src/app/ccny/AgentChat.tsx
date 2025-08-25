"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = { url: string; title?: string | null };
type UICard = {
  name: string;
  url: string;
  category: string;
  why?: string | null;
  deadline?: string | null;
  authority?: string | null;
};

type ChatResp = {
  session_id: string;
  ask?: string | null;
  intent?: string | null;
  answer_text?: string | null;
  sources?: Source[];
  cards?: UICard[];
  error?: string;
};

type Msg = { role: "user" | "agent"; text: string; ts: number };

const AUTH_ORDER = ["CCNY", "CUNY", "HESC", "TheDream.US", "Immigrants Rising"];

function hostFromUrl(u: string): string | undefined {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

// Lightweight auto-link for USER messages only
function autoLink(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((p, i) =>
    urlRegex.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// --- Markdown renderer for AGENT messages ---
function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings -> slightly larger text with spacing
        h1: ({ children }) => <h2 className="text-base font-bold mt-1">{children}</h2>,
        h2: ({ children }) => <h3 className="text-sm font-semibold mt-5 mb-2">{children}</h3>,
        h3: ({ children }) => <h4 className="text-sm font-semibold mt-4 mb-2">{children}</h4>,
        p: ({ children }) => <p className="text-sm leading-relaxed mb-3">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mt-2 mb-3">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mt-2 mb-3">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
        // Links
        a: ({ href, children }) => (
          <a
            href={href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-neutral-500 hover:decoration-neutral-900"
          >
            {children}
          </a>
        ),
        // Blockquotes -> subtle left border
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 my-2 text-sm italic">
            {children}
          </blockquote>
        ),
        // Code (inline)
        code: ({ children }) => (
          <code className="text-[12px] rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5">{children}</code>
        ),
        // Code blocks
        pre: ({ children }) => (
          <pre className="text-[12px] rounded bg-neutral-100 dark:bg-neutral-800 p-3 overflow-x-auto my-2">
            {children}
          </pre>
        ),
        // Horizontal rule
        hr: () => <hr className="border-neutral-200 dark:border-neutral-800 my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function AgentChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [cards, setCards] = useState<UICard[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = localStorage.getItem("ccny_sid");
    if (sid) setSessionId(sid);
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, cards, loading]);

  const orderedCards = useMemo(() => {
    const ordered = cards.slice().sort((a, b) => {
      const ai = AUTH_ORDER.indexOf(a.authority ?? "");
      const bi = AUTH_ORDER.indexOf(b.authority ?? "");
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return cat === "all" ? ordered : ordered.filter(c => c.category === cat);
  }, [cards, cat]);

  async function send(text: string) {
    setErr(null);
    setLoading(true);
    setMessages(m => [...m, { role: "user", text, ts: Date.now() }]);
    try {
      const res = await fetch("/api/ccny", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      const raw = await res.text();
      let data: ChatResp;
      try { data = JSON.parse(raw); } catch { data = { session_id: sessionId || "", error: raw } as any; }

      if (data.error) {
        setErr(data.error);
        setMessages(m => [...m, { role: "agent", text: "Sorry — something went wrong. Try again.", ts: Date.now() }]);
      } else {
        if (!sessionId && data.session_id) {
          setSessionId(data.session_id);
          localStorage.setItem("ccny_sid", data.session_id);
        }

        if (data.ask) {
          setCards([]);
          setMessages(m => [...m, { role: "agent", text: data.ask!, ts: Date.now() }]);
        } else if (data.answer_text) {
            const srcBlock =
                (data.sources?.length ?? 0) > 0
                    ? "\n\n## Sources\n" + data.sources!.map((s, i) => `- [${i + 1}] ${s.url}`).join("\n")
                    : "";
          setMessages(m => [...m, { role: "agent", text: (data.answer_text || "") + srcBlock, ts: Date.now() }]);
          setCards(Array.isArray(data.cards) ? data.cards : []);
        } else {
          setMessages(m => [...m, { role: "agent", text: "Hmm, I couldn't generate a reply.", ts: Date.now() }]);
          setCards([]);
        }
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setMessages(m => [...m, { role: "agent", text: "Network error — check the backend is running.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setCards([]);
    setCat("all");
    setErr(null);
  }

  function copyLinks() {
    const links = cards.map(c => `- ${c.name} — ${c.url}`).join("\n");
    navigator.clipboard.writeText(links || "No cards to copy.");
  }

  function exportCSV() {
    const headers = ["name", "url", "category", "authority", "deadline", "why"];
    const rows = cards.map(c =>
      headers.map(h => `"${String((c as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ccny-resources.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cats = ["all", "tuition", "scholarship", "grant", "advising", "benefit", "legal", "fellowship"];

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <div className="text-sm font-semibold">CCNY Student Support Agent</div>
        </div>
        <div className="text-xs opacity-70">
          {sessionId ? `session: ${sessionId.slice(0, 8)}…` : "new session"}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollerRef} className="max-h-[52vh] overflow-y-auto space-y-3 pr-1">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={
                m.role === "user"
                    ? "whitespace-pre-wrap overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 p-3"
                    : "whitespace-pre-wrap overflow-hidden rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3"
                }
          >
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-2">
              <span className="opacity-80">{m.role === "user" ? "You" : "Agent"}</span>
              <span>·</span>
              <span>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>

            <div className="text-sm leading-relaxed break-words">
              {m.role === "agent" ? <Markdown content={m.text} /> : autoLink(m.text)}
            </div>
          </div>
        ))}

        {!messages.length && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            try: <em>“Undocumented freshman at CCNY — how do I get in-state tuition?”</em> or{" "}
            <em>“DACA junior CS at CCNY, low income, 12 credits — scholarships?”</em>
          </div>
        )}

        {loading && (
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3">
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">Agent</div>
            <div className="flex items-center gap-2">
              <span className="animate-pulse">typing</span>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500/60 animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500/60 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500/60 animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {cats.map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`px-2 py-1 rounded-full text-xs border border-black/10 dark:border-white/10 ${
                cat === k ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "opacity-80"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={copyLinks} className="text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10">
          Copy links
        </button>
        <button onClick={exportCSV} className="text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10">
          Export CSV
        </button>
        <button onClick={resetChat} className="text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10">
          Reset
        </button>
      </div>

      {/* Resource cards */}
      {orderedCards.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {orderedCards.map((c, i) => (
            <a
              key={`${c.url}-${i}`}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-neutral-900/60 hover:shadow-sm hover:-translate-y-0.5 transition"
            >
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                {c.authority || hostFromUrl(c.url) || "Source"}
              </div>
              <div className="mt-0.5 text-sm font-semibold leading-snug">{c.name}</div>
              <div className="mt-1 text-[11px] opacity-70">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center rounded-full border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] uppercase">
                    {c.category}
                  </span>
                  {c.deadline ? <span>• Deadline: {c.deadline}</span> : null}
                </span>
              </div>
              {c.why && (
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200 line-clamp-3">{c.why}</p>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = inputRef.current?.value?.trim();
          if (!v) return;
          inputRef.current!.value = "";
          send(v);
        }}
      >
        <input
          ref={inputRef}
          placeholder="Ask about in-state tuition, NYSDA/TAP, scholarships, grants…"
          className="flex-1 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 bg-white/80 dark:bg-neutral-900"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-60"
        >
          {loading ? "…" : "Send"}
        </button>
      </form>

      {/* Error */}
      {err && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          {err}
        </div>
      )}
    </div>
  );
}
