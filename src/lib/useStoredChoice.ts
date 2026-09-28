"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "stored-choice-change";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A string choice persisted in localStorage (per browser), e.g. board vs table view. */
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(EVENT, notify);
    window.addEventListener("storage", notify);
    return () => {
      window.removeEventListener(EVENT, notify);
      window.removeEventListener("storage", notify);
    };
  }, []);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

  const set = useCallback(
    (v: T) => {
      try {
        if (v === fallback) localStorage.removeItem(key);
        else localStorage.setItem(key, v);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key, fallback],
  );
  return [value, set];
}
