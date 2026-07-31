import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { enrichWord } from "@/lib/ai";

const CreateBody = z.object({ text: z.string().trim().min(1).max(200) });

// GET /api/words — the personal dictionary, newest first.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const words = await prisma.word.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { examples: true },
  });
  return NextResponse.json({ words });
}

// POST /api/words — add a word, enrich it, persist it.
export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const text = parsed.data.text;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const existing = await prisma.word.findUnique({
    where: { userId_text: { userId, text } },
  });
  if (existing) {
    return NextResponse.json({ error: "already in your dictionary" }, { status: 409 });
  }

  const e = await enrichWord(text);

  const word = await prisma.word.create({
    data: {
      userId,
      text,
      translation: e.translation || null,
      ipa: e.ipa || null,
      uaHint: e.uaHint || null,
      partOfSpeech: e.partOfSpeech || null,
      cefr: e.cefr || null,
      explanation: e.explanation || null,
      synonyms: JSON.stringify(e.synonyms),
      antonyms: JSON.stringify(e.antonyms),
      collocations: JSON.stringify(e.collocations),
      notes: e.notes || null,
      examples: {
        create: e.examples.map((x) => ({
          en: x.en,
          translation: x.translation || null,
        })),
      },
    },
    include: { examples: true },
  });

  return NextResponse.json({ word }, { status: 201 });
}
