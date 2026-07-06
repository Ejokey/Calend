import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { availabilityRules } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const rulesSchema = z.object({
  rules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(timeRegex),
        endTime: z.string().regex(timeRegex),
      }),
    )
    .refine((rules) => rules.every((r) => r.startTime < r.endTime), {
      message: "startTime must be before endTime",
    }),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.userId, user.id))
    .orderBy(availabilityRules.weekday);

  return NextResponse.json(rows);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rulesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rows = await db.transaction(async (tx) => {
    await tx
      .delete(availabilityRules)
      .where(eq(availabilityRules.userId, user.id));

    if (parsed.data.rules.length === 0) {
      return [];
    }

    return tx
      .insert(availabilityRules)
      .values(
        parsed.data.rules.map((rule) => ({
          userId: user.id,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })),
      )
      .returning();
  });

  return NextResponse.json(rows);
}
