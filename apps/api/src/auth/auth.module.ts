import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionMiddleware } from "./session.middleware";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, SessionMiddleware],
  exports: [AuthService, SessionMiddleware],
})
export class AuthModule {}
