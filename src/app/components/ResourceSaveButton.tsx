"use client";

import { useMemo, useState } from "react";
import { toggleSavedResource } from "@/lib/saved-resources";
import { useSavedResources } from "@/app/components/useSavedResources";

type Props = {
  id: string;
  kind: string;
  name: string;
  url?: string | null;
  deadline?: string | null;
  size?: "xs" | "sm";
};

export default function ResourceSaveButton({ id, kind, name, url, deadline, size = "sm" }: Props) {
  const savedItems = useSavedResources();
  const key = `${kind}:${id}`;
  const isSaved = useMemo(() => savedItems.some((i) => i.key === key), [savedItems, key]);
  const [saving, setSaving] = useState(false);

  function onToggle() {
    if (saving) return;
    setSaving(true);
    toggleSavedResource({ id, kind, name, url, deadline });
    setSaving(false);
  }

  const sizeClasses = size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSaved}
      className={`rounded-full border border-[color:rgb(var(--glass-border)/0.18)] ${sizeClasses} text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]`}
    >
      {isSaved ? "Saved" : "Save"}
    </button>
  );
}

