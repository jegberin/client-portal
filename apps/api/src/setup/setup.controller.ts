import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from "@nestjs/common";
import { SetupService } from "./setup.service";
import { UpdateEmailSettingsDto, TestEmailDto } from "./setup.dto";
import {
  AuthGuard,
  RolesGuard,
  Roles,
  CurrentOrg,
} from "../common";
import { MailService } from "../mail/mail.service";

@Controller("setup")
@UseGuards(AuthGuard, RolesGuard)
export class SetupController {
  constructor(
    private setupService: SetupService,
    private mailService: MailService,
  ) {}

  @Get("status")
  @Roles("owner", "admin")
  getSetupStatus(@CurrentOrg("id") orgId: string) {
    return this.setupService.getSetupStatus(orgId);
  }

  @Post("complete")
  @Roles("owner")
  markComplete(@CurrentOrg("id") orgId: string) {
    return this.setupService.markSetupComplete(orgId);
  }

  @Put("email")
  @Roles("owner")
  updateEmailSettings(
    @CurrentOrg("id") _orgId: string,
    @Body() _dto: UpdateEmailSettingsDto,
  ) {
    // Email configuration is handled via environment variables in this version.
    // This endpoint validates the input and acknowledges the configuration.
    // In a future version, this could persist per-org email settings.
    return { success: true, message: "Email settings acknowledged" };
  }

  @Post("test-email")
  @Roles("owner")
  async sendTestEmail(
    @CurrentOrg("id") _orgId: string,
    @Body() dto: TestEmailDto,
  ) {
    try {
      await this.mailService.send(
        dto.to,
        "Atrium Test Email",
        "<h1>It works!</h1><p>Your email configuration is working correctly.</p>",
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Failed to send test email",
      };
    }
  }
}
