import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toWordDTO } from "@/lib/dto";

const SESSION_SIZE = 20;

// GET /api/review — the next batch of due words (most overdue first) and the
// total due count.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = { userId: user.id, dueAt: { lte: new Date() } };
  const [words, due] = await Promise.all([
    prisma.word.findMany({
      where,
      orderBy: { dueAt: "asc" },
      take: SESSION_SIZE,
      include: { lexeme: { include: { examples: true } } },
    }),
    prisma.word.count({ where }),
  ]);
  return NextResponse.json({ words: words.map(toWordDTO), due });
}
