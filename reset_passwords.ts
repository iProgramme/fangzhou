
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function resetPasswords() {
  console.log('正在强制同步数据库用户密码...');
  try {
    // 1. 先为所有账号设置默认密码 123
    await sql`UPDATE users SET password = '123' WHERE password IS NULL OR password = ''`;
    
    // 2. 特别设置 admin 账号密码为 admin
    await sql`UPDATE users SET password = 'admin' WHERE name = 'admin' OR id = 'admin'`;
    
    console.log('✅ 密码同步完成。');
    
    const sample = await sql`SELECT name, password FROM users LIMIT 5`;
    console.log('更新后的示例数据:');
    console.table(sample);
    
  } catch (err) {
    console.error('更新失败:', err);
  } finally {
    await sql.end();
  }
}

resetPasswords();
