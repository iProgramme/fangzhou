
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { projects, users, operationLogs, systemDictionaries } from '../db/schema.js';
import { eq, desc, and, isNull, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Theme API ---
app.get('/api/themes/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const pathsToTry = [
            path.join(__dirname, '..', 'styles', `${id}.css`),
            path.join(process.cwd(), 'styles', `${id}.css`),
            path.join(process.cwd(), 'fangzhou', 'styles', `${id}.css`)
        ];
        let css = null;
        for (const p of pathsToTry) {
            try { css = await fs.readFile(p, 'utf-8'); if (css) break; } catch (e) {}
        }
        if (css) res.send(css); else res.status(404).send('主题文件未找到');
    } catch (e) { res.status(500).send('内部服务器错误'); }
});

const STAGE_MAPPING: Record<string, string> = { 'early': '前期项目跟进', 'collection': '年度收款计划', 'progress': '各组项目列表及进度', 'completed': '已完成项目' };
const DEPT_MAPPING: Record<string, string> = { 'comprehensive': '综合组（汤、黄）', 'municipal': '市政组（大汤）', 'traffic': '交通组（任）', 'planning-1': '规划一组（邝）', 'planning-2': '规划二组（润新）', 'planning-3': '规划三组（胡）', 'planning-4': '规划四组（秀明）', 'design': '前期和城市设计组（林）', 'renewal': '城市更新组（利）' };

// 1. 项目
app.get('/api/projects', async (req, res) => {
  try {
    let { stage, department, deleted } = req.query;
    const conditions = [];
    
    // Improved logic: 
    // If deleted=true, only show deleted projects.
    // If not, only show non-deleted projects (where deletedAt is null).
    if (deleted === 'true') {
        conditions.push(isNotNull(projects.deletedAt));
    } else {
        conditions.push(isNull(projects.deletedAt));
    }

    if (stage && typeof stage === 'string' && STAGE_MAPPING[stage]) stage = STAGE_MAPPING[stage];
    if (department && typeof department === 'string' && DEPT_MAPPING[department]) department = DEPT_MAPPING[department];
    
    if (stage) conditions.push(eq(projects.stage, stage as string));
    if (department) conditions.push(eq(projects.department, department as string));
    
    const data = await db.query.projects.findMany({ 
        orderBy: [desc(projects.updatedAt)], 
        where: conditions.length > 0 ? and(...conditions) : undefined 
    });
    res.json(data);
  } catch (error) { res.status(500).json({ error: '获取项目失败' }); }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, deletedAt, ...projectData } = req.body;
    const newProject = { ...projectData, id: id || nanoid(10), deletedAt: null };
    const result = await db.insert(projects).values(newProject).returning();
    res.json(result[0]);
  } catch (error: any) { 
    console.error('Create Project Error:', error);
    res.status(500).json({ error: error.message || '创建项目失败' }); 
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, deletedAt, ...updateData } = req.body;
    // Ensure nested JSON objects are handled correctly by Drizzle
    const result = await db.update(projects)
      .set({ 
        ...updateData, 
        updatedAt: new Date() 
      })
      .where(eq(projects.id, req.params.id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: '项目未找到' });
    }
    res.json(result[0]);
  } catch (error: any) { 
    console.error('Update Project Error Details:', error);
    res.status(500).json({ error: error.message || '更新项目失败' }); 
  }
});

app.post('/api/projects/:id/restore', async (req, res) => {
    try {
        const result = await db.update(projects)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(projects.id, req.params.id))
            .returning();
        res.json(result[0]);
    } catch (error) { res.status(500).json({ error: '恢复项目失败' }); }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    // Soft delete
    await db.update(projects)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: '删除项目失败' }); }
});

app.delete('/api/projects/:id/permanent', async (req, res) => {
    try {
        await db.delete(projects).where(eq(projects.id, req.params.id));
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: '永久删除项目失败' }); }
});

// 2. 用户
app.get('/api/users', async (req, res) => {
  try {
    const data = await db.query.users.findMany({ columns: { id: true, name: true, role: true, department: true, email: true, status: true, createdAt: true, updatedAt: true } });
    res.json(data);
  } catch (error) { res.status(500).json({ error: '获取用户失败' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.query.users.findFirst({ where: eq(users.name, username) });
    if (user && user.password === password) {
        const { password: _, ...info } = user;
        res.json(info);
    } else res.status(401).json({ error: '用户名或密码错误' });
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, password, role, department, email, status } = req.body;
    
    if (!name || !role) {
        return res.status(400).json({ error: '姓名和角色是必填项' });
    }

    const newUser = {
        id: nanoid(10),
        name,
        password: password || '123',
        role,
        department,
        email,
        status: status || 'active'
    };

    const result = await db.insert(users).values(newUser).returning();
    res.json(result[0]);
  } catch (error: any) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: error.message || '创建用户失败' });
  }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id, createdAt, updatedAt, ...updateData } = req.body;
        // If password is empty or not provided, remove it from updateData to prevent overwriting
        if (!updateData.password || !updateData.password.trim()) {
            delete updateData.password;
        }
        
        const result = await db.update(users)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(users.id, req.params.id))
            .returning();
        res.json(result[0]);
    } catch (error: any) { 
        console.error('Update User Error:', error);
        res.status(500).json({ error: error.message || '更新用户失败' }); 
    }
});

// 3. 字典与日志
app.get('/api/dictionaries', async (req, res) => {
    const data = await db.query.systemDictionaries.findMany();
    res.json(data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.items }), {}));
});

app.post('/api/dictionaries', async (req, res) => {
    const { key, items } = req.body;
    const existing = await db.query.systemDictionaries.findFirst({ where: eq(systemDictionaries.key, key) });
    let result = existing 
        ? await db.update(systemDictionaries).set({ items, updatedAt: new Date() }).where(eq(systemDictionaries.key, key)).returning()
        : await db.insert(systemDictionaries).values({ key, items }).returning();
    res.json(result[0]);
});

// 新增: 工作记录汇总接口
app.get('/api/work-summary', async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;
        
        const conditions = [isNull(projects.deletedAt)];
        if (department && typeof department === 'string' && DEPT_MAPPING[department]) {
            conditions.push(eq(projects.department, DEPT_MAPPING[department]));
        }

        const allProjects = await db.query.projects.findMany({
            where: and(...conditions),
            columns: {
                id: true,
                name: true,
                timeline: true,
                nextPlan: true,
                responsiblePerson: true,
                department: true
            }
        });

        interface TimelineEvent {
            id: string;
            date: string;
            title: string;
            description: string;
            type: string;
            completed?: boolean;
            completedAt?: string;
        }

        const allRecords: any[] = [];

        allProjects.forEach(p => {
            // 处理 timeline (重要工作记录)
            if (Array.isArray(p.timeline)) {
                (p.timeline as unknown as TimelineEvent[]).forEach(t => {
                    if ((!startDate || t.date >= (startDate as string)) && (!endDate || t.date <= (endDate as string))) {
                        allRecords.push({
                            ...t,
                            projectId: p.id,
                            projectName: p.name,
                            projectResponsible: p.responsiblePerson,
                            projectDepartment: p.department,
                            recordType: 'record' // 标记为记录
                        });
                    }
                });
            }

            // 处理 nextPlan (工作计划)
            if (Array.isArray(p.nextPlan)) {
                (p.nextPlan as unknown as TimelineEvent[]).forEach(t => {
                    if ((!startDate || t.date >= (startDate as string)) && (!endDate || t.date <= (endDate as string))) {
                        allRecords.push({
                            ...t,
                            projectId: p.id,
                            projectName: p.name,
                            projectResponsible: p.responsiblePerson,
                            projectDepartment: p.department,
                            recordType: 'plan' // 标记为计划
                        });
                    }
                });
            }
        });

        // 按日期倒序排序
        allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(allRecords);
    } catch (error: any) {
        console.error('Fetch Work Summary Error:', error);
        res.status(500).json({ error: '获取工作汇总失败' });
    }
});

app.get('/api/logs', async (req, res) => {
    const logs = await db.query.operationLogs.findMany({ orderBy: [desc(operationLogs.timestamp)], limit: 100 });
    res.json(logs);
});

// AI 上下文缓存
const aiContextCache: Record<string, { data: any, stats: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

// 5. AI Chat
app.post('/api/ai/chat', async (req, res) => {
  let { messages, apiKey, userRole, userDepartment } = req.body;
  
  if (!apiKey) return res.status(400).json({ error: '未配置 API Key' });

  try {
    apiKey = Buffer.from(apiKey, 'base64').toString();
    const cacheKey = `${userRole}_${userDepartment}`;
    let projectContext;
    let stats;

    if (aiContextCache[cacheKey] && (Date.now() - aiContextCache[cacheKey].timestamp < CACHE_TTL)) {
        projectContext = aiContextCache[cacheKey].data;
        stats = aiContextCache[cacheKey].stats;
    } else {
        const conditions = [isNull(projects.deletedAt)]; // Exclude deleted projects
        if (userRole !== 'admin' && userDepartment) {
            conditions.push(eq(projects.department, userDepartment));
        }
        const filteredProjects = await db.query.projects.findMany({
            where: and(...conditions)
        });

        stats = {
            总计: filteredProjects.length,
            已完成项目: filteredProjects.filter(p => p.stage === '已完成项目').length,
            前期项目跟进: filteredProjects.filter(p => p.stage === '前期项目跟进').length,
            年度收款计划: filteredProjects.filter(p => p.stage === '年度收款计划').length,
            进度中项目: filteredProjects.filter(p => p.stage === '各组项目列表及进度').length,
            总合同额: filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
            已收款总额: filteredProjects.reduce((sum, p) => sum + (p.collectedAmount || 0), 0)
        };

        projectContext = filteredProjects.map(p => ({
            id: p.id,
            名称: p.name, 
            阶段: p.stage, 
            部门: p.department, 
            负责人: p.responsiblePerson, 
            金额: p.totalAmount, 
            已收款: p.collectedAmount,
            进展: p.workProgress 
        }));
        
        aiContextCache[cacheKey] = { data: projectContext, stats, timestamp: Date.now() };
    }
    
    const systemPrompt = {
        role: "system",
        content: `你是一个名为“方舟助手”的专业项目管理专家。
你的回答必须始终基于以下提供的【实时数据库摘要】和【明细数据】：

【数据库实时摘要】(这是权威统计数值，请优先参考):
${JSON.stringify(stats, null, 2)}

【项目明细数据】:
${JSON.stringify(projectContext)}

字段说明:
- stage: 项目阶段。'已完成项目'即代表项目已结项。
- totalAmount: 合同总额。
- collectedAmount: 已收款金额。

规则:
1. 当用户询问数量或总额时，请优先参考【数据库实时摘要】。
2. 始终以专业、准确、客观的态度回答。
3. 严禁捏造不存在的数据。
4. 使用 Markdown 格式增强展示。`
    };

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [systemPrompt, ...messages]
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json(data.choices[0].message);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI 助手响应出错' });
  }
});

// Export app for Vercel
// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing: return index.html for any unknown routes
app.use((req, res) => {
  // Check if the request accepts html, otherwise it might be a missing API endpoint
  if (req.accepts('html')) {
    res.sendFile(path.resolve(__dirname, '../dist/index.html'));
  } else {
    // If it's an API call that wasn't matched, return 404
    res.status(404).json({ error: 'Not Found' });
  }
});

export default app;

// Only start server if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
