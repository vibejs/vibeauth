export {
  createVibeAuthClient,
  type VibeAuthClient,
  type AuthState,
  type ClientSession,
} from './client/client.ts';
export {
  createAuthPlugin,
  provideAuth,
  useAuth,
  useSession,
  useUser,
  useIsAuthenticated,
  useAuthStatus,
  authKey,
} from './client/context.ts';
export type { AuthStatus, SafeSession, SessionData } from './shared/types.ts';
