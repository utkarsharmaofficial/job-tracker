import { NextResponse } from "next/server";
import { deleteApplication, getApplication, updateApplication } from "@/lib/applications";
import { ApplicationPatchSchema } from "@/lib/schemas";
import { rejectCrossSite } from "@/lib/api";

async function idFrom(ctx: RouteContext<"/api/applications/[id]">) {
  const { id } = await ctx.params;
  return Number(id);
}

export async function GET(_request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const result = getApplication(await idFrom(ctx));
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const parsed = ApplicationPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const id = await idFrom(ctx);
  try {
    updateApplication(id, parsed.data);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(getApplication(id));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/applications/[id]">) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  deleteApplication(await idFrom(ctx));
  return NextResponse.json({ ok: true });
}
