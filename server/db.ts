
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not defined in .env file');
  process.exit(1);
}

// NeonDB requires SSL connection
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for some hosted postgres services usually
  }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
