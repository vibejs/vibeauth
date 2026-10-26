/** Better Auth's public identity fields; additional fields retain their inferred types. */
export interface SessionData {
  user: { id: string; emailVerified: boolean };
  session: { id: string; userId: string; expiresAt: Date | string };
}

/** Opaque session credentials must never enter VibeAuth's request or reactive context. */
export type SafeSession<S extends SessionData> = {
  readonly user: S["user"];
  readonly session: Omit<S["session"], "token">;
};

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "refreshing"
  | "error"
  | "expired";

export function sanitizeSession<S extends SessionData>(data: S): SafeSession<S> {
  const { token: _token, ...session } = data.session as S["session"] & { token?: unknown };
  return { user: data.user, session };
}
