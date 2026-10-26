import { expect, it } from 'vitest';
import { createVibeAuthClient } from '../src/index.ts';

it('can resolve the vanilla session atom explicitly without window or DOM', async () => {
  const auth = createVibeAuthClient({
    baseURL: 'https://example.test',
    fetchOptions: { customFetchImpl: async () => Response.json(null) },
  });
  await auth.ready();
  expect(auth.isPending.value).toBe(false);
  expect(auth.status.value).toBe('unauthenticated');
});
