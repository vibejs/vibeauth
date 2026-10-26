import { writeFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { createSaasAuth } from './auth.ts';

const { auth, database } = createSaasAuth();
try {
  const plan = await getMigrations(auth.options);
  const project =
    'CREATE TABLE IF NOT EXISTS project (id TEXT PRIMARY KEY, name TEXT NOT NULL, organizationId TEXT NOT NULL REFERENCES organization(id), createdBy TEXT NOT NULL REFERENCES user(id));';
  await writeFile('migration.sql', `${await plan.compileMigrations()}\n${project}\n`);
  if (process.argv.includes('--apply')) {
    await plan.runMigrations();
    database.exec(project);
  } else
    console.info(
      'Wrote migration.sql including enabled plugin schema. Review, back up, then run migrate --apply.',
    );
} finally {
  database.close();
}
