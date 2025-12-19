
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../db';
import { projects, users, operationLogs, systemDictionaries } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- 映射定义 (英文参数 -> 数据库中文值) ---
const STAGE_MAPPING: Record<string, string> = {
  'early': '前期项目跟进',
  'collection': '年度收款计划',
  'progress': '各组项目列表及进度',
  'completed': '已完成项目'
};

const DEPT_MAPPING: Record<string, string> = {
  'comprehensive': '综合组（汤、黄）',
  'municipal': '市政组（大汤）',
  'traffic': '交通组（任）',
  'planning-1': '规划一组（邝）',
  'planning-2': '规划二组（润新）',
  'planning-3': '规划三组（胡）',
  'planning-4': '规划四组（秀明）',
  'design': '前期和城市设计组（林）',
  'renewal': '城市更新组（利）'
};

// --- 路由定义 ---

// 1. 项目 (Projects)
// 获取所有项目
app.get('/api/projects', async (req, res) => {
  try {
    let { stage, department } = req.query;
    const conditions = [];
    
    // 映射英文参数到中文值
    if (stage && typeof stage === 'string' && STAGE_MAPPING[stage]) {
        stage = STAGE_MAPPING[stage];
    }
    
    if (department && typeof department === 'string' && DEPT_MAPPING[department]) {
        department = DEPT_MAPPING[department];
    }
    
    if (stage) conditions.push(eq(projects.stage, stage as string));
    if (department) conditions.push(eq(projects.department, department as string));

    const allProjects = await db.query.projects.findMany({
        orderBy: [desc(projects.updatedAt)],
        where: conditions.length > 0 ? and(...conditions) : undefined
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
    const allUsers = await db.query.users.findMany({
        // 显式指定返回字段，不返回 password
        columns: {
            id: true,
            name: true,
            role: true,
            department: true,
            email: true,
            status: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.json(allUsers);
  } catch (error) {
    console.error('获取用户失败:', error);
    res.status(500).json({ error: '获取用户失败' });
  }
});

// --- 认证接口 (Auth) ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.name, username)
        });

        if (user && user.password === password) {
            if (user.status !== 'active') {
                return res.status(403).json({ error: '账号已被禁用' });
            }
            // 返回脱敏后的用户信息
            const { password: _, ...userInfo } = user;
            res.json(userInfo);
        } else {
            res.status(401).json({ error: '用户名或密码错误' });
        }
    } catch (error) {
        res.status(500).json({ error: '登录验证失败' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = { 
            ...req.body, 
            id: req.body.id || nanoid(8),
            password: req.body.password || '123' // 默认密码
        };
        const result = await db.insert(users).values(newUser).returning();
        res.json(result[0]);
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ error: '创建用户失败' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 严格排除非数据库字段和只读字段
        const { id: _, createdAt, updatedAt, ...rest } = req.body;
        
        // 确保只包含 schema 中定义的合法字段
        const allowedFields = ['name', 'password', 'role', 'department', 'email', 'status'];
        const cleanData = Object.keys(rest)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = rest[key];
                return obj;
            }, {} as any);

        const result = await db.update(users)
            .set({ ...cleanData, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
            
        if (result.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(result[0]);
    } catch (error) {
        console.error('更新用户失败详情 (Full Stack):', error);
        res.status(500).json({ error: '更新用户失败: ' + (error instanceof Error ? error.message : String(error)) });
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

