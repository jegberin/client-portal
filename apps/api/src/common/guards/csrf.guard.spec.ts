import { describe, expect, it } from "bun:test";
import { CsrfGuard } from "./csrf.guard";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

function createMockContext(
  method: string,
  cookies: Record<string, string> = {},
  headers: Record<string, string> = {},
  url = "/api/projects",
): { context: ExecutionContext; response: any } {
  const response = {
    cookie: () => {},
  };
  const request = {
    method,
    cookies,
    headers,
    originalUrl: url,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { context, response };
}

describe("CsrfGuard", () => {
  it("allows GET requests without CSRF token", () => {
    const reflector = new Reflector();
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("GET");

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows HEAD requests without CSRF token", () => {
    const reflector = new Reflector();
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("HEAD");

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows OPTIONS requests without CSRF token", () => {
    const reflector = new Reflector();
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("OPTIONS");

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows auth proxy routes without CSRF token", () => {
    const reflector = new Reflector();
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("POST", {}, {}, "/api/auth/sign-in/email");

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows public endpoints without CSRF token", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => true;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("POST");

    expect(guard.canActivate(context)).toBe(true);
  });

  it("allows POST when cookie and header tokens match", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const token = "abc123def456";
    const { context } = createMockContext(
      "POST",
      { "csrf-token": token },
      { "x-csrf-token": token },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects POST when CSRF header is missing", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext(
      "POST",
      { "csrf-token": "abc123" },
      {},
    );

    try {
      guard.canActivate(context);
      expect(true).toBe(false); // should not reach
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects POST when CSRF cookie is missing", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext(
      "POST",
      {},
      { "x-csrf-token": "abc123" },
    );

    try {
      guard.canActivate(context);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects POST when cookie and header tokens do not match", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext(
      "POST",
      { "csrf-token": "token-a" },
      { "x-csrf-token": "token-b" },
    );

    try {
      guard.canActivate(context);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects PUT without valid CSRF token", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("PUT");

    try {
      guard.canActivate(context);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects DELETE without valid CSRF token", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("DELETE");

    try {
      guard.canActivate(context);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects PATCH without valid CSRF token", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => false;
    const guard = new CsrfGuard(reflector);
    const { context } = createMockContext("PATCH");

    try {
      guard.canActivate(context);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("sets csrf cookie when one does not exist", () => {
    const reflector = new Reflector();
    const guard = new CsrfGuard(reflector);
    let cookieSet = false;
    let cookieName = "";

    const response = {
      cookie: (name: string) => {
        cookieSet = true;
        cookieName = name;
      },
    };
    const request = {
      method: "GET",
      cookies: {},
      headers: {},
      originalUrl: "/api/projects",
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    guard.canActivate(context);

    expect(cookieSet).toBe(true);
    expect(cookieName).toBe("csrf-token");
  });
});
