import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { paginationArgs, paginatedResponse } from "../common";
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceListQueryDto } from "./invoices.dto";

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateInvoiceDto, orgId: string) {
    return this.prisma.$transaction(async (tx) => {
      const lastInvoice = await tx.invoice.findFirst({
        where: { organizationId: orgId },
        orderBy: { invoiceNumber: "desc" },
        select: { invoiceNumber: true },
      });

      let nextNumber = 1;
      if (lastInvoice) {
        const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const invoiceNumber = `INV-${String(nextNumber).padStart(3, "0")}`;

      return tx.invoice.create({
        data: {
          invoiceNumber,
          status: "draft",
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
          projectId: dto.projectId,
          organizationId: orgId,
          lineItems: {
            create: dto.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { lineItems: true },
      });
    });
  }

  async findAll(orgId: string, query: InvoiceListQueryDto) {
    const { page = 1, limit = 20, projectId, status } = query;
    const where: any = { organizationId: orgId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          lineItems: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        lineItems: true,
        project: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async findMine(userId: string, orgId: string, page = 1, limit = 20) {
    const clientProjects = await this.prisma.projectClient.findMany({
      where: {
        userId,
        project: { organizationId: orgId },
      },
      select: { projectId: true },
    });
    const projectIds = clientProjects.map((pc) => pc.projectId);

    const where = {
      organizationId: orgId,
      projectId: { in: projectIds },
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { lineItems: true },
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOneMine(id: string, userId: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        lineItems: true,
        project: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    if (invoice.projectId) {
      const assignment = await this.prisma.projectClient.findFirst({
        where: { projectId: invoice.projectId, userId },
      });
      if (!assignment) {
        throw new ForbiddenException("Not assigned to this project");
      }
    } else {
      throw new ForbiddenException("Not assigned to this project");
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    const isTransitionToSent =
      dto.status === "sent" && invoice.status !== "sent";

    const dueDateValue =
      dto.dueDate === null
        ? null
        : dto.dueDate
          ? new Date(dto.dueDate)
          : undefined;

    let updated;

    if (dto.lineItems) {
      updated = await this.prisma.$transaction(async (tx) => {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        return tx.invoice.update({
          where: { id },
          data: {
            status: dto.status,
            dueDate: dueDateValue,
            notes: dto.notes,
            lineItems: {
              create: dto.lineItems!.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          },
          include: { lineItems: true },
        });
      });
    } else {
      updated = await this.prisma.invoice.update({
        where: { id },
        data: {
          status: dto.status,
          dueDate: dueDateValue,
          notes: dto.notes,
        },
        include: { lineItems: true },
      });
    }

    if (isTransitionToSent) {
      this.notifications.notifyInvoiceSent(id);
    }

    return updated;
  }

  async remove(id: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    await this.prisma.invoice.delete({ where: { id } });
  }

  async getStats(orgId: string) {
    const totalInvoices = await this.prisma.invoice.count({
      where: { organizationId: orgId },
    });

    const allStats = await this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: {
        status: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    });

    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;

    for (const inv of allStats) {
      const invoiceTotal = inv.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      totalAmount += invoiceTotal;
      if (inv.status === "paid") {
        paidAmount += invoiceTotal;
      } else {
        outstandingAmount += invoiceTotal;
      }
    }

    return { totalInvoices, totalAmount, paidAmount, outstandingAmount };
  }
}
