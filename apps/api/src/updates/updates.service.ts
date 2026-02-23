import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { StorageProvider } from "../files/storage/storage.interface";
import { STORAGE_PROVIDER } from "../files/storage/storage.interface";
import type { UploadedFile } from "../files/files.service";
import { randomUUID } from "crypto";
import type { Response } from "express";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "");
  return base.replace(/[^\w.\- ]/g, "_").replace(/\.{2,}/g, ".") || "file";
}

@Injectable()
export class UpdatesService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async create(
    dto: { content: string },
    projectId: string,
    organizationId: string,
    authorId: string,
    image?: UploadedFile,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException("Project not found");

    let imageKey: string | undefined;
    let imageMimeType: string | undefined;

    if (image) {
      if (!ALLOWED_IMAGE_TYPES.has(image.mimetype)) {
        throw new BadRequestException(
          "Image must be JPEG, PNG, GIF, or WebP",
        );
      }
      if (image.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException("Image must be under 10MB");
      }

      const safeName = sanitizeFilename(image.originalname);
      imageKey = `${organizationId}/${projectId}/updates/${randomUUID()}-${safeName}`;
      imageMimeType = image.mimetype;

      await this.storage.upload(imageKey, image.buffer, image.mimetype);
    }

    return this.prisma.projectUpdate.create({
      data: {
        content: dto.content,
        imageKey,
        imageMimeType,
        projectId,
        organizationId,
        authorId,
      },
    });
  }

  async findByProject(projectId: string, organizationId: string) {
    const updates = await this.prisma.projectUpdate.findMany({
      where: { projectId, organizationId },
      orderBy: { createdAt: "desc" },
    });

    // Batch-resolve author names
    const authorIds = [...new Set(updates.map((u) => u.authorId))];
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    // Generate signed URLs for images
    const enriched = await Promise.all(
      updates.map(async (u) => {
        let imageUrl: string | undefined;
        if (u.imageKey) {
          imageUrl = await this.storage.getSignedUrl(u.imageKey);
        }
        const author = authorMap.get(u.authorId);
        return {
          id: u.id,
          content: u.content,
          imageUrl,
          hasImage: !!u.imageKey,
          projectId: u.projectId,
          author: author ?? { id: u.authorId, name: "Unknown" },
          createdAt: u.createdAt,
        };
      }),
    );

    return enriched;
  }

  async findByProjectForClient(
    projectId: string,
    clientUserId: string,
    organizationId: string,
  ) {
    const assignment = await this.prisma.projectClient.findFirst({
      where: { projectId, userId: clientUserId },
    });
    if (!assignment) {
      throw new ForbiddenException("Not assigned to this project");
    }

    return this.findByProject(projectId, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id, organizationId },
    });
    if (!update) throw new NotFoundException("Update not found");

    if (update.imageKey) {
      await this.storage.delete(update.imageKey);
    }

    await this.prisma.projectUpdate.delete({ where: { id } });
  }

  async getImage(id: string, organizationId: string, res: Response) {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id, organizationId },
    });
    if (!update || !update.imageKey) {
      throw new NotFoundException("Image not found");
    }

    const { body, contentType } = await this.storage.download(update.imageKey);
    res.setHeader("Content-Type", contentType);
    body.pipe(res);
  }
}
