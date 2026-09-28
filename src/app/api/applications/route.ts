import { NextResponse } from "next/server";
import { createApplication, listApplications } from "@/lib/applications";
import { NewApplicationSchema } from "@/lib/schemas";
import { rejectCrossSite } from "@/lib/api";

export async function GET() {
  return NextResponse.json(listApplications());
}

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const parsed = NewApplicationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  // Manually added applications keep whatever status the user picked.
  const id = createApplication({ ...parsed.data, statusLocked: parsed.data.statusLocked ?? true });
  return NextResponse.json({ id }, { status: 201 });
}
