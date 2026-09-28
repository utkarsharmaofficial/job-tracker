"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { SyncState } from "@/lib/types";

function ago(iso: string | null): string {
  if (!iso) return "Never synced";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Synced just now";
  if (mins < 60) return `Synced ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.round(hours / 24)}d ago`;
}

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wasRunning = useRef(false);

  const apply = useCallback(
    (s: SyncState) => {
      setState(s);
      if (wasRunning.current && !s.running) router.refresh();
      wasRunning.current = s.running;
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/sync")
        .then((r) => r.json())
        .then((s: SyncState) => !cancelled && apply(s))
        .catch(() => {});
    load();
    // Poll quickly while a sync runs, otherwise every minute (auto-sync may start one).
    const t = setInterval(load, state?.running ? 1500 : 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [state?.running, apply]);

  async function sync() {
    setError(null);
    const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const body = await res.json();
    if (!res.ok) setError(body.error);
    else {
      wasRunning.current = true;
      setState(body);
    }
  }

  const running = state?.running ?? false;
  const progress = running && state && state.total > 0 ? `${state.processed}/${state.total}` : null;
  const problem = error ?? state?.error ?? null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={running}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-70"
      >
        <RefreshCw className={`size-4 ${running ? "animate-spin" : ""}`} />
        <span className="hidden md:inline">{running ? `Syncing ${progress ?? "…"}` : "Sync now"}</span>
      </button>
      <p className="hidden px-1 text-[11px] text-muted md:block" title={problem ?? undefined}>
        {running ? state?.phase : ago(state?.lastSyncAt ?? null)}
      </p>
      {problem && !running && <p className="hidden px-1 text-[11px] leading-snug text-critical md:block">{problem}</p>}
    </div>
  );
}
