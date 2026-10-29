import { Pool, neonConfig } from '@neondatabase/serverless';

// Vercel Serverless environment connection pool
const connectionString = process.env.DATABASE_URL;

export const pool = connectionString 
  ? new Pool({ connectionString }) 
  : null;

export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured in Environment Variables.");
  }
  return await pool.query(text, params);
}
