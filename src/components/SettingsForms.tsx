"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client";
import { DEFAULT_FIRST_SYNC_RANGE, FIRST_SYNC_RANGES, FIRST_SYNC_RANGE_LABEL, type FirstSyncRange } from "@/lib/types";
import { Button, inputClass } from "./ui";

export function GmailConnection({
  email,
  canConnect,
  firstSync,
}: {
  email: string | null;
  canConnect: boolean;
  firstSync: boolean;
}) {
  const router = useRouter();
  const [range, setRange] = useState<FirstSyncRange>(DEFAULT_FIRST_SYNC_RANGE);
  if (!email) {
    return (
      <div className="space-y-3 pt-1">
        {firstSync && (
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-ink-2">First sync reads</span>
            <select className={inputClass} value={range} onChange={(e) => setRange(e.target.value as FirstSyncRange)}>
              {FIRST_SYNC_RANGES.map((r) => (
                <option key={r} value={r}>
                  {FIRST_SYNC_RANGE_LABEL[r]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted">
              Longer ranges take longer: the local model needs about 10 seconds per email. Later syncs only read new
              email.
            </span>
          </label>
        )}
        {canConnect ? (
          <a
            href={firstSync ? `/api/auth/google?range=${range}` : "/api/auth/google"}
            className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink"
          >
            Connect Gmail (read-only)
          </a>
        ) : (
          <Button disabled>Connect Gmail (finish step 2 first)</Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span>
        Connected as <span className="font-medium text-ink">{email}</span>
      </span>
      <a href="/api/auth/google" className="text-sm font-medium text-accent">
        Reconnect
      </a>
      <Button
        size="sm"
        variant="danger"
        onClick={async () => {
          await sendJson("/api/auth/google/disconnect", "POST", {});
          router.refresh();
        }}
      >
        Disconnect
      </Button>
    </div>
  );
}

export function SyncSettings({ intervalHours, ghostedDays }: { intervalHours: number; ghostedDays: number }) {
  const [hours, setHours] = useState(intervalHours);
  const [days, setDays] = useState(ghostedDays);
  const [status, setStatus] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendJson("/api/settings", "PATCH", { syncIntervalHours: hours, ghostedDays: days });
      setStatus("Saved");
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Auto-sync every</span>
          <select className={inputClass} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={0}>Off (manual only)</option>
            <option value={1}>1 hour</option>
            <option value={3}>3 hours</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
          </select>
          <span className="mt-1 block text-xs text-muted">Runs while the app is open in the background.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Mark as ghosted after (days without reply)</span>
          <input
            type="number"
            min={7}
            max={365}
            className={inputClass}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary">
          Save
        </Button>
        {status && <span className="text-sm text-ink-2">{status}</span>}
      </div>
    </form>
  );
}
