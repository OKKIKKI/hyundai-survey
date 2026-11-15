import { authenticateVercelAdmin, adminLoginRequired } from './vercel-admin-auth';
import { createPostgresDatabase } from './postgres-survey-db';

let database: ReturnType<typeof createPostgresDatabase> | undefined;

export const env = {
  ...process.env,
  VERCEL_SURVEY_RUNTIME: true,
  authenticateVercelAdmin,
  adminLoginRequired,
  get DB() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is missing');
    return database ??= createPostgresDatabase(url);
  },
};
