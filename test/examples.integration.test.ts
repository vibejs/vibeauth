import { afterEach, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser } from 'playwright';
import { toNodeHandler } from 'srvx/node';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
type Http1Handler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
import { fixture, credentials } from './fixture.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let authFixture: Awaited<ReturnType<typeof fixture>> | undefined;
afterEach(async () => {
  await browser?.close();
  await server?.close();
  await authFixture?.close();
});

async function start(example: 'basic' | 'saas') {
  let handler: Http1Handler | undefined;
  server = await createServer({
    root: resolve('examples', example),
    configFile: resolve('examples', example, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    plugins: [
      {
        name: 'real-auth-test',
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/') && handler) {
              void handler(req, res);
            } else next();
          });
        },
      },
    ],
  });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const origin = `http://localhost:${address.port}`;
  authFixture = await fixture({ origin, verified: true });
  handler = toNodeHandler(authFixture.app.fetch) as Http1Handler;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { page, origin, errors, f: authFixture };
}

it('runs registration, verification, login, profile update, protected dashboard and logout in Chromium', async () => {
  const { page, origin, errors, f } = await start('basic');
  await page.goto(`${origin}/dashboard`);
  await page.waitForURL('**/login?returnTo=*');
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Full name').fill(credentials.name);
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByLabel('Confirm password').fill(credentials.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
  const mail = f.mail.find((message) => message.kind === 'verify')!;
  await page.goto(mail.url);
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await expect.poll(() => page.getByRole('heading', { name: 'Hello, Ada.' }).count()).toBe(1);
  await page.getByLabel('Display name').fill('Ada Lovelace');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByRole('heading', { name: 'Hello, Ada Lovelace.' }).waitFor();
  await page.getByRole('button', { name: 'Dark mode' }).click();
  expect(await page.locator('html').getAttribute('class')).toContain('dark');
  await page.screenshot({ path: 'test-results/basic-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/basic-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name.includes('session_token') && cookie.httpOnly)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('**/login');
  expect(await page.evaluate(async () => (await fetch('/api/account/profile')).status)).toBe(401);
  expect(errors).toEqual([]);
});

it('registers and signs in with an actual virtual WebAuthn authenticator through official plugins', async () => {
  const { page, origin, errors, f } = await start('saas');
  const signup = await f.request('/api/auth/sign-up/email', credentials);
  expect(signup.status).toBe(200);
  await f.app.fetch(new Request(f.mail.find((message) => message.kind === 'verify')!.url));
  await page.goto(origin);
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/app');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  await page.getByLabel('Passkey name').fill('Chromium test key');
  await page.getByRole('button', { name: 'Add passkey', exact: true }).click();
  await page.getByText('Chromium test key', { exact: true }).waitFor();
  await page.getByLabel('Passkey name').fill('Renamed test key');
  await page.getByRole('button', { name: 'Use new name' }).click();
  await page.getByText('Renamed test key', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(origin + '/');
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await page.waitForURL('**/app');
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect.poll(() => page.getByText('Renamed test key', { exact: true }).count()).toBe(0);
  expect(errors).toEqual([]);
});
