# Client and native composables

```ts
import { createVibeAuthClient, createAuthPlugin } from '@usevibejs/auth';
import { twoFactorClient, organizationClient } from 'better-auth/client/plugins';
const auth = createVibeAuthClient({ plugins: [twoFactorClient(), organizationClient()] });
app.use(createAuthPlugin(auth));
```

The `.client` property is the unmodified, fully inferred Better Auth vanilla client. Use its
`signIn`, `signUp`, `signOut`, `updateUser`, `changePassword`, `requestPasswordReset`,
`resetPassword`, `verifyEmail` and plugin actions directly. There is no duplicate command API.
Handle each action's `error`; session errors are separate from form submission errors.

In component setup or an effect scope:

```ts
const state = auth.useAuth();
await state.client.signIn.email({ email, password });
await state.refreshSession();
```

`auth.useAuth()` retains custom fields and plugin extensions. The exported `useAuth()`
uses the nearest app/subtree injection and exposes core Better Auth types. `useAuth(auth)`
also retains the explicit instance's types. `provideAuth(auth)` overrides descendants in a
component subtree. There is no assumption that unrelated apps share an instance.

| Composable             | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| `useAuth()`            | Adapter instance; `.client` contains auth operations |
| `useSession()`         | Computed ref of the sanitized session record or null |
| `useUser()`            | Computed ref of the core user or null                |
| `useIsAuthenticated()` | Computed boolean ref; false during errors/expiration |
| `useAuthStatus()`      | Computed status ref                                  |

All composables require setup/effect-scope lifetime. To access outside a scope, use the
instance properties directly and hold `const release = auth.mount()` until finished.
`refreshSession()` and `ready()` temporarily acquire their own subscription. Release functions
are idempotent. Installing the plugin holds a subscription until app unmount.

## Reactive state

The public vanilla `useSession` atom owns session fetching, plugin notifications, cross-tab
signals, window focus and network reconnect behavior. VibeAuth subscribes once per instance,
mirrors snapshots with `shallowRef`, derives computed values, and uses an effect scope for
cleanup and an expiration deadline. It does not poll. Better Auth's own polling is off unless
you configure `sessionOptions.refetchInterval`.

| Status            | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `loading`         | Initial session resolution is pending; do not redirect as anonymous yet                |
| `authenticated`   | A session is available                                                                 |
| `unauthenticated` | Successful validation returned no session                                              |
| `refreshing`      | Revalidation is running; existing identity may still be available                      |
| `error`           | Validation failed; identity-sensitive adapter reads return null                        |
| `expired`         | The known expiration deadline passed; identity reads return null and revalidation runs |

`data` is `{ user, session }` with the session token omitted. The native Better Auth client
still has its own protocol types. Never render or persist those credentials. Use `.error`
for validation failures and `.isPending` for initial loading. An error is not proof of logout.

Better Auth cancels superseded session requests. The tests exercise delayed old responses,
account switching, logout, expiration, disposal and independent instances. Nanostores delays
its own upstream listener teardown briefly after the last subscriber; VibeAuth removes its
subscription immediately and respects that supported lifecycle rather than manipulating
private stores.
