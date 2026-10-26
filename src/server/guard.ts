import { HttpError, type CanActivate, type RequestContext } from '@usevibejs/server';
import type { SessionData } from '../shared/types.ts';
import { getAuthSession, type AuthContext, type SessionSource } from './session.ts';

export type AuthenticatedContext<S extends SessionData> = Extract<
  AuthContext<S>,
  { authenticated: true }
>;
/** A policy must load ownership/membership from trusted server data, never request role claims. */
export type AuthPolicy<S extends SessionData> = (
  auth: AuthenticatedContext<S>,
  ctx: RequestContext,
) => boolean | Promise<boolean>;

export interface AuthGuardOptions<S extends SessionData> {
  /** Populate the request cache without requiring a session. Other restrictions still require one. */
  optional?: boolean;
  verifiedEmail?: boolean;
  policy?: AuthPolicy<S>;
}

/** Pass the returned class to UseGuards or AppOptions.guards. */
export function createAuthGuard<S extends SessionData>(
  auth: SessionSource<S>,
  options: AuthGuardOptions<S> = {},
): new () => CanActivate {
  return class AuthGuard implements CanActivate {
    async canActivate(ctx: RequestContext): Promise<boolean> {
      const identity = await getAuthSession(auth, ctx);
      if (!identity.authenticated) {
        if (options.optional && !options.verifiedEmail && !options.policy) return true;
        throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required.');
      }
      if (
        (options.verifiedEmail && !identity.user.emailVerified) ||
        (options.policy && !(await options.policy(identity, ctx)))
      ) {
        throw new HttpError(403, 'FORBIDDEN', 'Access denied.');
      }
      return true;
    }
  };
}

/** Compose explicit resource/action policies. All policies must grant access. */
export function allPolicies<S extends SessionData>(...policies: AuthPolicy<S>[]): AuthPolicy<S> {
  return async (auth, ctx) => {
    for (const policy of policies) if (!(await policy(auth, ctx))) return false;
    return true;
  };
}
