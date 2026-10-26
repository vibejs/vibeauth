import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './test/generated/pg-schema.ts',
  out: './test/generated/migrations',
  dialect: 'postgresql',
});
