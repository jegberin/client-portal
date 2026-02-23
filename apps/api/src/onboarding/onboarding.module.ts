import { Module } from "@nestjs/common";
import { OnboardingController } from "./onboarding.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
