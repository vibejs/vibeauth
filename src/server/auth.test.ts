import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@usevibejs/contract";
import { credentials, cookies, fixture, origin } from "../../test/fixture.ts";

const open: Awaited<ReturnType<typeof fixture>>[] = [];
afterEach(async () => {
  for (const f of open.splice(0)) await f.close();
});
async function setup(options?: Parameters<typeof fixture>[0]) {
  const f = await fixture(options);
  open.push(f);
  return f;
}

describe("real Better Auth + VibeFactory.fetch", () => {
  it("registers, sets secure cookies, authenticates typed APIs, logs out and rejects revoked cookies", async () => {
    const f = await setup();
    expect((await f.request("/api/private/profile")).status).toBe(401);
    const registration = await f.request("/api/auth/sign-up/email", credentials);
    expect(registration.status).toBe(200);
    const setCookies = registration.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThan(1);
    expect(setCookies.join(" ")).toMatch(/HttpOnly/i);
    expect(setCookies.join(" ")).toMatch(/Secure/i);
    expect(setCookies.join(" ")).toMatch(/SameSite=Lax/i);
    const cookie = cookies(registration);
    const client = createClient(
      { private: f.routes },
      { baseUrl: `${origin}/api`, fetch: f.app.fetch, headers: { cookie } },
    );
    const profile = await client.private.profile();
    expect(profile.ok).toBe(true);
    if (profile.ok) expect(profile.data.name).toBe("Ada");
    expect((await f.request("/api/private/profile", undefined, cookie)).status).toBe(200);
    const logout = await f.request("/api/auth/sign-out", {}, cookie);
    expect(logout.status).toBe(200);
    expect((await f.request("/api/private/profile", undefined, cookie)).status).toBe(401);
    const login = await f.request("/api/auth/sign-in/email", credentials);
    expect(login.status).toBe(200);
    expect(cookies(login)).not.toEqual(cookie);
  });

  it("rejects forged credentials and isolates concurrent request identities", async () => {
    const f = await setup();
    const a = await f.request("/api/auth/sign-up/email", credentials);
    const b = await f.request("/api/auth/sign-up/email", {
      ...credentials,
      name: "Grace",
      email: "grace@example.test",
    });
    const results = await Promise.all(
      [cookies(a), "", cookies(b), "__Secure-better-auth.session_token=forged"].map((cookie) =>
        f.request("/api/private/profile", undefined, cookie),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 401, 200, 401]);
    expect(await results[0].json()).toMatchObject({ name: "Ada" });
    expect(await results[2].json()).toMatchObject({ name: "Grace" });
    expect(
      (await f.request("/api/auth/sign-in/email", { ...credentials, password: "wrong-password" }))
        .status,
    ).toBe(401);
  });

  it("enforces email verification and single-use password recovery with session revocation", async () => {
    const f = await setup({ verified: true });
    const signup = await f.request("/api/auth/sign-up/email", credentials);
    expect(signup.status).toBe(200);
    expect((await f.request("/api/auth/sign-in/email", credentials)).status).toBe(403);
    const verification = f.mail.find((m) => m.kind === "verify")!;
    expect((await f.app.fetch(new Request(verification.url))).status).toBe(302);
    const login = await f.request("/api/auth/sign-in/email", credentials);
    expect(login.status).toBe(200);
    const cookie = cookies(login);
    expect((await f.request("/api/private/verified", undefined, cookie)).status).toBe(200);
    const reset = await f.request("/api/auth/request-password-reset", {
      email: credentials.email,
      redirectTo: `${origin}/reset-password`,
    });
    expect(reset.status).toBe(200);
    const token = new URL(f.mail.find((m) => m.kind === "reset")!.url).pathname.split("/").at(-1)!;
    const newPassword = "Replacement-password-937!";
    expect((await f.request("/api/auth/reset-password", { token, newPassword })).status).toBe(200);
    expect((await f.request("/api/auth/reset-password", { token, newPassword })).status).toBe(400);
    expect((await f.request("/api/private/profile", undefined, cookie)).status).toBe(401);
    expect((await f.request("/api/auth/sign-in/email", credentials)).status).toBe(401);
    expect(
      (await f.request("/api/auth/sign-in/email", { ...credentials, password: newPassword }))
        .status,
    ).toBe(200);
  });

  it("rejects untrusted origins, login CSRF, unsafe callback URLs and invalid OAuth state", async () => {
    const f = await setup();
    const untrusted = await f.request("/api/auth/sign-up/email", credentials, "", "POST", {
      origin: "https://attacker.example",
    });
    expect(untrusted.status).toBe(403);
    const csrf = await f.app.fetch(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "navigate",
        },
        body: new URLSearchParams(credentials),
      }),
    );
    expect(csrf.status).toBe(403);
    const callback = await f.request("/api/auth/sign-in/social", {
      provider: "github",
      callbackURL: "https://attacker.example/steal",
    });
    expect(callback.status).toBe(403);
    const oauth = await f.request("/api/auth/callback/github?state=forged&code=fake");
    expect([302, 400, 401, 403]).toContain(oauth.status);
    if (oauth.status === 302) expect(oauth.headers.get("location")).toContain("error=");
    expect((await f.request("/api/private/profile")).status).toBe(401);
  });

  it("distinguishes optional, verified and resource authorization", async () => {
    const f = await setup();
    expect(await (await f.request("/api/private/optional")).json()).toBe(false);
    const signup = await f.request("/api/auth/sign-up/email", credentials);
    const cookie = cookies(signup);
    const user = (await signup.json()).user;
    expect((await f.request("/api/private/verified", undefined, cookie)).status).toBe(403);
    expect((await f.request(`/api/private/${user.id}`, {}, cookie)).status).toBe(200);
    expect((await f.request("/api/private/another-user", {}, cookie)).status).toBe(403);
    expect((await f.request("/api/private/another-user", {})).status).toBe(401);
  });

  it("rejects expired sessions and limits repeated requests", async () => {
    const f = await setup({ expiresIn: 1 });
    const signup = await f.request("/api/auth/sign-up/email", credentials);
    const cookie = cookies(signup);
    // Modify only expiry in this isolated database; verification remains Better Auth's real API.
    f.database.prepare("UPDATE session SET expiresAt = ?").run(Date.now() - 10000);
    expect((await f.request("/api/private/profile", undefined, cookie)).status).toBe(401);
    const limited = await setup({ rateLimit: 1 });
    await limited.request("/api/auth/ok");
    expect((await limited.request("/api/auth/ok")).status).toBe(429);
  });
});
