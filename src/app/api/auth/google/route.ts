import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authUrl, googleConfigured } from "@/lib/google";
import { FIRST_SYNC_RANGES, type FirstSyncRange } from "@/lib/types";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/settings?error=google_not_configured", request.url));
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  // How far back the first sync should read; the callback applies it only if no sync has run yet.
  const range = new URL(request.url).searchParams.get("range");
  if (FIRST_SYNC_RANGES.includes(range as FirstSyncRange)) {
    res.cookies.set("first_sync_range", range!, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  }
  return res;
}
