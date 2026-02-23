import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private resend: Resend | null;
  private from: string;

  constructor(
    private config: ConfigService,
    @InjectPinoLogger(MailService.name) private readonly logger: PinoLogger,
  ) {
    const apiKey = this.config.get("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get("EMAIL_FROM", "noreply@atrium.local");
  }

  async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.info({ to, subject }, "Email not sent (no RESEND_API_KEY configured)");
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    this.logger.info({ to, subject }, "Email sent");
  }
}
