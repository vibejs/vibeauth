import { expect, it } from 'vitest';
import type { RequestContext } from '@usevibejs/server';
import { createMutationOriginGuard } from './origin.ts';

it('rejects unsafe business requests without an exact trusted Origin', () => {
  const guard = new (createMutationOriginGuard(['https://app.example.test']))();
  const ctx = (method: string, origin?: string) =>
    ({
      req: new Request('https://app.example.test', { method, headers: origin ? { origin } : {} }),
    }) as RequestContext;
  for (const method of ['GET', 'HEAD', 'OPTIONS'])
    expect(guard.canActivate(ctx(method))).toBe(true);
  for (const origin of [
    undefined,
    'null',
    'https://evil.test',
    'https://app.example.test.evil.test',
  ])
    expect(() => guard.canActivate(ctx('POST', origin))).toThrow('Request origin rejected.');
  expect(guard.canActivate(ctx('POST', 'https://app.example.test'))).toBe(true);
  for (const origins of [
    [],
    ['*'],
    ['https://*.example.test'],
    ['https://example.test/'],
    ['data:text/plain,a'],
  ])
    expect(() => createMutationOriginGuard(origins)).toThrow('VIBEAUTH_ORIGINS');
});
