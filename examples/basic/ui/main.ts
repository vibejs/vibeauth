import { createApp, watch, effectScope } from '@usevibejs/ui';
import { createRouter, createWebHistory } from '@usevibejs/ui/router';
import { createAuthPlugin } from '@usevibejs/auth';
import { createAuthRouteGuard } from '@usevibejs/auth/router';
import { createVibeQueryPlugin, QueryClient } from '@usevibejs/query';
import App from './App.vibe';
import AuthPage from './AuthPage.vibe';
import Dashboard from './Dashboard.vibe';
import VerifyEmail from './VerifyEmail.vibe';
import { auth } from './auth.ts';
import '../../shared/styles.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: AuthPage, meta: { auth: { mode: 'guest' } } },
    { path: '/login', component: AuthPage, meta: { auth: { mode: 'guest' } } },
    { path: '/verify-email', component: VerifyEmail },
    { path: '/dashboard', component: Dashboard, meta: { auth: { mode: 'authenticated' } } },
  ],
});
router.beforeEach(createAuthRouteGuard({ auth, home: '/dashboard' }));
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
