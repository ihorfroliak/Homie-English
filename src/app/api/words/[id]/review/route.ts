import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { nextSchedule } from "@/lib/srs";

const Body = z.object({ grade: z.enum(["again", "good"]) });

// POST /api/words/:id/review — record an SRS review, reschedule the word.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "grade must be again|good" }, { status: 400 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const word = await prisma.word.findFirst({ where: { id, userId } });
  if (!word) return NextResponse.json({ error: "not found" }, { status: 404 });

  const s = nextSchedule(word.reps, parsed.data.grade);
  const updated = await prisma.word.update({
    where: { id },
    data: {
      reps: s.reps,
      intervalDays: s.intervalDays,
      dueAt: s.dueAt,
      status: s.status,
    },
    include: { examples: true },
  });

  return NextResponse.json({ word: updated });
}
