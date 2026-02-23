import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { clientUserId: { not: null } },
    select: { id: true, clientUserId: true },
  });

  console.log(`Found ${projects.length} projects with clientUserId`);

  let migrated = 0;
  for (const project of projects) {
    if (!project.clientUserId) continue;
    try {
      await prisma.projectClient.create({
        data: {
          projectId: project.id,
          userId: project.clientUserId,
        },
      });
      migrated++;
    } catch (e: any) {
      // Skip if already exists (unique constraint)
      if (e.code === "P2002") {
        console.log(`Skipped ${project.id} (already migrated)`);
      } else {
        throw e;
      }
    }
  }

  console.log(`Migrated ${migrated} project-client assignments`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
