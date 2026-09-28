import { NextResponse } from "next/server";
import { getSyncState, startSync } from "@/lib/sync";
import { connectedEmail } from "@/lib/google";
import { rejectCrossSite } from "@/lib/api";

export async function GET() {
  return NextResponse.json(getSyncState());
}

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  if (!connectedEmail()) return NextResponse.json({ error: "Connect Gmail first." }, { status: 400 });
  startSync();
  return NextResponse.json(getSyncState());
}
