"use client";

import { useState } from "react";

export default function ShareLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      const finalUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]"
    >
      {copied ? "Copied link" : "Share"}
    </button>
  );
}

