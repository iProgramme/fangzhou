
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts', // Schema 文件路径
  out: './drizzle', // 迁移文件输出目录
  dialect: 'postgresql', // 数据库类型
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 数据库连接字符串
  },
});
