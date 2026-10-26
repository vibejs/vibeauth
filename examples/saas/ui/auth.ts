import { createVibeAuthClient } from '@usevibejs/auth';
import { adminClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
export const auth = createVibeAuthClient({
  plugins: [
    adminClient(),
    organizationClient({ teams: { enabled: true } }),
    twoFactorClient(),
    passkeyClient(),
  ],
});
