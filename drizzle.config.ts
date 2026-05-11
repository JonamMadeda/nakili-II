import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    url: 'postgresql://neondb_owner:npg_NOP7RVE9hfZI@ep-dry-tooth-apt1hm26-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  },
});