import { HttpError, type RequestContext } from "@usevibejs/server";
import { sanitizeSession, type SafeSession, type SessionData } from "../shared/types.ts";

/** Structural public interface, so plugin/custom-field inference remains with Better Auth. */
export interface SessionSource<S extends SessionData> {
  api: {
    getSession(input: {
      headers: Headers;
      query: { disableCookieCache: true; disableRefresh: true };
    }): Promise<S | null>;
  };
}

export type AuthContext<S extends SessionData = SessionData> =
  | {
      readonly authenticated: false;
      readonly user: null;
      readonly session: null;
      readonly userId: null;
      readonly sessionId: null;
    }
  | (SafeSession<S> & {
      readonly authenticated: true;
      readonly userId: string;
      readonly sessionId: string;
    });

// Keys and values live only as long as the request context. No cross-request session cache.
const requests = new WeakMap<RequestContext, Map<object, Promise<AuthContext>>>();

/**
 * Validate against Better Auth's session store once per context/source. Bypasses its cookie
 * cache for revocation-sensitive business APIs. Read-only: renewal belongs to /get-session.
 * After a mutation in this request use `fresh: true` to validate again.
 */
export function getAuthSession<S extends SessionData>(
  auth: SessionSource<S>,
  ctx: RequestContext,
  options: { fresh?: boolean } = {},
): Promise<AuthContext<S>> {
  let cache = requests.get(ctx);
  if (!cache) requests.set(ctx, (cache = new Map()));
  const cached = cache.get(auth);
  // Each source key holds only the result of that source's inferred session type.
  if (cached && !options.fresh) return cached as Promise<AuthContext<S>>;
  const lookup = auth.api
    .getSession({
      headers: ctx.req.headers,
      query: { disableCookieCache: true, disableRefresh: true },
    })
    .then((data): AuthContext<S> =>
      data
        ? {
            ...sanitizeSession(data),
            authenticated: true,
            userId: data.user.id,
            sessionId: data.session.id,
          }
        : { authenticated: false, user: null, session: null, userId: null, sessionId: null },
    );
  cache.set(auth, lookup);
  void lookup.catch(() => {
    if (cache.get(auth) === lookup) cache.delete(auth);
  });
  return lookup;
}

export async function requireAuthSession<S extends SessionData>(
  auth: SessionSource<S>,
  ctx: RequestContext,
) {
  const session = await getAuthSession(auth, ctx);
  if (!session.authenticated) throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
  return session;
}
