import { createSaasAuth } from './auth.ts';
import { createSaasApplication } from './application.ts';
const context = createSaasAuth();
const app = await createSaasApplication(context);
app.enableShutdownHooks();
await app.listen(context.config.port, '127.0.0.1');
process.once('exit', () => context.database.close());
