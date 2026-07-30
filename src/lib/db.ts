import { PrismaClient } from "@prisma/client";

// Reuse a single client across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const LOCAL_USER = { id: "local", email: "local@homie.english" };

/** Single local user until auth lands. Idempotent. */
export async function getLocalUserId(): Promise<string> {
  await prisma.user.upsert({
    where: { id: LOCAL_USER.id },
    update: {},
    create: LOCAL_USER,
  });
  return LOCAL_USER.id;
}
