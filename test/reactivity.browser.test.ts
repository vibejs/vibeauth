import { expect, it, vi } from 'vitest';
import { mount } from '@usevibejs/ui/testing';
import { createVibeAuthClient, createAuthPlugin } from '../src/index.ts';
import ReactiveAuth from './fixtures/ReactiveAuth.vibe';

it('compiles real .vibe forms, propagates input/login/logout and disposes subscriptions in Chromium', async () => {
  let signedIn = false;
  const data = {
    user: { id: 'ada', name: 'Ada', email: 'ada@example.test', emailVerified: true },
    session: {
      id: 'session',
      userId: 'ada',
      expiresAt: new Date(Date.now() + 60000),
      token: 'must-not-render',
    },
  };
  const auth = createVibeAuthClient({
    baseURL: 'https://example.test',
    fetchOptions: {
      customFetchImpl: async (input) => {
        const path = String(input);
        if (path.includes('/sign-in/email')) signedIn = true;
        if (path.includes('/sign-out')) signedIn = false;
        return Response.json(
          path.includes('/get-session')
            ? signedIn
              ? data
              : null
            : path.includes('/sign-in/email')
              ? data
              : { success: true },
        );
      },
    },
  });
  const subscribe = vi.spyOn(auth.client.useSession, 'subscribe');
  const wrapper = mount(ReactiveAuth, { plugins: [createAuthPlugin(auth)] });
  await vi.waitFor(() => expect(wrapper.text()).toContain('unauthenticated'));
  await wrapper.get('input[type="email"]').setValue('ada@example.test');
  await wrapper.get('input[type="password"]').setValue('test-password-123');
  await wrapper.get('form').trigger('submit');
  await vi.waitFor(() => expect(wrapper.get('[data-identity]').text()).toBe('Ada'));
  expect(wrapper.text()).not.toContain('must-not-render');
  expect(subscribe).toHaveBeenCalledTimes(1);
  await wrapper.get('button').trigger('click');
  await vi.waitFor(() => expect(wrapper.text()).toContain('unauthenticated'));
  wrapper.unmount();
  expect(document.querySelector('[data-identity]')).toBe(null);
});
