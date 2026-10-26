import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { defineContract, get, post } from "@usevibejs/contract";
import { Controller, Handle, Module, UseGuards, VibeFactory, type Ctx } from "@usevibejs/server";
import * as v from "valibot";
import {
  createAuthGuard,
  createAuthMiddleware,
  getAuthSession,
  requireAuthSession,
} from "../src/server.ts";

export const origin = "https://auth.example.test";
export const credentials = {
  name: "Ada",
  email: "ada@example.test",
  password: "Local-test-password-924!",
};

export async function fixture(
  options: { verified?: boolean; expiresIn?: number; rateLimit?: number; basePath?: string } = {},
) {
  const database = new DatabaseSync(":memory:");
  const mail: { kind: "verify" | "reset" | "invite"; url: string; email: string }[] = [];
  const auth = betterAuth({
    baseURL: origin,
    basePath: options.basePath ?? "/api/auth",
    secret: "deterministic-test-secret-at-least-thirty-two-characters",
    database,
    trustedOrigins: [origin],
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: options.verified ?? false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        mail.push({ kind: "reset", url, email: user.email });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        mail.push({ kind: "verify", url, email: user.email });
      },
    },
    session: { expiresIn: options.expiresIn ?? 3600, cookieCache: { enabled: true, maxAge: 300 } },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: options.rateLimit ?? 1000,
      customRules: { "/sign-in/email": { window: 60, max: options.rateLimit ?? 1000 } },
    },
    advanced: { useSecureCookies: true, disableOriginCheck: false, disableCSRFCheck: false },
    socialProviders: {
      github: { clientId: "local-placeholder", clientSecret: "local-placeholder" },
    },
    plugins: [
      admin(),
      organization({
        sendInvitationEmail: async (data) => {
          mail.push({ kind: "invite", url: data.id, email: data.email });
        },
      }),
      twoFactor({ issuer: "VibeAuth test" }),
      passkey({ rpID: "auth.example.test", rpName: "VibeAuth test", origin }),
    ],
  });
  await (await getMigrations(auth.options)).runMigrations();
  const routes = defineContract("/private", {
    profile: get("/profile", {
      response: v.object({ id: v.string(), name: v.string() }),
      errors: { UNAUTHORIZED: 401, FORBIDDEN: 403 },
    }),
    optional: get("/optional", { response: v.boolean() }),
    verified: get("/verified", { response: v.boolean() }),
    owner: post("/:id", { response: v.boolean() }),
  });
  const Guard = createAuthGuard(auth);
  const Verified = createAuthGuard(auth, { verifiedEmail: true });
  const Owner = createAuthGuard(auth, {
    policy: (identity, ctx) => identity.userId === ctx.params.id,
  });
  const Optional = createAuthGuard(auth, { optional: true });
  @Controller(routes)
  class ProtectedController {
    @UseGuards(Guard)
    @Handle(routes.profile)
    async profile(ctx: Ctx<typeof routes.profile>) {
      const identity = await requireAuthSession(auth, ctx);
      if ("token" in identity.session) throw new Error("Session credential leaked");
      return { id: identity.userId, name: identity.user.name };
    }
    @UseGuards(Optional)
    @Handle(routes.optional)
    async optional(ctx: Ctx<typeof routes.optional>) {
      return (await getAuthSession(auth, ctx)).authenticated;
    }
    @UseGuards(Verified)
    @Handle(routes.verified)
    verified() {
      return true;
    }
    @UseGuards(Owner)
    @Handle(routes.owner)
    owner() {
      return true;
    }
  }
  @Module({ controllers: [ProtectedController] })
  class AppModule {}
  const app = await VibeFactory.create(AppModule, {
    basePath: "/api",
    middleware: [createAuthMiddleware(auth)],
  });
  const request = async (
    path: string,
    body?: unknown,
    cookie = "",
    method = body === undefined ? "GET" : "POST",
    extra: Record<string, string> = {},
  ) =>
    app.fetch(
      new Request(`${origin}${path}`, {
        method,
        headers: {
          origin,
          ...(cookie ? { cookie } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  return {
    auth,
    app,
    database,
    routes,
    mail,
    request,
    close: async () => {
      await app.close();
      database.close();
    },
  };
}

export function cookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
