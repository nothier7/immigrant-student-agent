export type SavedResource = {
  key: string;
  id: string;
  kind: string;
  name: string;
  url?: string | null;
  deadline?: string | null;
  saved_at: number;
};

const STORAGE_KEY = "saved_resources_v1";

type StorageShape = { v: 1; items: SavedResource[] };

function readStorage(): StorageShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageShape;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadSavedResources(): SavedResource[] {
  const stored = readStorage();
  return stored?.items ?? [];
}

export function persistSavedResources(items: SavedResource[]) {
  if (typeof window === "undefined") return;
  const payload: StorageShape = { v: 1, items };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function toggleSavedResource(item: Omit<SavedResource, "key" | "saved_at">) {
  const key = `${item.kind}:${item.id}`;
  const current = loadSavedResources();
  const existing = current.find((i) => i.key === key);
  let next: SavedResource[];
  let saved = false;

  if (existing) {
    next = current.filter((i) => i.key !== key);
  } else {
    saved = true;
    next = [
      { ...item, key, saved_at: Date.now() },
      ...current,
    ].slice(0, 200);
  }

  persistSavedResources(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("saved-resources-updated"));
  }

  return { saved, items: next };
}

