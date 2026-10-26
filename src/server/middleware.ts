import type { Middleware } from '@usevibejs/server';

export interface AuthHandler {
  handler(request: Request): Promise<Response>;
  options?: object;
}

/** Mount at an absolute URL pathname, independent of the vibe.js controller basePath. */
export function createAuthMiddleware(
  auth: AuthHandler,
  options: { basePath?: string } = {},
): Middleware {
  const configuredPath =
    auth.options && 'basePath' in auth.options && typeof auth.options.basePath === 'string'
      ? auth.options.basePath
      : undefined;
  const basePath = options.basePath ?? configuredPath ?? '/api/auth';
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(basePath)) {
    throw new Error(
      'VIBEAUTH_INVALID_PATH: Use an absolute authentication path without a trailing slash.',
    );
  }
  if (configuredPath && configuredPath !== basePath) {
    throw new Error('VIBEAUTH_PATH_MISMATCH: Better Auth and middleware basePath must match.');
  }
  return async (request, next) => {
    const path = new URL(request.url).pathname;
    return path === basePath || path.startsWith(`${basePath}/`) ? auth.handler(request) : next();
  };
}
