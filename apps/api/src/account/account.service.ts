import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "better-auth/crypto";
import { DELETED_USER_SENTINEL } from "@atrium/shared";
import type { DeletionInfo } from "@atrium/shared";

@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    @InjectPinoLogger(AccountService.name) private readonly logger: PinoLogger,
  ) {}

  async getDeletionInfo(userId: string): Promise<DeletionInfo> {
    const memberships = await this.prisma.member.findMany({
      where: { userId, role: "owner" },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (memberships.length === 0) {
      return { ownedOrganizations: [] };
    }

    const orgIds = memberships.map((m) => m.organizationId);

    const [memberCounts, ownerCounts] = await Promise.all([
      this.prisma.member.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds } },
        _count: true,
      }),
      this.prisma.member.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, role: "owner" },
        _count: true,
      }),
    ]);

    const memberCountMap = new Map(memberCounts.map((g) => [g.organizationId, g._count]));
    const ownerCountMap = new Map(ownerCounts.map((g) => [g.organizationId, g._count]));

    return {
      ownedOrganizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        isSoleOwner: (ownerCountMap.get(m.organizationId) ?? 0) === 1,
        memberCount: memberCountMap.get(m.organizationId) ?? 0,
      })),
    };
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    // Verify password before proceeding
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { password: true },
    });

    if (!account?.password) {
      throw new UnauthorizedException("No password-based account found.");
    }

    const valid = await verifyPassword({
      hash: account.password,
      password,
    });

    if (!valid) {
      throw new UnauthorizedException("Incorrect password.");
    }

    const ownerMemberships = await this.prisma.member.findMany({
      where: { userId, role: "owner" },
      select: { organizationId: true },
    });

    if (ownerMemberships.length === 0) {
      throw new ForbiddenException(
        "Only organization owners can delete their account.",
      );
    }

    const orgIds = ownerMemberships.map((m) => m.organizationId);

    // Batch check: which orgs have other owners?
    const otherOwnerCounts = await this.prisma.member.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, role: "owner", userId: { not: userId } },
      _count: true,
    });
    const otherOwnerMap = new Map(otherOwnerCounts.map((g) => [g.organizationId, g._count]));

    const orgsToDelete = orgIds.filter((id) => !otherOwnerMap.has(id));
    const remainingOrgIds = orgIds.filter((id) => otherOwnerMap.has(id));

    await this.prisma.$transaction(async (tx) => {
      // Delete orgs where user is sole owner.
      // FK cascades handle: Project -> (File, ProjectUpdate, Task, ProjectNote),
      // Invoice -> InvoiceLineItem, Organization -> (Member, Invitation, SystemSettings)
      for (const orgId of orgsToDelete) {
        await Promise.all([
          tx.invoice.deleteMany({ where: { organizationId: orgId } }),
          tx.project.deleteMany({ where: { organizationId: orgId } }),
          tx.projectStatus.deleteMany({ where: { organizationId: orgId } }),
          tx.clientProfile.deleteMany({ where: { organizationId: orgId } }),
          tx.branding.deleteMany({ where: { organizationId: orgId } }),
          tx.subscription.deleteMany({ where: { organizationId: orgId } }),
        ]);
        await tx.organization.delete({ where: { id: orgId } });
      }

      // For orgs where user is NOT sole owner, anonymize their authored content
      if (remainingOrgIds.length > 0) {
        await Promise.all([
          tx.projectUpdate.updateMany({
            where: { authorId: userId, organizationId: { in: remainingOrgIds } },
            data: { authorId: DELETED_USER_SENTINEL },
          }),
          tx.projectNote.updateMany({
            where: { authorId: userId, organizationId: { in: remainingOrgIds } },
            data: { authorId: DELETED_USER_SENTINEL },
          }),
          tx.file.updateMany({
            where: { uploadedById: userId, organizationId: { in: remainingOrgIds } },
            data: { uploadedById: DELETED_USER_SENTINEL },
          }),
        ]);
      }

      // Clean up user-level data
      await Promise.all([
        tx.clientProfile.deleteMany({ where: { userId } }),
        tx.invitation.deleteMany({ where: { inviterId: userId } }),
      ]);

      // Delete the user row (cascades Session, Account, Member, ProjectClient)
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.info({ userId, orgsDeleted: orgsToDelete }, "Account deleted");
  }
}
