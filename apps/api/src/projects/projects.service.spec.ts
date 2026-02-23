import { describe, expect, it, mock, beforeEach } from "bun:test";
import { ProjectsService } from "./projects.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  project: {
    findMany: mock(() => Promise.resolve([])),
    findFirst: mock(() => Promise.resolve(null)),
    findUnique: mock((args: any) =>
      Promise.resolve({ id: args.where.id, name: "Test", organizationId: "org-1", clients: [] }),
    ),
    create: mock((args: any) =>
      Promise.resolve({ id: "new-id", ...args.data, clients: [] }),
    ),
    update: mock((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data, clients: [] }),
    ),
    updateMany: mock(() => Promise.resolve({ count: 1 })),
    delete: mock((args: any) => Promise.resolve({ id: args.where.id })),
    deleteMany: mock(() => Promise.resolve({ count: 1 })),
  },
  projectClient: {
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
  },
  projectStatus: {
    findMany: mock(() => Promise.resolve([])),
    findFirst: mock(() => Promise.resolve(null)),
  },
  $transaction: mock((args: any[]) => Promise.all(args)),
};

describe("ProjectsService", () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService(mockPrisma as any);
    // Reset mocks
    Object.values(mockPrisma.project).forEach((m) =>
      (m as any).mockClear?.(),
    );
    mockPrisma.projectClient.deleteMany.mockClear();
    mockPrisma.$transaction.mockClear();
  });

  it("findAll returns projects for organization", async () => {
    const projects = [
      { id: "1", name: "Test", organizationId: "org-1", clients: [] },
    ];
    mockPrisma.project.findMany.mockReturnValue(Promise.resolve(projects));

    const result = await service.findAll("org-1");
    expect(result).toEqual(projects);
  });

  it("findOne throws NotFoundException when not found", async () => {
    mockPrisma.project.findFirst.mockReturnValue(Promise.resolve(null));

    try {
      await service.findOne("nonexistent", "org-1");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
    }
  });

  it("create creates a project with clientUserIds", async () => {
    const dto = { name: "New Project", clientUserIds: ["user-1", "user-2"] };
    await service.create(dto, "org-1");

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "New Project",
        organizationId: "org-1",
        clients: {
          create: [{ userId: "user-1" }, { userId: "user-2" }],
        },
      },
      include: { clients: { select: { userId: true } } },
    });
  });

  it("create creates a project without clients when clientUserIds is empty", async () => {
    const dto = { name: "Solo Project" };
    await service.create(dto, "org-1");

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Solo Project",
        organizationId: "org-1",
      },
      include: { clients: { select: { userId: true } } },
    });
  });

  it("remove deletes existing project", async () => {
    mockPrisma.project.deleteMany.mockReturnValue(Promise.resolve({ count: 1 }));

    await service.remove("1", "org-1");
    expect(mockPrisma.project.deleteMany).toHaveBeenCalledWith({
      where: { id: "1", organizationId: "org-1" },
    });
  });
});
