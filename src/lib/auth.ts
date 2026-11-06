import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = "he_session";
const SESSION_DAYS = 30;
const N = 16384; // scrypt cost

// --- password hashing (scrypt, salted, constant-time compare) ---------------

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N }, (err, dk) =>
      err ? reject(err) : resolve(dk)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const dk = await scryptAsync(password, salt);
  return `scrypt$${N}$${salt.toString("hex")}$${dk.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  const dk = await scryptAsync(password, salt);
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}

let dummyHash: Promise<string> | undefined;

/**
 * verifyPassword that does the same scrypt work when there is no stored hash
 * (unknown email, OAuth-only user) and then fails, so login timing doesn't
 * reveal which emails are registered.
 */
export async function verifyPasswordOrDummy(
  password: string,
  stored: string | null
): Promise<boolean> {
  if (stored) return verifyPassword(password, stored);
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
  return false;
}

// --- sessions ---------------------------------------------------------------

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { userId, token, expiresAt } });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  store.delete(COOKIE);
}

export type SessionUser = { id: string; email: string; name: string | null };

/** Current user from the session cookie, or null. Clears expired sessions. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  const { id, email, name } = session.user;
  return { id, email, name };
}
