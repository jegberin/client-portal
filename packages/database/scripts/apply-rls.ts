import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

async function main() {
  const sqlPath = resolve(__dirname, "../rls/enable-rls.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("Applying Row Level Security policies...");
  await prisma.$executeRawUnsafe(sql);
  console.log("RLS applied successfully on all tables.");
}

main()
  .catch((err) => {
    console.error("Failed to apply RLS:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
