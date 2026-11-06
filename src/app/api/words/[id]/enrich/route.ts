import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateLexeme } from "@/lib/enrichment";
import { toWordDTO } from "@/lib/dto";
import { hit, tooManyRequests } from "@/lib/ratelimit";

const withLexeme = { lexeme: { include: { examples: true } } } as const;

// POST /api/words/:id/enrich — retry AI enrichment for a placeholder word.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = hit(`words:enrich:${user.id}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const { id } = await params;
  const word = await prisma.word.findFirst({
    where: { id, userId: user.id },
    include: { lexeme: true },
  });
  if (!word) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lexeme = await getOrCreateLexeme(word.lexeme.text);
  if (lexeme.source === "stub") {
    return NextResponse.json({ error: "AI is unavailable" }, { status: 503 });
  }

  const fresh = await prisma.word.findUniqueOrThrow({
    where: { id },
    include: withLexeme,
  });
  return NextResponse.json({ word: toWordDTO(fresh) });
}
