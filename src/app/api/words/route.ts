import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateLexeme } from "@/lib/enrichment";
import { toWordDTO } from "@/lib/dto";
import { hit, tooManyRequests } from "@/lib/ratelimit";

const CreateBody = z.object({ text: z.string().trim().min(1).max(200) });

const withLexeme = { lexeme: { include: { examples: true } } } as const;

const duplicate = () =>
  NextResponse.json(
    { error: "Already in your dictionary", duplicate: true },
    { status: 409 }
  );

// GET /api/words — the personal dictionary, newest first.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const words = await prisma.word.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: withLexeme,
  });
  return NextResponse.json({ words: words.map(toWordDTO) });
}

// POST /api/words — add a word: reuse or generate its global enrichment, then
// attach it to the user's dictionary. Duplicate AI calls are avoided by the
// Lexeme cache; user progress stays per-user.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each add can cost an AI call; one account must not drain the global budget.
  const limit = hit(`words:add:${user.id}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const lexeme = await getOrCreateLexeme(parsed.data.text);

  const existing = await prisma.word.findUnique({
    where: { userId_lexemeId: { userId: user.id, lexemeId: lexeme.id } },
  });
  if (existing) return duplicate();

  try {
    const word = await prisma.word.create({
      data: { userId: user.id, lexemeId: lexeme.id },
      include: withLexeme,
    });
    return NextResponse.json({ word: toWordDTO(word) }, { status: 201 });
  } catch (err) {
    // Double submit: the unique (userId, lexemeId) lost the race.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return duplicate();
    }
    throw err;
  }
}
