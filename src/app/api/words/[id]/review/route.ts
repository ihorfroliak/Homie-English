import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { nextSchedule } from "@/lib/srs";
import { toWordDTO } from "@/lib/dto";

const Body = z.object({ grade: z.enum(["again", "good"]) });

const notDue = () =>
  NextResponse.json({ error: "not due yet" }, { status: 409 });

// POST /api/words/:id/review — record an SRS review, reschedule the word. Only
// due words can be reviewed, otherwise repeated "good" would master a word in
// seconds.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "grade must be again|good" }, { status: 400 });
  }
  const { grade } = parsed.data;

  const word = await prisma.word.findFirst({ where: { id, userId: user.id } });
  if (!word) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date();
  if (word.dueAt > now) return notDue();

  const s = nextSchedule(word.reps, grade);
  const updated = await prisma.$transaction(async (tx) => {
    // Guarded on dueAt so a double submit advances the word only once.
    const { count } = await tx.word.updateMany({
      where: { id, userId: user.id, dueAt: { lte: now } },
      data: {
        reps: s.reps,
        intervalDays: s.intervalDays,
        dueAt: s.dueAt,
        status: s.status,
      },
    });
    if (!count) return null;

    await tx.reviewLog.create({ data: { userId: user.id, wordId: id, grade } });
    return tx.word.findUnique({
      where: { id },
      include: { lexeme: { include: { examples: true } } },
    });
  });
  if (!updated) return notDue();

  return NextResponse.json({ word: toWordDTO(updated) });
}
