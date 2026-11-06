import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { clientIp, hit, tooManyRequests } from "@/lib/ratelimit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const limit = hit(`register:ip:${clientIp(req)}`, 10, 60 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid email and password (8+ chars) required" },
      { status: 400 }
    );
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, name: name ?? null, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  );
}
