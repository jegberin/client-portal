import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";
import { SetupService } from "./setup.service";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}
