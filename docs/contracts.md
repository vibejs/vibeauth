# Typed business contracts

Keep Better Auth's dynamic endpoints under its own handler. Vibe.js contracts describe your
application endpoints, with the same error codes enforced by server guards.

```ts
import { defineContract, get } from '@usevibejs/contract';
import * as v from 'valibot';
export const account = defineContract('/account', {
  profile: get('/profile', {
    response: v.object({ id: v.string(), name: v.string() }),
    errors: { UNAUTHORIZED: 401, FORBIDDEN: 403 },
  }),
});
```

```ts
@Controller(account)
@UseGuards(createAuthGuard(auth))
class AccountController {
  @Handle(account.profile)
  async profile(ctx: Ctx<typeof account.profile>) {
    const identity = await requireAuthSession(auth, ctx);
    return { id: identity.userId, name: identity.user.name };
  }
}
```

```ts
const api = createClient({ account }, { baseUrl: '/api' });
const result = await api.account.profile();
if (result.ok) showProfile(result.data);
else if (result.error.status === 401) await auth.refreshSession();
else if (result.error.status === 403) showForbidden();
```

Contract files import only the contract package and a schema library. Server handlers use
`Ctx<typeof route>`, without casts or broad `any`. A typed client call returns an ApiResult;
network/HTTP errors are values. The basic example and real Fetch integration tests exercise
this path. The SaaS contract demonstrates tenant-scoped reads, creation and resource updates.
