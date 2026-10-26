# Architecture

VibeAuth has three ESM entries, with separate module graphs. The root imports the public
vibe.js UI runtime and Better Auth's vanilla client. The server entry imports the public
vibe.js server; shared types have no runtime dependencies. The router entry consumes a
structural `AuthState` and UI router types. Database adapters and credentials live only in
application server code. All framework and auth peers remain external in the package build.

```text
Browser form -> Better Auth vanilla client -> /api/auth/* -> Better Auth handler -> database
                      |                         (unchanged Fetch Request/Response)
                official session atom
                      |
                 Vibe computed refs -> .vibe UI / router guards

Business client -> vibe.js contract/controller -> authentication guard -> resource policy -> data
                                                    |
                                           Better Auth getSession
```

Authentication endpoints belong to Better Auth. Business contracts belong to the application.
Neither VibeAuth nor the router generates contracts for dynamic Better Auth plugin endpoints.

There is no process-wide authentication singleton. Each client holds one reference-counted
session subscription. Each server RequestContext holds an isolated weakly keyed cache,
partitioned again by auth instance. Tokens are omitted from adapter contexts. Better Auth's
native client and server APIs remain available for operations that require them.

vibe.js public APIs were verified against the local source, contracts, decisions and installed
0.1.0 package. No runtime adapter imports `@usevibejs/ui/internal`. Compiler-produced `.vibe`
modules use the compiler's normal internal ABI. vibe.js 0.1 is client-rendered; SSR is not
advertised. See decision 0001 in this repository.
