import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { availabilityExceptions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({ id: availabilityExceptions.id })
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.id, id),
        eq(availabilityExceptions.userId, user.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(availabilityExceptions)
    .where(eq(availabilityExceptions.id, id));

  return NextResponse.json({ ok: true });
}
