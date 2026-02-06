"use client";

import { useEffect, useState } from "react";
import { loadSavedResources, type SavedResource } from "@/lib/saved-resources";

export function useSavedResources() {
  const [items, setItems] = useState<SavedResource[]>([]);

  useEffect(() => {
    const refresh = () => setItems(loadSavedResources());
    refresh();
    window.addEventListener("saved-resources-updated", refresh);
    return () => window.removeEventListener("saved-resources-updated", refresh);
  }, []);

  return items;
}

