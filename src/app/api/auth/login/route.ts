import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPasswordOrDummy, createSession } from "@/lib/auth";
import { clientIp, hit, tooManyRequests } from "@/lib/ratelimit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const WINDOW_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  // Before parsing: scrypt is deliberately expensive, so bound it per IP too.
  const byIp = hit(`login:ip:${clientIp(req)}`, 50, WINDOW_MS);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfterSec);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Keyed on the account, so rotating IPs can't extend password guessing.
  const byEmail = hit(`login:email:${email}`, 10, WINDOW_MS);
  if (!byEmail.ok) return tooManyRequests(byEmail.retryAfterSec);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same response and same work whether the user is missing or the password is
  // wrong — don't leak which emails exist, by body or by timing.
  const ok = await verifyPasswordOrDummy(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
