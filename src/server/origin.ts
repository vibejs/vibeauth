import { HttpError, type CanActivate, type RequestContext } from '@usevibejs/server';

/**
 * Origin enforcement for cookie-authenticated BUSINESS mutations. Better Auth protects its
 * own endpoints. Install after handler middleware so protocol callbacks keep their own checks.
 */
export function createMutationOriginGuard(origins: readonly string[]): new () => CanActivate {
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          !['https:', 'http:'].includes(url.protocol) ||
          url.origin !== origin ||
          origin.includes('*')
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error('VIBEAUTH_ORIGINS: Provide exact canonical HTTP(S) origins.');
  const allowed = new Set(origins);
  return class MutationOriginGuard implements CanActivate {
    canActivate(ctx: RequestContext): boolean {
      if (['GET', 'HEAD', 'OPTIONS'].includes(ctx.req.method)) return true;
      const origin = ctx.req.headers.get('origin');
      if (!origin || !allowed.has(origin))
        throw new HttpError(403, 'FORBIDDEN', 'Request origin rejected.');
      return true;
    }
  };
}
