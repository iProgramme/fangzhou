
import { INITIAL_DICTIONARIES, MOCK_PROJECTS, MOCK_USERS, INITIAL_LOGS } from './services/mockData';
import { db } from './db';
import { projects, users, systemDictionaries, operationLogs } from './db/schema';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('开始初始化数据库种子数据...');

  // 1. 初始化字典
  for (const [key, items] of Object.entries(INITIAL_DICTIONARIES)) {
    await db.insert(systemDictionaries).values({
        key,
        items
    }).onConflictDoNothing();
  }
  console.log('字典数据初始化完成');

  // 2. 初始化用户
  for (const user of MOCK_USERS) {
    await db.insert(users).values(user).onConflictDoNothing();
  }
  console.log('用户数据初始化完成');

  // 3. 初始化项目
  for (const project of MOCK_PROJECTS) {
    const p = { ...project };
    // 确保有 ID
    if (!p.id) p.id = nanoid();
    
    await db.insert(projects).values(p).onConflictDoNothing();
  }
  console.log('项目数据初始化完成');
  
  // 4. 初始化日志
  for (const log of INITIAL_LOGS) {
      await db.insert(operationLogs).values(log).onConflictDoNothing();
  }
  console.log('日志数据初始化完成');

  console.log('所有种子数据初始化成功！');
  process.exit(0);
}

seed().catch(err => {
  console.error('种子数据初始化失败:', err);
  process.exit(1);
});
