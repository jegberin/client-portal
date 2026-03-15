import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { render } from "@react-email/render";
import {
  ProjectUpdateEmail,
  TaskAssignedEmail,
  InvoiceSentEmail,
  QuoteRespondedEmail,
  DecisionRespondedEmail,
  DecisionCreatedEmail,
} from "@atrium/email";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  private webUrl: string;

  constructor(
    private mail: MailService,
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
  ) {
    this.webUrl = this.config.get("WEB_URL", "http://localhost:3000");
  }

  notifyProjectUpdate(projectId: string, updateContent: string): void {
    this.sendProjectUpdateEmails(projectId, updateContent).catch((err) => {
      this.logger.error(
        { err, projectId },
        "Failed to send project update notifications",
      );
    });
  }

  notifyTaskCreated(
    projectId: string,
    taskTitle: string,
    dueDate?: Date,
  ): void {
    this.sendTaskCreatedEmails(projectId, taskTitle, dueDate).catch((err) => {
      this.logger.error(
        { err, projectId },
        "Failed to send task created notifications",
      );
    });
  }

  notifyInvoiceSent(invoiceId: string): void {
    this.sendInvoiceSentEmails(invoiceId).catch((err) => {
      this.logger.error(
        { err, invoiceId },
        "Failed to send invoice sent notifications",
      );
    });
  }

  notifyQuoteResponded(
    quoteId: string,
    respondedByUserId: string,
    decision: "accepted" | "declined",
    note?: string,
  ): void {
    this.sendQuoteRespondedEmails(quoteId, respondedByUserId, decision, note).catch(
      (err) => {
        this.logger.error(
          { err, quoteId },
          "Failed to send quote responded notifications",
        );
      },
    );
  }

  notifyDecisionResponded(
    decisionId: string,
    respondedByUserId: string,
    responsePreview?: string,
  ): void {
    this.sendDecisionRespondedEmails(decisionId, respondedByUserId, responsePreview).catch(
      (err) => {
        this.logger.error(
          { err, decisionId },
          "Failed to send decision responded notifications",
        );
      },
    );
  }

  notifyDecisionCreated(decisionId: string, projectId: string): void {
    this.sendDecisionCreatedEmails(decisionId, projectId).catch((err) => {
      this.logger.error(
        { err, decisionId },
        "Failed to send decision created notifications",
      );
    });
  }

  private async sendProjectUpdateEmails(
    projectId: string,
    updateContent: string,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, organizationId: true },
    });
    if (!project) return;

    const clients = await this.getProjectClients(projectId);
    if (clients.length === 0) return;

    const portalUrl = `${this.webUrl}/portal/projects/${projectId}`;

    await Promise.allSettled(
      clients.map(async (client) => {
        try {
          const html = await render(
            ProjectUpdateEmail({
              clientName: client.name,
              projectName: project.name,
              updateContent,
              portalUrl,
            }),
          );
          await this.mail.send(
            client.email,
            `New update on ${project.name}`,
            html,
            project.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: client.email, projectId },
            "Failed to send project update email to client",
          );
        }
      }),
    );
  }

  private async sendTaskCreatedEmails(
    projectId: string,
    taskTitle: string,
    dueDate?: Date,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, organizationId: true },
    });
    if (!project) return;

    const clients = await this.getProjectClients(projectId);
    if (clients.length === 0) return;

    const portalUrl = `${this.webUrl}/portal/projects/${projectId}`;
    const formattedDueDate = dueDate
      ? dueDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    await Promise.allSettled(
      clients.map(async (client) => {
        try {
          const html = await render(
            TaskAssignedEmail({
              clientName: client.name,
              projectName: project.name,
              taskTitle,
              dueDate: formattedDueDate,
              portalUrl,
            }),
          );
          await this.mail.send(
            client.email,
            `New task on ${project.name}: ${taskTitle}`,
            html,
            project.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: client.email, projectId },
            "Failed to send task created email to client",
          );
        }
      }),
    );
  }

  private async sendInvoiceSentEmails(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    });
    if (!invoice || !invoice.projectId) return;

    const clients = await this.getProjectClients(invoice.projectId);
    if (clients.length === 0) return;

    const totalCents = invoice.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0,
    );
    const amount = `$${(totalCents / 100).toFixed(2)}`;
    const dueDate = invoice.dueDate
      ? invoice.dueDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "upon receipt";
    const portalUrl = `${this.webUrl}/portal/invoices`;

    await Promise.allSettled(
      clients.map(async (client) => {
        try {
          const html = await render(
            InvoiceSentEmail({
              clientName: client.name,
              invoiceNumber: invoice.invoiceNumber,
              amount,
              dueDate,
              portalUrl,
            }),
          );
          await this.mail.send(
            client.email,
            `Invoice ${invoice.invoiceNumber} — ${amount}`,
            html,
            invoice.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: client.email, invoiceId },
            "Failed to send invoice email to client",
          );
        }
      }),
    );
  }

  private async sendQuoteRespondedEmails(
    quoteId: string,
    respondedByUserId: string,
    decision: "accepted" | "declined",
    note?: string,
  ): Promise<void> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        title: true,
        organizationId: true,
        projectId: true,
      },
    });
    if (!quote) return;

    const project = await this.prisma.project.findUnique({
      where: { id: quote.projectId },
      select: { name: true },
    });

    const respondedBy = await this.prisma.user.findUnique({
      where: { id: respondedByUserId },
      select: { name: true },
    });

    const admins = await this.getOrgAdmins(quote.organizationId);
    if (admins.length === 0) return;

    const dashboardUrl = `${this.webUrl}/dashboard/projects/${quote.projectId}`;

    await Promise.allSettled(
      admins.map(async (admin) => {
        try {
          const html = await render(
            QuoteRespondedEmail({
              adminName: admin.name,
              clientName: respondedBy?.name || "A client",
              quoteTitle: quote.title || "Untitled Quote",
              projectName: project?.name || "Unknown Project",
              decision,
              note: note || undefined,
              dashboardUrl,
            }),
          );
          await this.mail.send(
            admin.email,
            `Quote ${decision}: ${quote.title || "Untitled Quote"}`,
            html,
            quote.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: admin.email, quoteId },
            "Failed to send quote responded email to admin",
          );
        }
      }),
    );
  }

  private async sendDecisionRespondedEmails(
    decisionId: string,
    respondedByUserId: string,
    responsePreview?: string,
  ): Promise<void> {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      select: {
        title: true,
        organizationId: true,
        projectId: true,
      },
    });
    if (!decision) return;

    const project = await this.prisma.project.findUnique({
      where: { id: decision.projectId },
      select: { name: true },
    });

    const respondedBy = await this.prisma.user.findUnique({
      where: { id: respondedByUserId },
      select: { name: true },
    });

    const admins = await this.getOrgAdmins(decision.organizationId);
    if (admins.length === 0) return;

    const dashboardUrl = `${this.webUrl}/dashboard/projects/${decision.projectId}`;

    await Promise.allSettled(
      admins.map(async (admin) => {
        try {
          const html = await render(
            DecisionRespondedEmail({
              adminName: admin.name,
              clientName: respondedBy?.name || "A client",
              decisionTitle: decision.title,
              projectName: project?.name || "Unknown Project",
              responsePreview: responsePreview || undefined,
              dashboardUrl,
            }),
          );
          await this.mail.send(
            admin.email,
            `Decision response: ${decision.title}`,
            html,
            decision.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: admin.email, decisionId },
            "Failed to send decision responded email to admin",
          );
        }
      }),
    );
  }

  private async sendDecisionCreatedEmails(
    decisionId: string,
    projectId: string,
  ): Promise<void> {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      select: {
        title: true,
        description: true,
        organizationId: true,
      },
    });
    if (!decision) return;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const clients = await this.getProjectClients(projectId);
    if (clients.length === 0) return;

    const portalUrl = `${this.webUrl}/portal/projects/${projectId}`;

    await Promise.allSettled(
      clients.map(async (client) => {
        try {
          const html = await render(
            DecisionCreatedEmail({
              clientName: client.name,
              decisionTitle: decision.title,
              projectName: project?.name || "Unknown Project",
              description: decision.description || undefined,
              portalUrl,
            }),
          );
          await this.mail.send(
            client.email,
            `Decision needed on ${project?.name || "your project"}: ${decision.title}`,
            html,
            decision.organizationId,
          );
        } catch (err) {
          this.logger.warn(
            { err, email: client.email, decisionId },
            "Failed to send decision created email to client",
          );
        }
      }),
    );
  }

  private async getProjectClients(
    projectId: string,
  ): Promise<Array<{ name: string; email: string }>> {
    const assignments = await this.prisma.projectClient.findMany({
      where: { projectId },
      select: {
        user: { select: { name: true, email: true } },
      },
    });
    return assignments.map(
      (a: { user: { name: string; email: string } }) => a.user,
    );
  }

  private async getOrgAdmins(
    organizationId: string,
  ): Promise<Array<{ name: string; email: string }>> {
    const members = await this.prisma.member.findMany({
      where: {
        organizationId,
        role: { in: ["owner", "admin"] },
      },
      select: {
        user: { select: { name: true, email: true } },
      },
    });
    return members.map(
      (m: { user: { name: string; email: string } }) => m.user,
    );
  }
}
