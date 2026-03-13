import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
      include: { options: true, responses: { include: { user: { select: { id: true, name: true, email: true } } } } },
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
        include: {
          options: true,
          responses: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        ...paginationArgs(page, limit),
      }),
      this.prisma.decision.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const decision = await this.prisma.decision.findFirst({
      where: { id, organizationId: orgId },
      include: {
        options: true,
        responses: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
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
      include: { options: true, responses: { include: { user: { select: { id: true, name: true, email: true } } } } },
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
    };

    const [data, total] = await Promise.all([
      this.prisma.decision.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          options: true,
          responses: {
            where: { userId },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
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

    try {
      if (decision.type === "multiple_choice") {
        if (!dto.selectedOptionId) throw new BadRequestException("Please select an option");
        const option = decision.options.find((o) => o.id === dto.selectedOptionId);
        if (!option) throw new BadRequestException("Invalid option");

        await this.prisma.decisionResponse.create({
          data: {
            decisionId: id,
            userId,
            choice: option.label,
          },
        });
      } else if (decision.type === "open") {
        if (!dto.openResponse || !dto.openResponse.trim()) {
          throw new BadRequestException("Please provide a response");
        }

        await this.prisma.decisionResponse.create({
          data: {
            decisionId: id,
            userId,
            answer: dto.openResponse,
          },
        });
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("You have already responded to this decision");
      }
      throw err;
    }

    return this.prisma.decision.findFirst({
      where: { id },
      include: {
        options: true,
        responses: {
          where: { userId },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }
}
