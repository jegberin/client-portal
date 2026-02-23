import { PrismaClient } from "@prisma/client";
import { DEFAULT_STATUSES } from "@atrium/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      id: "demo-org-id",
      name: "Demo Agency",
      slug: "demo-agency",
    },
  });

  // Create default project statuses
  for (const status of DEFAULT_STATUSES) {
    await prisma.projectStatus.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: status.name,
        },
      },
      update: {},
      create: {
        name: status.name,
        slug: status.slug,
        order: status.order,
        color: status.color,
        organizationId: org.id,
      },
    });
  }

  // Create demo project
  await prisma.project.upsert({
    where: { id: "demo-project-id" },
    update: {},
    create: {
      id: "demo-project-id",
      name: "Website Redesign",
      description: "Complete website redesign for Demo Agency",
      status: "in_progress",
      organizationId: org.id,
    },
  });

  // Create default branding
  await prisma.branding.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      primaryColor: "#2563eb",
      accentColor: "#f59e0b",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
