import {
  computed,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
} from "@usevibejs/ui";
import {
  createAuthClient,
  type AuthClient,
  type BetterAuthClientOptions,
  type Atom,
  type BetterFetchError,
  type SessionQueryParams,
} from "better-auth/client";
import {
  sanitizeSession,
  type AuthStatus,
  type SafeSession,
  type SessionData,
} from "../shared/types.ts";

export interface AuthState<S extends SessionData> {
  readonly data: ComputedRef<SafeSession<S> | null>;
  readonly session: ComputedRef<SafeSession<S>["session"] | null>;
  readonly user: ComputedRef<S["user"] | null>;
  readonly status: ComputedRef<AuthStatus>;
  readonly isAuthenticated: ComputedRef<boolean>;
  readonly isPending: ComputedRef<boolean>;
  readonly error: ComputedRef<unknown>;
  /** Holds one shared subscription until the returned release function runs. */
  mount(): () => void;
  /** Revalidates through the official session atom; never a second session fetch engine. */
  refreshSession(): Promise<void>;
  /** Resolves after initial validation; errors remain explicit in status/error. */
  ready(): Promise<void>;
}

export type ClientSession<O extends BetterAuthClientOptions> = AuthClient<O>["$Infer"]["Session"] &
  SessionData;
export type VibeAuthClient<O extends BetterAuthClientOptions = {}> = AuthState<ClientSession<O>> & {
  /** The unmodified Better Auth client, including every inferred plugin action. */
  readonly client: AuthClient<O>;
  /** Instance-bound composable preserves plugin/custom field inference. */
  useAuth(): VibeAuthClient<O>;
};

/** Bridge the public vanilla useSession atom. No framework-specific Better Auth hooks. */
export function createVibeAuthClient<const O extends BetterAuthClientOptions = {}>(
  options?: O,
): VibeAuthClient<O> {
  const client = createAuthClient<O>(options);
  // Better Auth's conditional client inference is unresolved for generic O, but every supported
  // session response has its core user/session shape. Preserve all inferred extensions.
  const atom = client.useSession as Atom<{
    data: ClientSession<O> | null;
    error: BetterFetchError | null;
    isPending: boolean;
    isRefetching: boolean;
    refetch(query?: { query?: SessionQueryParams }): Promise<void>;
  }>;
  const snapshot = shallowRef(atom.get());
  const expired = ref(false);
  let mounts = 0;
  let stop: (() => void) | undefined;

  const status = computed<AuthStatus>(() => {
    const state = snapshot.value;
    if (expired.value) return "expired";
    if (state.error) return "error";
    if (state.isPending) return "loading";
    if (state.isRefetching) return "refreshing";
    return state.data ? "authenticated" : "unauthenticated";
  });
  const data = computed(() => {
    const state = snapshot.value;
    // Fail closed for identity-sensitive UI during errors and after expiration.
    return state.data && !expired.value && !state.error ? sanitizeSession(state.data) : null;
  });

  const auth: VibeAuthClient<O> = {
    client,
    data,
    session: computed(() => data.value?.session ?? null),
    user: computed(() => data.value?.user ?? null),
    status,
    isAuthenticated: computed(() => data.value !== null),
    isPending: computed(() => snapshot.value.isPending),
    error: computed(() => snapshot.value.error),
    mount() {
      if (mounts++ === 0) {
        const scope = effectScope(true);
        const unsubscribe = atom.subscribe((value) => {
          snapshot.value = value;
        });
        scope.run(() => {
          onScopeDispose(unsubscribe);
          watch(
            () => snapshot.value.data?.session.expiresAt,
            (expiresAt, _previous, cleanup) => {
              expired.value = false;
              if (!expiresAt) return;
              const remaining = new Date(expiresAt).getTime() - Date.now();
              if (!Number.isFinite(remaining) || remaining <= 0) {
                expired.value = true;
                return;
              }
              // Long sessions reschedule without exceeding the platform timer limit.
              let timer: ReturnType<typeof setTimeout>;
              const schedule = () => {
                const delay = new Date(expiresAt).getTime() - Date.now();
                if (delay > 0) timer = setTimeout(schedule, Math.min(delay, 2_147_483_647));
                else {
                  expired.value = true;
                  void atom.get().refetch();
                }
              };
              schedule();
              cleanup(() => clearTimeout(timer));
            },
            { immediate: true, flush: "sync" },
          );
        });
        stop = () => scope.stop();
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (--mounts === 0) {
          stop?.();
          stop = undefined;
        }
      };
    },
    async refreshSession() {
      const release = auth.mount();
      try {
        await atom.get().refetch();
      } finally {
        release();
      }
    },
    async ready() {
      const release = auth.mount();
      try {
        if (!snapshot.value.isPending && !snapshot.value.isRefetching) return;
        await new Promise<void>((resolve) => {
          const unsubscribe = atom.listen((value) => {
            if (value.isPending || value.isRefetching) return;
            unsubscribe();
            resolve();
          });
          // Vanilla's automatic mount fetch is browser-only.
          if (typeof window === "undefined") void atom.get().refetch();
        });
      } finally {
        release();
      }
    },
    useAuth() {
      if (!getCurrentScope())
        throw new Error("VIBEAUTH_SCOPE: useAuth requires a component setup or effect scope.");
      onScopeDispose(auth.mount());
      return auth;
    },
  };
  return auth;
}
