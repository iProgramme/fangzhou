
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../db';
import { projects, users, operationLogs, systemDictionaries } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- 路由定义 ---

// 1. 项目 (Projects)
// 获取所有项目
app.get('/api/projects', async (req, res) => {
  try {
    const allProjects = await db.query.projects.findMany({
        orderBy: [desc(projects.updatedAt)]
    });
    res.json(allProjects);
  } catch (error) {
    console.error('获取项目失败:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

// 创建新项目
app.post('/api/projects', async (req, res) => {
  try {
    const newProject = { ...req.body, id: req.body.id || nanoid(10) };
    const result = await db.insert(projects).values(newProject).returning();
    
    // 记录日志
    await db.insert(operationLogs).values({
        id: nanoid(),
        userId: 'u-001', // 暂时使用模拟用户
        userName: 'Admin',
        action: 'CREATE',
        targetType: 'PROJECT',
        targetId: result[0].id,
        details: `创建项目: ${result[0].name}`,
        timestamp: new Date()
    });

    res.json(result[0]);
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 更新项目
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.update(projects)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
      
    if (result.length > 0) {
        await db.insert(operationLogs).values({
            id: nanoid(),
            userId: 'u-001',
            userName: 'Admin',
            action: 'UPDATE',
            targetType: 'PROJECT',
            targetId: id,
            details: `更新项目: ${result[0].name}`,
            timestamp: new Date()
        });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 删除项目
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // 获取项目名称用于日志
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, id)
    });

    await db.delete(projects).where(eq(projects.id, id));

    if (project) {
        await db.insert(operationLogs).values({
            id: nanoid(),
            userId: 'u-001',
            userName: 'Admin',
            action: 'DELETE',
            targetType: 'PROJECT',
            targetId: id,
            details: `删除项目: ${project.name}`,
            timestamp: new Date()
        });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 2. 用户 (Users)
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany();
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: '获取用户失败' });
  }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = { ...req.body, id: req.body.id || nanoid(8) };
        const result = await db.insert(users).values(newUser).returning();
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: '创建用户失败' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.update(users).set(req.body).where(eq(users.id, id)).returning();
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: '更新用户失败' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.delete(users).where(eq(users.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 3. 字典 (Dictionaries)
app.get('/api/dictionaries', async (req, res) => {
  try {
    const allDicts = await db.query.systemDictionaries.findMany();
    // 转换为对象映射格式
    const dictMap = allDicts.reduce((acc, curr) => {
        acc[curr.key] = curr.items;
        return acc;
    }, {});
    res.json(dictMap);
  } catch (error) {
    res.status(500).json({ error: '获取字典失败' });
  }
});

app.post('/api/dictionaries', async (req, res) => {
  try {
    const { key, items } = req.body;
    // 存在则更新，不存在则插入 (Upsert)
    const existing = await db.query.systemDictionaries.findFirst({ where: eq(systemDictionaries.key, key) });
    
    let result;
    if (existing) {
        result = await db.update(systemDictionaries)
            .set({ items, updatedAt: new Date() })
            .where(eq(systemDictionaries.key, key))
            .returning();
    } else {
        result = await db.insert(systemDictionaries)
            .values({ key, items })
            .returning();
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新字典失败' });
  }
});

// 4. 日志 (Logs)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.query.operationLogs.findMany({
        orderBy: [desc(operationLogs.timestamp)],
        limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: '获取日志失败' });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
