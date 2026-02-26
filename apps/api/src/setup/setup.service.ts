import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SetupService {
  constructor(private prisma: PrismaService) {}

  async getSetupStatus(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { setupCompleted: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    return { completed: org.setupCompleted };
  }

  async markSetupComplete(organizationId: string) {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { setupCompleted: true },
    });
    return { completed: true };
  }
}
