import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventTypes } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  description: z.string().max(2000).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).default(0),
  bufferAfterMinutes: z.number().int().min(0).max(24 * 60).default(0),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(eventTypes)
    .where(eq(eventTypes.userId, user.id))
    .orderBy(eventTypes.createdAt);

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

  const { title, durationMinutes, description, bufferBeforeMinutes, bufferAfterMinutes } =
    parsed.data;

  const baseSlug = slugify(title) || "event";
  let slug = baseSlug;
  let suffix = 1;
  while (
    await db.query.eventTypes.findFirst({
      where: (et, { and, eq }) => and(eq(et.userId, user.id), eq(et.slug, slug)),
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const [created] = await db
    .insert(eventTypes)
    .values({
      userId: user.id,
      title,
      slug,
      durationMinutes,
      description,
      bufferBeforeMinutes,
      bufferAfterMinutes,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
