import { Controller, Handle, HttpError, UseGuards, type Ctx } from '@usevibejs/server';
import type { User, Session } from 'better-auth';
import type { SessionSource } from '@usevibejs/auth/server';
type AccountAuth = SessionSource<{ user: User; session: Session }> & {
  api: {
    listSessions(input: { headers: Headers }): Promise<Session[]>;
    revokeSession(input: { headers: Headers; body: { token: string } }): Promise<unknown>;
  };
};
import {
  createAuthGuard,
  requireAuthSession,
  createMutationOriginGuard,
} from '@usevibejs/auth/server';
import { account } from './contracts.ts';

export function accountController(auth: AccountAuth, origins: readonly string[]) {
  const Origin = createMutationOriginGuard(origins);
  const Authenticated = createAuthGuard(auth);
  @Controller(account)
  @UseGuards(Authenticated, Origin)
  class AccountController {
    @Handle(account.profile)
    async profile(ctx: Ctx<typeof account.profile>) {
      const identity = await requireAuthSession(auth, ctx);
      return {
        id: identity.user.id,
        name: identity.user.name,
        email: identity.user.email,
        emailVerified: identity.user.emailVerified,
      };
    }
    @Handle(account.sessions)
    async sessions(ctx: Ctx<typeof account.sessions>) {
      const identity = await requireAuthSession(auth, ctx);
      const sessions = await auth.api.listSessions({ headers: ctx.req.headers });
      return sessions.map((session) => ({
        id: session.id,
        current: session.id === identity.sessionId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        userAgent: session.userAgent ?? null,
      }));
    }
    @Handle(account.revoke)
    async revoke(ctx: Ctx<typeof account.revoke>) {
      const sessions = await auth.api.listSessions({ headers: ctx.req.headers });
      const owned = sessions.find((session) => session.id === ctx.params.id);
      if (!owned) throw new HttpError(403, 'FORBIDDEN', 'Access denied.');
      await auth.api.revokeSession({ headers: ctx.req.headers, body: { token: owned.token } });
      return true;
    }
  }
  return AccountController;
}
