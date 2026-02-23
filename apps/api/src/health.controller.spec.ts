import { describe, expect, it } from "bun:test";
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns ok status", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    const controller = module.get(HealthController);
    const result = controller.check();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
