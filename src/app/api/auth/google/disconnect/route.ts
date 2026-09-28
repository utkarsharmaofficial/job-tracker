import { NextResponse } from "next/server";
import { disconnect } from "@/lib/google";
import { rejectCrossSite } from "@/lib/api";

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  disconnect();
  return NextResponse.json({ ok: true });
}
