import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId },
      include: { clients: { select: { userId: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: { files: true, clients: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async findOneByClient(
    id: string,
    clientUserId: string,
    organizationId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        organizationId,
        clients: { some: { userId: clientUserId } },
      },
      include: { files: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async findByClient(clientUserId: string, organizationId: string) {
    return this.prisma.project.findMany({
      where: {
        organizationId,
        clients: { some: { userId: clientUserId } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateProjectDto, organizationId: string) {
    const { clientUserIds, ...rest } = data;
    return this.prisma.project.create({
      data: {
        ...rest,
        organizationId,
        ...(clientUserIds?.length
          ? {
              clients: {
                create: clientUserIds.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
      include: { clients: { select: { userId: true } } },
    });
  }

  async update(id: string, data: UpdateProjectDto, organizationId: string) {
    const { clientUserIds, ...rest } = data;

    if (rest.status) {
      const validStatus = await this.prisma.projectStatus.findFirst({
        where: { slug: rest.status, organizationId },
      });
      if (!validStatus) {
        throw new BadRequestException(`Invalid status: ${rest.status}`);
      }
    }

    if (clientUserIds !== undefined) {
      // Use a transaction to update project fields + replace client assignments
      const [, project] = await this.prisma.$transaction([
        this.prisma.projectClient.deleteMany({ where: { projectId: id } }),
        this.prisma.project.update({
          where: { id },
          data: {
            ...rest,
            clients: {
              create: clientUserIds.map((userId) => ({ userId })),
            },
          },
          include: { clients: { select: { userId: true } } },
        }),
      ]);
      return project;
    }

    const result = await this.prisma.project.updateMany({
      where: { id, organizationId },
      data: rest,
    });
    if (result.count === 0) throw new NotFoundException("Project not found");
    return this.prisma.project.findUnique({
      where: { id },
      include: { clients: { select: { userId: true } } },
    });
  }

  async remove(id: string, organizationId: string) {
    const result = await this.prisma.project.deleteMany({
      where: { id, organizationId },
    });
    if (result.count === 0) throw new NotFoundException("Project not found");
  }

  async getStatuses(organizationId: string) {
    return this.prisma.projectStatus.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
    });
  }
}
