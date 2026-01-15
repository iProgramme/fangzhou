
import { db } from './db/index.js';
import { projects } from './db/schema.js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    const sqlClient = postgres(process.env.DATABASE_URL!);
    try {
        const rows = await sqlClient`SELECT id, name, deleted_at FROM projects LIMIT 10;`;
        console.log('Sample data:', rows);
    } catch (error) {
        console.error(error);
    } finally {
        await sqlClient.end();
        process.exit(0);
    }
}
main();
