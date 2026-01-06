
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_E3Ky2GnPtaRO@ep-bold-river-advtcedt-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function fix() {
  console.log('正在修复数据库字段类型...');
  try {
    // 1. 先将 next_plan 的现有内容清空为有效的 JSON 数组字符串，防止转换失败
    await sql`UPDATE projects SET next_plan = '[]' WHERE next_plan IS NULL OR next_plan = '' OR next_plan NOT LIKE '[%';`;
    
    // 2. 强制修改字段类型为 jsonb
    await sql`ALTER TABLE projects ALTER COLUMN next_plan TYPE jsonb USING next_plan::jsonb;`;
    
    console.log('✅ next_plan 字段已成功转换为 JSONB 类型。');
  } catch (e) {
    console.error('❌ 修复失败:', e);
  } finally {
    process.exit();
  }
}

fix();
