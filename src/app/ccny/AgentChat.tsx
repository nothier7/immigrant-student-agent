"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, SlidersHorizontal, User } from "lucide-react";
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
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
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
        h1: ({ children }) => <h2 className="mt-1 text-base font-bold text-heading">{children}</h2>,
        h2: ({ children }) => <h3 className="mb-2 mt-5 text-sm font-semibold text-heading">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold text-heading">{children}</h4>,
        p: ({ children }) => <p className="mt-1 mb-3 text-sm leading-relaxed text-text">{children}</p>,
        ul: ({ children }) => <ul className="ml-5 mt-2 mb-3 list-disc space-y-1 text-text">{children}</ul>,
        ol: ({ children }) => <ol className="ml-5 mt-2 mb-3 list-decimal space-y-1 text-text">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed [&>p]:mt-2 text-text">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-[color:rgb(var(--glass-border)/0.18)] pl-3 text-sm italic text-text">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded bg-[color:rgb(var(--card)/0.9)] px-1 py-0.5 text-[12px]">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded bg-[color:rgb(var(--card)/0.9)] p-3 text-[12px]">{children}</pre>
        ),
        hr: () => <hr className="my-3 border-[color:rgb(var(--glass-border)/0.18)]" />,
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showResources, setShowResources] = useState(true);

  useEffect(() => {
    const sid = localStorage.getItem("ccny_sid");
    if (sid) setSessionId(sid);
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, cards, loading]);

  // Prefer collapsed resources on small screens
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSmall = window.matchMedia("(max-width: 640px)").matches;
    if (isSmall) setShowResources(false);
  }, []);

  // Helper: split agent message into main content and optional sources block
  function splitSourcesBlock(text: string): { main: string; sources?: string; count?: number } {
    const parts = text.split(/\n##\s*Sources\s*\n/i);
    if (parts.length < 2) return { main: text };
    const sources = parts.slice(1).join("\n");
    const count = (sources.match(/^\s*[-*]\s/mg) || []).length;
    return { main: parts[0], sources, count };
  }

  // Show a scroll-to-bottom button when the user scrolls up
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setShowScrollButton(!atBottom);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard shortcut: '/' focuses the chat input (common pattern)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.activeElement && (document.activeElement as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const orderedCards = useMemo(() => {
    const ordered = cards.slice().sort((a, b) => {
      const ai = AUTH_ORDER.indexOf(a.authority ?? "");
      const bi = AUTH_ORDER.indexOf(b.authority ?? "");
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return cat === "all" ? ordered : ordered.filter((c) => c.category === cat);
  }, [cards, cat]);

  async function send(text: string) {
    setErr(null);
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text, ts: Date.now() }]);
    try {
      const res = await fetch("/api/ccny", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      const raw = await res.text();
      let data: ChatResp;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { session_id: sessionId || "", error: raw };
      }

      if (data.error) {
        setErr(data.error);
        setMessages((m) => [...m, { role: "agent", text: "Sorry — something went wrong. Try again.", ts: Date.now() }]);
      } else {
        if (!sessionId && data.session_id) {
          setSessionId(data.session_id);
          localStorage.setItem("ccny_sid", data.session_id);
        }

        if (data.ask) {
          setCards([]);
          setMessages((m) => [...m, { role: "agent", text: data.ask!, ts: Date.now() }]);
        } else if (data.answer_text) {
          const srcBlock =
            (data.sources?.length ?? 0) > 0
              ? "\n\n## Sources\n" + data.sources!.map((s, i) => `- [${i + 1}] ${s.url}`).join("\n")
              : "";
          setMessages((m) => [...m, { role: "agent", text: (data.answer_text || "") + srcBlock, ts: Date.now() }]);
          setCards(Array.isArray(data.cards) ? data.cards : []);
        } else {
          setMessages((m) => [...m, { role: "agent", text: "Hmm, I couldn't generate a reply.", ts: Date.now() }]);
          setCards([]);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setErr(msg);
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Network error — check the backend is running.", ts: Date.now() },
      ]);
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
    const links = cards.map((c) => `- ${c.name} — ${c.url}`).join("\n");
    navigator.clipboard.writeText(links || "No cards to copy.");
  }

  function exportCSV() {
    const headers = ["name", "url", "category", "authority", "deadline", "why"] as const;
    const rows = cards.map((c) =>
      headers
        .map((h) => {
          const v = c[h] ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(",")
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
    <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card">
      {/* Header */}
      <div className="sticky -top-4 z-10 mb-2 flex items-center justify-between gap-3 border-b border-[color:rgb(var(--glass-border)/0.12)] bg-card/80 px-1 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-accent" />
          <div className="text-sm font-semibold text-heading">CCNY Student Support Agent</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-[11px] text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Options
          </button>
          <div className="text-xs text-text/70 hidden sm:block">{sessionId ? `session: ${sessionId.slice(0, 8)}…` : "new session"}</div>
        </div>
      </div>

      {showTools && (
        <div className="mb-2 rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto">
              {cats.map((k) => (
                <button
                  key={k}
                  onClick={() => setCat(k)}
                  className={`rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs ${
                    cat === k
                      ? "bg-[color:rgb(var(--primary))] text-white"
                      : "text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              onClick={copyLinks}
              className="rounded-md border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs text-text/90 hover:bg-[color:rgb(var(--card)/0.8)]"
            >
              Copy links
            </button>
            <button
              onClick={exportCSV}
              className="rounded-md border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs text-text/90 hover:bg-[color:rgb(var(--card)/0.8)]"
            >
              Export CSV
            </button>
            <button
              onClick={resetChat}
              className="rounded-md border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs text-text/90 hover:bg-[color:rgb(var(--card)/0.8)]"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div ref={scrollerRef} className="relative max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {showScrollButton && (
          <button
            type="button"
            onClick={() => {
              scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
            }}
            className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--glass-border)/0.18)] bg-card/90 px-2 py-1 text-xs text-text/80 shadow-card backdrop-blur hover:bg-bg/70"
          >
            <ChevronDown className="h-4 w-4" />
            New
          </button>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "agent" && (
              <span className="mr-2 mt-1 hidden h-6 w-6 items-center justify-center rounded-full bg-[color:rgb(var(--primary)/0.08)] sm:inline-flex">
                <Bot className="h-3.5 w-3.5 text-heading" />
              </span>
            )}
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-sm md:max-w-[70%] ${
                m.role === "user"
                  ? "bg-[color:rgb(var(--card)/0.9)]"
                  : "bg-[color:rgb(var(--primary)/0.06)]"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-text/70">
                <span className="opacity-80">{m.role === "user" ? "You" : "Agent"}</span>
                <span>·</span>
                <span>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {m.role === "agent" ? (
                (() => {
                  const { main, sources, count } = splitSourcesBlock(m.text);
                  return (
                    <div className="space-y-1">
                      <div className="break-words whitespace-normal text-sm leading-relaxed text-text">
                        <Markdown content={main} />
                      </div>
                      {sources && (
                        <details className="mt-1 text-sm text-text/85">
                          <summary className="cursor-pointer list-none text-text/70 hover:opacity-80">
                            Sources{typeof count === "number" ? ` (${count})` : ""}
                          </summary>
                          <div className="mt-1">
                            <Markdown content={sources} />
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="break-words whitespace-normal text-sm leading-relaxed text-text">{autoLink(m.text)}</div>
              )}
            </div>
            {m.role === "user" && (
              <span className="ml-2 mt-1 hidden h-6 w-6 items-center justify-center rounded-full bg-[color:rgb(var(--card))] sm:inline-flex">
                <User className="h-3.5 w-3.5 text-heading" />
              </span>
            )}
          </div>
        ))}

        {/* Removed initial suggestions to reduce clutter on mobile */}

        {loading && (
          <div className="rounded-xl bg-[color:rgb(var(--primary)/0.06)] p-3">
            <div className="mb-1 text-[11px] font-medium text-text/70">Agent</div>
            <div className="flex items-center gap-2">
              <span className="animate-pulse">typing</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text/60 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text/60 [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text/60 [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls row moved into Tools panel */}

      {/* Resource cards */}
      {orderedCards.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowResources((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1 text-xs text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showResources ? "rotate-0" : "-rotate-90"}`} />
            Resources ({orderedCards.length})
          </button>
          {showResources && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {orderedCards.map((c, i) => (
                <a
                  key={`${c.url}-${i}`}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow"
                >
                  <div className="text-[11px] uppercase tracking-wide text-text/60">
                    {c.authority || hostFromUrl(c.url) || "Source"}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold leading-snug text-heading">{c.name}</div>
                  <div className="mt-1 text-[11px] text-text/70">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-1.5 py-0.5 text-[10px] uppercase">
                        {c.category}
                      </span>
                      {c.deadline ? <span>• Deadline: {c.deadline}</span> : null}
                    </span>
                  </div>
                  {c.why && <p className="mt-2 line-clamp-3 text-sm text-text/85">{c.why}</p>}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const v = inputRef.current?.value?.trim();
          if (!v) return;
          inputRef.current!.value = "";
          send(v);
        }}
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const v = inputRef.current?.value?.trim();
                if (!v || loading) return;
                inputRef.current!.value = "";
                send(v);
              }
            }}
            placeholder="Ask about in-state tuition, NYSDA/TAP, scholarships, grants…"
            className="max-h-40 min-h-[38px] flex-1 resize-none rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-[color:rgb(var(--card)/0.9)] px-3 py-2 text-sm text-text placeholder:text-text/60"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-2 text-sm text-heading/90 hover:bg-bg/60 disabled:opacity-60"
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-text/60">
          <div className="hidden gap-1 md:flex">
            {[
              "I’m undocumented at CCNY — how do I get in-state tuition?",
              "DACA junior CS at CCNY — scholarships I’m eligible for?",
              "Financial aid options at CCNY without SSN?",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-0.5 hover:bg-[color:rgb(var(--card)/0.8)]"
              >
                {q}
              </button>
            ))}
          </div>
          <div>Press Enter to send • Shift+Enter for newline</div>
        </div>
      </form>

      {/* Error */}
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
    </div>
  );
}
