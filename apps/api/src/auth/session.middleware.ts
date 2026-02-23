import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
      }

      const session = await this.authService.auth.api.getSession({
        headers,
      });

      if (session) {
        (req as any).user = session.user;
        (req as any).session = session.session;
      }

      const activeOrgId = (session?.session as any)?.activeOrganizationId;
      if (activeOrgId) {
        const getFullOrg = (this.authService.auth.api as any)
          .getFullOrganization;
        if (getFullOrg) {
          const orgData = await getFullOrg({ headers });

          if (orgData) {
            (req as any).organization = orgData;
            const member = orgData.members?.find(
              (m: any) => m.userId === session!.user.id,
            );
            if (member) {
              (req as any).member = member;
            }
          }
        }
      }
    } catch {
      // Session resolution failed — continue without auth.
      // The AuthGuard will reject unauthenticated requests.
    }

    next();
  }
}
