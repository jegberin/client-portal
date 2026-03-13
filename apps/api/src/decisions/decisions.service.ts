import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDecisionDto, UpdateDecisionDto, DecisionListQueryDto, RespondDecisionDto } from "./decisions.dto";
import { paginationArgs, paginatedResponse } from "../common";

@Injectable()
export class DecisionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDecisionDto, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException("Project not found");

    if (dto.type === "multiple_choice" && (!dto.options || dto.options.length < 2)) {
      throw new BadRequestException("Multiple choice decisions require at least 2 options");
    }

    return this.prisma.decision.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        projectId: dto.projectId,
        organizationId: orgId,
        options: dto.type === "multiple_choice" && dto.options
          ? { create: dto.options.map((o) => ({ label: o.label })) }
          : undefined,
      },
      include: { options: true },
    });
  }

  async findAll(orgId: string, query: DecisionListQueryDto) {
    const where: any = { organizationId: orgId };
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.decision.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { options: true },
        ...paginationArgs(page, limit),
      }),
      this.prisma.decision.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id, organizationId: orgId },
      include: { options: true },
    });
    if (!decision) throw new NotFoundException("Decision not found");
    return decision;
  }

  async update(id: string, dto: UpdateDecisionDto, orgId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!decision) throw new NotFoundException("Decision not found");

    return this.prisma.decision.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { options: true },
    });
  }

  async remove(id: string, orgId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!decision) throw new NotFoundException("Decision not found");
    await this.prisma.decision.delete({ where: { id } });
  }

  async findMine(userId: string, orgId: string, projectId: string, page = 1, limit = 20) {
    const assignments = await this.prisma.projectClient.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = assignments.map((a) => a.projectId);

    if (!projectIds.includes(projectId)) {
      return paginatedResponse([], 0, page, limit);
    }

    const where = {
      projectId,
      organizationId: orgId,
      status: "open",
    };

    const [data, total] = await Promise.all([
      this.prisma.decision.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { options: true },
        ...paginationArgs(page, limit),
      }),
      this.prisma.decision.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  }

  async respond(id: string, userId: string, orgId: string, dto: RespondDecisionDto) {
    const decision = await this.prisma.decision.findFirst({
      where: { id, organizationId: orgId, status: "open" },
      include: { options: true },
    });
    if (!decision) throw new NotFoundException("Decision not found or already closed");

    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId: decision.projectId, userId },
    });
    if (!assignment) throw new ForbiddenException("You are not assigned to this project");

    if (decision.type === "multiple_choice") {
      if (!dto.selectedOptionId) throw new BadRequestException("Please select an option");
      const option = decision.options.find((o) => o.id === dto.selectedOptionId);
      if (!option) throw new BadRequestException("Invalid option");

      await this.prisma.decisionOption.updateMany({
        where: { decisionId: id },
        data: { selected: false },
      });
      await this.prisma.decisionOption.update({
        where: { id: dto.selectedOptionId },
        data: { selected: true },
      });
    } else if (decision.type === "open") {
      if (!dto.openResponse || !dto.openResponse.trim()) {
        throw new BadRequestException("Please provide a response");
      }
    }

    return this.prisma.decision.update({
      where: { id },
      data: {
        status: "closed",
        respondedById: userId,
        respondedAt: new Date(),
        openResponse: decision.type === "open" ? (dto.openResponse || null) : undefined,
      },
      include: { options: true },
    });
  }
}
