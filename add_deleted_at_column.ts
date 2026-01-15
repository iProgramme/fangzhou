
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing');
    }

    const sqlClient = postgres(process.env.DATABASE_URL);

    try {
        console.log('Adding deleted_at column to projects table...');
        await sqlClient`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`;
        console.log('Column added successfully.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await sqlClient.end();
        process.exit(0);
    }
}

main();
