import { NextResponse, type NextRequest } from "next/server";
import { handleCallback } from "@/lib/google";
import { setSyncStart, startSync } from "@/lib/sync";
import { FIRST_SYNC_RANGES, type FirstSyncRange } from "@/lib/types";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = request.cookies.get("oauth_state")?.value;
  const settings = new URL("/settings", request.url);

  if (url.searchParams.get("error")) {
    settings.searchParams.set("error", url.searchParams.get("error")!);
  } else if (!code || !state || state !== expected) {
    settings.searchParams.set("error", "invalid_oauth_state");
  } else {
    try {
      await handleCallback(code);
      const range = request.cookies.get("first_sync_range")?.value as FirstSyncRange | undefined;
      if (range && FIRST_SYNC_RANGES.includes(range)) setSyncStart(range);
      startSync();
      settings.searchParams.set("connected", "1");
    } catch (err) {
      console.error("[oauth]", err);
      settings.searchParams.set("error", "token_exchange_failed");
    }
  }
  const res = NextResponse.redirect(settings);
  res.cookies.delete("oauth_state");
  res.cookies.delete("first_sync_range");
  return res;
}
