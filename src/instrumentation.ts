// Background sync: while the app is running, check Gmail on a fixed interval.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __jobTrackerTimer?: ReturnType<typeof setInterval> };
  if (g.__jobTrackerTimer) return;

  const { getKv } = await import("./lib/db");
  const { startSync } = await import("./lib/sync");
  const { connectedEmail } = await import("./lib/google");

  const tick = () => {
    try {
      const hours = Number(getKv("sync_interval_hours") ?? 6);
      const last = getKv("last_sync_at");
      const due = !last || Date.now() - new Date(last).getTime() >= hours * 3_600_000;
      if (hours > 0 && due && connectedEmail()) startSync();
    } catch (err) {
      console.error("[auto-sync]", err);
    }
  };

  // Check every 10 minutes whether a sync is due.
  g.__jobTrackerTimer = setInterval(tick, 10 * 60_000);
  setTimeout(tick, 15_000);
}
