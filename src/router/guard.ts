import type { RouteLocation, RouteRecordRaw } from '@usevibejs/ui/router';
import type { AuthState } from '../client/client.ts';
import type { SessionData } from '../shared/types.ts';
import { safeReturnURL } from './redirect.ts';

export interface AuthRouteMeta {
  mode?: 'public' | 'guest' | 'authenticated';
  verifiedEmail?: boolean;
  permissions?: readonly string[];
  organization?: boolean;
}

declare module '@usevibejs/ui/router' {
  interface RouteMeta {
    auth?: AuthRouteMeta;
  }
}

export interface AuthRouteGuardOptions<S extends SessionData> {
  auth: AuthState<S>;
  login?: string;
  home?: string;
  forbidden?: string;
  verifyEmail?: string;
  /** UX policy only. Server endpoints must independently validate membership/resource access. */
  authorize?: (
    requirements: AuthRouteMeta,
    to: RouteLocation<readonly RouteRecordRaw[]>,
  ) => boolean | Promise<boolean>;
}

/** Register with router.beforeEach. Meta is checked across parents so children cannot weaken it. */
export function createAuthRouteGuard<S extends SessionData>(
  options: AuthRouteGuardOptions<S>,
): (
  to: RouteLocation<readonly RouteRecordRaw[]>,
  from: RouteLocation<readonly RouteRecordRaw[]>,
) => Promise<void | false | { path: string; replace: boolean; query?: { returnTo: string } }> {
  const { auth } = options;
  const login = safeReturnURL(options.login ?? '/login');
  const home = safeReturnURL(options.home ?? '/');
  const forbidden = safeReturnURL(options.forbidden ?? '/forbidden');
  const verifyEmail = safeReturnURL(options.verifyEmail ?? '/verify-email');
  let navigation = 0;
  return async (to) => {
    const current = ++navigation;
    const rules = to.matched.flatMap((record) => (record.meta.auth ? [record.meta.auth] : []));
    if (
      !rules.length ||
      (rules.every((rule) => !rule.mode || rule.mode === 'public') &&
        rules.every(
          (rule) => !rule.verifiedEmail && !rule.permissions?.length && !rule.organization,
        ))
    )
      return;
    await auth.ready();
    if (current !== navigation) return false;
    if (auth.status.value === 'error') return false;
    const loggedIn = auth.isAuthenticated.value;
    const redirect = (path: string, returnURL = false) => {
      if (to.path === path.split(/[?#]/)[0]) return false;
      return {
        path,
        replace: true,
        ...(returnURL ? { query: { returnTo: safeReturnURL(to.fullPath) } } : {}),
      };
    };
    if (!loggedIn) {
      if (
        rules.some(
          (r) =>
            r.mode === 'authenticated' ||
            r.verifiedEmail ||
            r.permissions?.length ||
            r.organization,
        )
      )
        return redirect(login, true);
      return;
    }
    if (rules.some((r) => r.mode === 'guest')) return redirect(home);
    if (rules.some((r) => r.verifiedEmail) && !auth.user.value?.emailVerified)
      return redirect(verifyEmail);
    const userId = auth.user.value?.id;
    for (const rule of rules) {
      if (
        (rule.permissions?.length || rule.organization) &&
        (!options.authorize || !(await options.authorize(rule, to)))
      ) {
        if (current !== navigation) return false;
        return redirect(forbidden);
      }
    }
    if (current !== navigation) return false;
    // Recheck identity after asynchronous policy checks (logout/account switch during navigation).
    if (!auth.isAuthenticated.value) return redirect(login, true);
    if (auth.user.value?.id !== userId) return false;
  };
}
