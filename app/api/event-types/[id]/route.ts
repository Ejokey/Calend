import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventTypes } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  durationMinutes: z.number().int().min(5).max(24 * 60).optional(),
  description: z.string().max(2000).nullable().optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(24 * 60).optional(),
  isActive: z.boolean().optional(),
});

async function loadOwned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.id, id), eq(eventTypes.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await loadOwned(user.id, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await loadOwned(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(eventTypes)
    .set(parsed.data)
    .where(eq(eventTypes.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await loadOwned(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(eventTypes).where(eq(eventTypes.id, id));

  return NextResponse.json({ ok: true });
}
