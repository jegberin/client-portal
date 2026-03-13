import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuoteDto, UpdateQuoteDto, QuoteListQueryDto, RespondQuoteDto } from "./quotes.dto";
import { paginationArgs, paginatedResponse } from "../common";

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.quote.create({
      data: {
        title: dto.title || "Untitled Quote",
        description: dto.description || dto.notes || null,
        amount: dto.amount || 0,
        status: "pending",
        projectId: dto.projectId,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string, query: QuoteListQueryDto) {
    const where: { organizationId: string; projectId?: string; status?: string } = { organizationId: orgId };
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.quote.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!quote) throw new NotFoundException("Quote not found");
    return quote;
  }

  async findOneMine(id: string, userId: string, orgId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!quote) throw new NotFoundException("Quote not found");

    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId: quote.projectId, userId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this project");

    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto, orgId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!quote) throw new NotFoundException("Quote not found");

    return this.prisma.quote.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...((dto.description !== undefined || dto.notes !== undefined) && { description: dto.description || dto.notes }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async setPdf(id: string, orgId: string, pdfFileKey: string | null, pdfFileName: string | null) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!quote) throw new NotFoundException("Quote not found");

    return this.prisma.quote.update({
      where: { id },
      data: { pdfFileKey, pdfFileName },
    });
  }

  async remove(id: string, orgId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!quote) throw new NotFoundException("Quote not found");
    await this.prisma.quote.delete({ where: { id } });
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
      this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.quote.count({ where }),
    ]);

    return paginatedResponse(data, total, page, limit);
  }

  async respond(id: string, userId: string, orgId: string, dto: RespondQuoteDto) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId: orgId, status: "pending" },
    });
    if (!quote) throw new NotFoundException("Quote not found or not in pending status");

    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId: quote.projectId, userId },
    });
    if (!assignment) throw new ForbiddenException("You are not assigned to this project");

    const decision = dto.resolvedResponse;
    if (!decision) throw new BadRequestException("Please provide a response (accepted or declined)");
    return this.prisma.quote.update({
      where: { id },
      data: {
        status: decision,
        respondedById: userId,
        respondedAt: new Date(),
        responseNote: dto.note || null,
      },
    });
  }
}
