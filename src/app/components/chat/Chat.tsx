"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, BadgeCheck, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ---------- types ---------- */

type Card = {
  name: string;
  url: string;
  category: string;
  why?: string | null;
  deadline?: string | null;
  authority?: string | null;
  tags?: string[];
  verified?: boolean;
  verified_at?: string | null;
};

type ChatResp = {
  session_id?: string;
  ask?: string | null;
  answer_text?: string | null;
  cards?: Card[];
  error?: string;
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  cards?: Card[];
  /** true when this assistant message is the residency clarifying question */
  isAsk?: boolean;
};

type Profile = { has_instate?: boolean | null };

/* ---------- helpers ---------- */

const SUGGESTIONS = ["In-state tuition?", "Scholarships for DACA", "NYS Dream Act"];

const TAG_LABELS: Record<string, string> = {
  daca: "DACA",
  undocumented: "Undocumented OK",
  "in-state-tuition": "In-state tuition",
  "financial-aid": "Financial aid",
  scholarship: "Scholarship",
  "work-authorization": "Work authorization",
};

function tagChips(card: Card): string[] {
  const fromTags = (card.tags ?? [])
    .map((t) => TAG_LABELS[t])
    .filter((t): t is string => Boolean(t));
  if (fromTags.length) return fromTags.slice(0, 3);
  return card.category ? [card.category] : [];
}

function relTime(iso?: string | null): string | null {
  if (!iso) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

const SID_KEY = "agent_sid_home";

/* ---------- component ---------- */

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [tailorDismissed, setTailorDismissed] = useState(false);
  const lastQuestion = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessionId(localStorage.getItem(SID_KEY));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string, profileOverride?: Profile) {
    const q = text.trim();
    if (!q || loading) return;
    const prof = profileOverride ?? profile;

    setMessages((curr) => [...curr, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ccny", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: q,
          session_id: sessionId,
          school_code: "ccny",
          ...(prof.has_instate !== undefined ? { profile: { has_instate: prof.has_instate } } : {}),
        }),
      });
      const data = (await res.json()) as ChatResp;

      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(SID_KEY, data.session_id);
      }

      if (data.ask) {
        setMessages((curr) => [...curr, { role: "assistant", text: data.ask!, isAsk: true }]);
      } else if (data.answer_text) {
        setMessages((curr) => [
          ...curr,
          { role: "assistant", text: data.answer_text!, cards: data.cards ?? [] },
        ]);
      } else {
        setMessages((curr) => [
          ...curr,
          { role: "assistant", text: data.error || "Sorry — I couldn't generate a reply. Try again." },
        ]);
      }
    } catch {
      setMessages((curr) => [
        ...curr,
        { role: "assistant", text: "Couldn't reach the server. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function ask(text: string) {
    lastQuestion.current = text;
    void send(text);
  }

  /** Residency answer chips: reply to the agent's clarifying question. */
  function answerResidency(hasInstate: boolean) {
    setProfile({ has_instate: hasInstate });
    setTailorDismissed(true);
    void send(hasInstate ? "Yes, I already pay in-state tuition" : "No, not yet", {
      has_instate: hasInstate,
    });
  }

  /** Optional narrowing after an answer: set profile and re-ask the last question. */
  function tailor(hasInstate: boolean) {
    setProfile({ has_instate: hasInstate });
    setTailorDismissed(true);
    if (lastQuestion.current) {
      void send(lastQuestion.current, { has_instate: hasInstate });
    }
  }

  const last = messages[messages.length - 1];
  const showAskChips = !loading && last?.role === "assistant" && last.isAsk;
  const showTailor =
    !loading &&
    !tailorDismissed &&
    profile.has_instate === undefined &&
    last?.role === "assistant" &&
    !last.isAsk &&
    (last.cards?.length ?? 0) > 0;

  const empty = messages.length === 0;

  /* ---------- empty state: land & ask ---------- */

  if (empty) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-xl rounded-3xl border border-line bg-card p-6 md:p-8"
        >
          <p className="flex items-center gap-1.5 text-xs text-text/60">
            <Lock className="h-3.5 w-3.5" />
            No account · nothing stored
          </p>

          <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-heading md:text-[1.7rem]">
            Hi — ask about tuition, scholarships, or aid for CCNY students.
          </h1>

          <form
            className="relative mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              autoFocus
              className="w-full rounded-full border border-line bg-bg py-3.5 pl-5 pr-14 text-[15px] text-heading placeholder:text-text/50"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-60"
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
          </form>

          <div className="mt-5">
            <p className="text-xs text-text/60">Try one:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm text-text transition-colors hover:border-primary/50 hover:text-heading"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-text/50">
            Informational guidance only — not legal advice. También puedes escribir en español.
          </p>
        </motion.div>
      </div>
    );
  }

  /* ---------- conversation state ---------- */

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-10">
        <div className="space-y-5">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-card px-4 py-2.5 text-[15px] text-heading">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="space-y-3">
                <Markdown content={m.text} />

                {m.cards && m.cards.length > 0 ? (
                  <div className="space-y-2.5">
                    {m.cards.map((c) => (
                      <a
                        key={c.url + c.name}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-line bg-card p-4 transition-colors hover:border-primary/50"
                      >
                        <p className="font-semibold text-heading">{c.name}</p>
                        {c.why ? (
                          <p className="mt-1 line-clamp-2 text-sm text-text/80">{c.why}</p>
                        ) : null}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {tagChips(c).map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-text/80"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-xs text-text/60">
                          {c.verified ? (
                            <>
                              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                              {c.authority ? `${c.authority} · ` : ""}verified{" "}
                              {relTime(c.verified_at) ?? "recently"}
                            </>
                          ) : (
                            <>{c.authority ? `${c.authority} · ` : ""}link check pending</>
                          )}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          )}

          {loading ? (
            <div className="flex items-center gap-1.5 pl-1 text-text/50">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                  style={{ animationDelay: `${d * 120}ms` }}
                />
              ))}
            </div>
          ) : null}

          {/* residency clarifying question -> answer chips */}
          <AnimatePresence>
            {showAskChips ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2"
              >
                <Chip accent onClick={() => answerResidency(true)}>
                  Yes — in-state
                </Chip>
                <Chip onClick={() => answerResidency(false)}>No, not yet</Chip>
                <Chip onClick={() => answerResidency(false)}>Not sure</Chip>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* optional narrowing after an answer */}
          <AnimatePresence>
            {showTailor ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-line bg-card p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-heading">Want more tailored results?</p>
                  <span className="text-[11px] text-text/50">optional</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text/70">Tuition:</span>
                  <Chip accent onClick={() => tailor(true)}>
                    In-state
                  </Chip>
                  <Chip onClick={() => tailor(false)}>Out-of-state</Chip>
                  <Chip onClick={() => setTailorDismissed(true)}>Not sure</Chip>
                </div>
                <button
                  type="button"
                  onClick={() => setTailorDismissed(true)}
                  className="mt-2.5 text-sm text-primary hover:underline"
                >
                  Skip — show me everything
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div ref={endRef} />
      </div>

      {/* floating composer */}
      <div className="fixed inset-x-0 bottom-6">
        <form
          className="relative mx-auto max-w-2xl px-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up…"
            className="w-full rounded-full border border-line bg-card py-3 pl-5 pr-14 text-[15px] text-heading shadow-card placeholder:text-text/50"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || loading}
            className="absolute right-6 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-60"
          >
            <ArrowUp className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- small bits ---------- */

function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2 className="mt-1 text-base font-bold text-heading">{children}</h2>,
        h2: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-semibold text-heading">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-semibold text-heading">{children}</h4>,
        p: ({ children }) => <p className="mb-3 mt-1 text-[15px] leading-relaxed text-text">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-5 mt-2 list-disc space-y-1 text-text">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-5 mt-2 list-decimal space-y-1 text-text">{children}</ol>,
        li: ({ children }) => <li className="text-[15px] leading-relaxed text-text [&>p]:mt-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-heading">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded border border-line bg-card px-1 py-0.5 text-[12px]">{children}</code>
        ),
        hr: () => <hr className="my-3 border-line" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function Chip({
  children,
  onClick,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        accent
          ? "rounded-full border border-primary bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          : "rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm text-text transition-colors hover:border-primary/50 hover:text-heading"
      }
    >
      {children}
    </button>
  );
}
