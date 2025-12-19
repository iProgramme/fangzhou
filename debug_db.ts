
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function checkTable() {
  console.log('正在检查数据库中的 users 表结构...');
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    console.log('当前数据库字段列表:');
    columns.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
    
    const hasPassword = columns.some(c => c.column_name === 'password');
    if (hasPassword) {
      console.log('✅ 数据库中存在 password 字段。');
    } else {
      console.log('❌ 数据库中缺失 password 字段！');
    }
  } catch (err) {
    console.error('检查失败:', err);
  } finally {
    await sql.end();
  }
}

checkTable();
