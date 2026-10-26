# Optional VibeForm and VibeQuery integration

The auth runtime depends on neither package. The examples use their verified public 0.1.0 APIs.
The examples install `@usevibejs/form` and `@usevibejs/query` 0.1.0 from npm as development
dependencies. They never enter the published auth manifest.

## VibeForm

`Credentials.vibe` uses `useForm` and `useField` for typed values, blur validation, submission
state, errors and password confirmation. Native controls also enforce required/email/length
constraints. The form passes submitted values straight to Better Auth, clears password fields
after security-sensitive actions, and exposes safe public messages. VibeForm does not validate
server credentials; Better Auth still enforces its password and account policies.

The core adapter also works with ordinary vibe.js forms. A form is not an authentication store.

## VibeQuery

The Account composition loads the protected profile with `useQuery` and the typed application
client. Its key includes the validated user ID; multi-tenant data should include organization
ID as well. Disable authenticated queries until identity is resolved. A 401 prompts session
revalidation, and a 403 displays a permission failure without treating it as logout.

Before logout/account switching, cancel in-flight queries and clear sensitive cache data.
The example app watches identity synchronously so user A's cached state cannot be reused for
user B. In applications that persist/dehydrate query caches, also remove persisted sensitive
state and avoid serializing private data into public documents. QueryCache is never the auth
source of truth. Invalidate profile queries after updates, and use request cancellation so a
late response cannot refill a new identity's cache.
