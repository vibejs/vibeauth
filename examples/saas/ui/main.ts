import { createApp, effectScope, watch } from '@usevibejs/ui';
import { createRouter, createWebHistory } from '@usevibejs/ui/router';
import { createAuthPlugin } from '@usevibejs/auth';
import { createAuthRouteGuard } from '@usevibejs/auth/router';
import { createVibeQueryPlugin, QueryClient } from '@usevibejs/query';
import App from './App.vibe';
import { auth } from './auth.ts';
import '../../shared/styles.css';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', meta: { auth: { mode: 'guest' } } },
    { path: '/app', meta: { auth: { mode: 'authenticated' } } },
  ],
});
router.beforeEach(createAuthRouteGuard({ auth, login: '/', home: '/app' }));
const queries = new QueryClient();
const scope = effectScope();
scope.run(() => {
  watch(
    () => auth.user.value?.id,
    () => {
      void queries.cancelQueries();
      queries.clear();
    },
    { flush: 'sync' },
  );
});
const app = createApp(App)
  .use(createAuthPlugin(auth))
  .use(createVibeQueryPlugin(queries))
  .use(router);
app.onUnmount(() => scope.stop());
await router.isReady();
app.mount('#app');
