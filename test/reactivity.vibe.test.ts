import { expect, it } from 'vitest';
import { mount } from '@usevibejs/ui/testing';
import { createVibeAuthClient, createAuthPlugin } from '../src/index.ts';
import ReactiveAuth from './fixtures/ReactiveAuth.vibe';
import Identity from './fixtures/Identity.vibe';
import NestedAuth from './fixtures/NestedAuth.vibe';

it('uses provide/inject and pending conditional UI in a real compiled component', () => {
  const auth = createVibeAuthClient({
    baseURL: 'https://example.test',
    fetchOptions: { customFetchImpl: async () => Response.json(null) },
  });
  const wrapper = mount(ReactiveAuth, { plugins: [createAuthPlugin(auth)] });
  expect(wrapper.text()).toContain('Loading your account');
  expect(wrapper.find('form').exists()).toBe(false);
  wrapper.unmount();
});

it('isolates real applications and provides the nearest subtree instance until its last app unmounts', async () => {
  const make = (name: string) =>
    createVibeAuthClient({
      baseURL: 'https://example.test',
      fetchOptions: {
        customFetchImpl: async () =>
          Response.json({
            user: { id: name, name, email: `${name}@example.test`, emailVerified: true },
            session: { id: name, userId: name, expiresAt: new Date(Date.now() + 60000) },
          }),
      },
    });
  const ada = make('Ada'),
    grace = make('Grace');
  await ada.refreshSession();
  await grace.refreshSession();
  const nested = mount(NestedAuth, {
    props: { override: grace },
    plugins: [createAuthPlugin(ada)],
  });
  const separate = mount(Identity, { plugins: [createAuthPlugin(grace)] });
  expect(nested.get('[data-parent]').text()).toBe('Ada');
  expect(nested.get('[data-identity]').text()).toBe('Grace');
  expect(separate.get('[data-identity]').text()).toBe('Grace');
  nested.unmount();
  await grace.refreshSession();
  expect(separate.get('[data-identity]').text()).toBe('Grace');
  separate.unmount();
});
