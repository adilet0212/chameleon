import { PrismaClient } from "@prisma/client";

/*
  Single client per process. Next's dev server re-evaluates modules on every edit,
  so without stashing the instance on globalThis you leak a connection pool per
  hot reload and eventually exhaust Postgres' connection limit.
*/
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
