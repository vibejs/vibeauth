import { writeFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { createExampleAuth } from './auth.ts';

const { auth, database } = createExampleAuth();
try {
  const plan = await getMigrations(auth.options);
  const sql = await plan.compileMigrations();
  await writeFile('migration.sql', sql);
  if (process.argv.includes('--apply')) await plan.runMigrations();
  else
    console.info('Wrote migration.sql. Review it, back up the database, then run migrate --apply.');
} finally {
  database.close();
}
