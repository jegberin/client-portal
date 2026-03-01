import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { StorageProvider } from "../files/storage/storage.interface";
import { STORAGE_PROVIDER } from "../files/storage/storage.interface";
import type { UploadedFile } from "../files/files.service";
import { randomUUID } from "crypto";
import type { Response } from "express";
import { paginationArgs, paginatedResponse, sanitizeFilename } from "../common";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

@Injectable()
export class UpdatesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async create(
    dto: { content: string },
    projectId: string,
    organizationId: string,
    authorId: string,
    attachment?: UploadedFile,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    let attachmentKey: string | undefined;
    let attachmentMimeType: string | undefined;
    let attachmentName: string | undefined;

    if (attachment) {
      if (attachment.size > MAX_ATTACHMENT_SIZE) {
        throw new BadRequestException("Attachment must be under 10MB");
      }

      const safeName = sanitizeFilename(attachment.originalname);
      attachmentKey = `${organizationId}/${projectId}/updates/${randomUUID()}-${safeName}`;
      attachmentMimeType = attachment.mimetype;
      attachmentName = attachment.originalname;

      await this.storage.upload(attachmentKey, attachment.buffer, attachment.mimetype);
    }

    const update = await this.prisma.projectUpdate.create({
      data: {
        content: dto.content,
        attachmentKey,
        attachmentMimeType,
        attachmentName,
        projectId,
        organizationId,
        authorId,
      },
    });

    this.notifications.notifyProjectUpdate(projectId, dto.content);

    return update;
  }

  async findByProject(
    projectId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const where = { projectId, organizationId };
    const [updates, total] = await Promise.all([
      this.prisma.projectUpdate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.projectUpdate.count({ where }),
    ]);

    // Batch-resolve author names
    const authorIds = [...new Set(updates.map((u) => u.authorId))];
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    // Generate signed URLs for attachments
    const enriched = await Promise.all(
      updates.map(async (u) => {
        let attachmentUrl: string | undefined;
        if (u.attachmentKey) {
          attachmentUrl = await this.storage.getSignedUrl(u.attachmentKey);
        }
        const author = authorMap.get(u.authorId);
        return {
          id: u.id,
          content: u.content,
          attachmentUrl,
          attachmentName: u.attachmentName,
          attachmentMimeType: u.attachmentMimeType,
          hasAttachment: !!u.attachmentKey,
          projectId: u.projectId,
          author: author ?? { id: u.authorId, name: "Unknown" },
          createdAt: u.createdAt,
        };
      }),
    );

    return paginatedResponse(enriched, total, page, limit);
  }

  async findByProjectForClient(
    projectId: string,
    clientUserId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId, userId: clientUserId },
    });
    if (!assignment) {
      throw new ForbiddenException("Not assigned to this project");
    }

    return this.findByProject(projectId, organizationId, page, limit);
  }

  async remove(id: string, organizationId: string) {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id, organizationId },
    });
    if (!update) throw new NotFoundException("Update not found");

    if (update.attachmentKey) {
      await this.storage.delete(update.attachmentKey);
    }

    await this.prisma.projectUpdate.delete({ where: { id } });
  }

  async getAttachment(id: string, organizationId: string, res: Response) {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id, organizationId },
    });
    if (!update || !update.attachmentKey) {
      throw new NotFoundException("Attachment not found");
    }

    const { body, contentType } = await this.storage.download(update.attachmentKey);
    res.setHeader("Content-Type", contentType);
    if (update.attachmentName) {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${update.attachmentName}"`,
      );
    }
    body.pipe(res);
  }

  static isImageType(mimeType: string | null | undefined): boolean {
    return !!mimeType && IMAGE_TYPES.has(mimeType);
  }
}
