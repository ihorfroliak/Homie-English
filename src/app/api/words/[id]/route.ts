import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// DELETE /api/words/:id — remove a word from the user's own dictionary. The
// shared Lexeme stays: other users and future adds reuse it.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { count } = await prisma.word.deleteMany({
    where: { id, userId: user.id },
  });
  if (!count) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
