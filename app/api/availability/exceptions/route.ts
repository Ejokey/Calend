import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { availabilityExceptions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z
  .object({
    date: z.string().regex(dateRegex),
    isBlocked: z.boolean().default(true),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
  })
  .refine(
    (data) => data.isBlocked || (data.startTime && data.endTime),
    "startTime and endTime are required when isBlocked is false",
  )
  .refine(
    (data) => !(data.startTime && data.endTime) || data.startTime < data.endTime,
    "startTime must be before endTime",
  );

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(availabilityExceptions)
    .where(eq(availabilityExceptions.userId, user.id))
    .orderBy(availabilityExceptions.date);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(availabilityExceptions)
    .values({
      userId: user.id,
      date: parsed.data.date,
      isBlocked: parsed.data.isBlocked,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
