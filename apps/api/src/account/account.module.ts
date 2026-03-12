import { Module } from "@nestjs/common";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [FilesModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
