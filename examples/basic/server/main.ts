// oxlint-disable typescript/no-extraneous-class -- Vibe.js modules are plain classes registered with Module.
import { Module, VibeFactory } from '@usevibejs/server';
import { createAuthMiddleware } from '@usevibejs/auth/server';
import { accountController } from '../../shared/server.ts';
import { createExampleAuth } from './auth.ts';

const { auth, config, database } = createExampleAuth();
class AppModule {}
Module({ controllers: [accountController(auth, config.trustedOrigins)] })(AppModule);
const app = await VibeFactory.create(AppModule, {
  basePath: '/api',
  middleware: [createAuthMiddleware(auth)],
});
app.enableShutdownHooks();
await app.listen(config.port, '127.0.0.1');
process.once('exit', () => database.close());
