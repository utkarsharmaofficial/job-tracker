import "server-only";
import { NextResponse } from "next/server";

/**
 * Only accept state-changing requests from this app's own pages, so another website
 * open in the browser can't poke the local API.
 */
export function rejectCrossSite(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }
  const type = request.headers.get("content-type") ?? "";
  if (request.method !== "GET" && request.method !== "DELETE" && !type.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }
  return null;
}
