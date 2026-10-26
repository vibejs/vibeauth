import {
  hasInjectionContext,
  inject,
  provide,
  type InjectionKey,
  type Plugin,
} from "@usevibejs/ui";
import type { BetterAuthClientOptions } from "better-auth/client";
import type { VibeAuthClient } from "./client.ts";

// The default composables expose core Better Auth types. Instance composables retain extensions.
export const authKey: InjectionKey<VibeAuthClient> = Symbol("vibeauth.client");

export function createAuthPlugin<O extends BetterAuthClientOptions>(
  auth: VibeAuthClient<O>,
): Plugin {
  return {
    install(app) {
      app.provide(authKey, auth as unknown as VibeAuthClient);
      app.onUnmount(auth.mount());
    },
  };
}

/** Override within a component subtree; the caller owns the client's subscription lifetime. */
export function provideAuth<O extends BetterAuthClientOptions>(auth: VibeAuthClient<O>): void {
  provide(authKey, auth as unknown as VibeAuthClient);
}

export function useAuth<O extends BetterAuthClientOptions>(
  override: VibeAuthClient<O>,
): VibeAuthClient<O>;
export function useAuth(): VibeAuthClient;
export function useAuth(override?: VibeAuthClient): VibeAuthClient {
  if (override) return override.useAuth();
  if (!hasInjectionContext())
    throw new Error("VIBEAUTH_CONTEXT: Install createAuthPlugin and call useAuth in setup.");
  const auth = inject(authKey, undefined);
  if (!auth) throw new Error("VIBEAUTH_CONTEXT: No auth client was provided.");
  return auth.useAuth();
}

export const useSession = () => useAuth().session;
export const useUser = () => useAuth().user;
export const useIsAuthenticated = () => useAuth().isAuthenticated;
export const useAuthStatus = () => useAuth().status;
