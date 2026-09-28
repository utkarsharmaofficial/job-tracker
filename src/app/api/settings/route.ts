import { NextResponse } from "next/server";
import { z } from "zod";
import { setKv } from "@/lib/db";
import { rejectCrossSite } from "@/lib/api";

const Settings = z.object({
  syncIntervalHours: z.number().int().min(0).max(168).optional(),
  ghostedDays: z.number().int().min(7).max(365).optional(),
});

export async function PATCH(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const parsed = Settings.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  if (parsed.data.syncIntervalHours !== undefined) setKv("sync_interval_hours", String(parsed.data.syncIntervalHours));
  if (parsed.data.ghostedDays !== undefined) setKv("ghosted_days", String(parsed.data.ghostedDays));
  return NextResponse.json({ ok: true });
}
