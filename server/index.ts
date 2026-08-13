
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { projects, users, operationLogs, systemDictionaries, recordReplies } from '../db/schema.js';
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

// 6. 工作记录回复（扁平式：每人每条记录一条回复，可修改删除）
// 批量获取某个项目+recordType 下所有记录的回复（用于显示回复数量）
app.get('/api/records/:projectId/:recordType/replies', async (req, res) => {
    try {
        const { projectId, recordType } = req.params;
        const replies = await db.query.recordReplies.findMany({
            where: and(
                eq(recordReplies.projectId, projectId),
                eq(recordReplies.recordType, recordType)
            )
        });
        // 按 recordId 分组
        const grouped: Record<string, typeof replies> = {};
        replies.forEach(r => {
            if (!grouped[r.recordId]) grouped[r.recordId] = [];
            grouped[r.recordId].push(r);
        });
        res.json(grouped);
    } catch (error) { res.status(500).json({ error: '获取回复失败' }); }
});

app.get('/api/records/:projectId/:recordType/:recordId/replies', async (req, res) => {
    try {
        const { projectId, recordType, recordId } = req.params;
        const replies = await db.query.recordReplies.findMany({
            where: and(
                eq(recordReplies.projectId, projectId),
                eq(recordReplies.recordType, recordType),
                eq(recordReplies.recordId, recordId)
            )
        });
        res.json(replies);
    } catch (error) { res.status(500).json({ error: '获取回复失败' }); }
});

app.post('/api/records/:projectId/:recordType/:recordId/replies', async (req, res) => {
    try {
        const { projectId, recordType, recordId } = req.params;
        const { userId, userName, content } = req.body;
        if (!content?.trim()) return res.status(400).json({ error: '回复内容不能为空' });

        const existing = await db.query.recordReplies.findFirst({
            where: and(
                eq(recordReplies.projectId, projectId),
                eq(recordReplies.recordType, recordType),
                eq(recordReplies.recordId, recordId),
                eq(recordReplies.userId, userId || '')
            )
        });

        if (existing) {
            const updated = await db.update(recordReplies)
                .set({ content: content.trim(), updatedAt: new Date() })
                .where(eq(recordReplies.id, existing.id))
                .returning();
            return res.json(updated[0]);
        }

        const result = await db.insert(recordReplies).values({
            id: nanoid(10),
            projectId,
            recordType,
            recordId,
            userId: userId || '',
            userName: userName || '匿名',
            content: content.trim()
        }).returning();
        res.json(result[0]);
    } catch (error: any) { res.status(500).json({ error: error.message || '保存回复失败' }); }
});

app.delete('/api/records/:projectId/:recordType/:recordId/replies', async (req, res) => {
    try {
        const { projectId, recordType, recordId } = req.params;
        const { userId } = req.body;
        const conditions = [
            eq(recordReplies.projectId, projectId),
            eq(recordReplies.recordType, recordType),
            eq(recordReplies.recordId, recordId)
        ];
        if (userId) conditions.push(eq(recordReplies.userId, userId));
        await db.delete(recordReplies).where(and(...conditions));
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: '删除回复失败' }); }
});

// AI 上下文缓存（TTL 较短，保证项目数据尽可能实时）
const aiContextCache: Record<string, { data: any, stats: any, timestamp: number }> = {};
const CACHE_TTL = 30 * 1000;

// 5. AI Chat
app.post('/api/ai/chat', async (req, res) => {
  let { messages, apiKey, userRole, userDepartment, userName } = req.body;
  userName = userName || (userRole === 'admin' ? '管理员' : '用户');
  
  // 权限划分：与前端路由保持一致
  // - admin: 可查看全部项目（对应前端所有路由可见）
  // - 非 admin 且有部门: 只能查看本部门项目（对应前端仅显示本部门 GroupProjectManager）
  // - 非 admin 且无部门: 无权查看任何项目（前端会被重定向到"访问受限"，此处同样拒绝，避免越权）
  const isAdmin = userRole === 'admin';
  if (!isAdmin && !userDepartment) {
    return res.status(403).json({ error: '您没有权限查看项目数据' });
  }
  // 兼容部门 slug 与全名两种写法
  if (!isAdmin && userDepartment && DEPT_MAPPING[userDepartment]) {
    userDepartment = DEPT_MAPPING[userDepartment];
  }

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
        if (!isAdmin) {
            conditions.push(eq(projects.department, userDepartment));
        }
        const filteredProjects = await db.query.projects.findMany({
            where: and(...conditions)
        });

        // 加载可见项目的工作记录回复（record_replies），按项目聚合
        let repliesByProject: Record<string, any[]> = {};
        if (filteredProjects.length > 0) {
            const visibleIds = filteredProjects.map(p => p.id);
            const allReplies = await db.query.recordReplies.findMany();
            allReplies.forEach(r => {
                if (!visibleIds.includes(r.projectId)) return; // 只保留可见项目的回复（权限过滤）
                if (!repliesByProject[r.projectId]) repliesByProject[r.projectId] = [];
                // 兼容 drizzle timestamp 解析偏差：created_at 实际存的是毫秒，drizzle 会按秒放大
                let ts = r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt);
                // ts 为毫秒级时间戳（13位）或更大（被放大1000倍）
                if (ts > 1e15) ts = ts / 1000; // 被放大 → 还原为毫秒
                let dateStr = null;
                if (ts && ts > 0) {
                    if (ts > 1e12) ts = ts / 1000; // 若仍是毫秒(13位)转秒
                    dateStr = new Date(ts * 1000).toISOString().slice(0, 10);
                }
                repliesByProject[r.projectId].push({
                    记录类型: r.recordType === 'timeline' ? '工作进展' : '下一步计划',
                    回复人: r.userName,
                    内容: r.content,
                    时间: dateStr
                });
            });
        }

        // 判断项目归属年份：与前端 Dashboard 的过滤逻辑保持一致 (App.tsx filteredSafeProjects)
        const belongsToYear = (p: any, year: number): boolean => {
            const annualData = Array.isArray(p.annualData) ? p.annualData : [];
            const collectionPlan = Array.isArray(p.collectionPlan) ? p.collectionPlan : [];
            const hasNoYearInfo = annualData.length === 0 && !p.signingDate && !p.estimatedSignYear && collectionPlan.length === 0;
            if (hasNoYearInfo) return true; // 无任何年份信息的项目视为属于所有年份
            const hasYearlyData = annualData.some((d: any) => Number(d.year) === year);
            const hasCollectionPlan = collectionPlan.some((d: any) => Number(d.year) === year);
            const isEarlyThisYear = p.stage === '前期项目跟进' && String(p.estimatedSignYear) === String(year);
            const signedThisYear = p.signingDate?.startsWith(String(year));
            return hasYearlyData || hasCollectionPlan || isEarlyThisYear || signedThisYear;
        };

        // 汇总各年份
        const yearSet = new Set<number>();
        filteredProjects.forEach((p: any) => {
            (Array.isArray(p.annualData) ? p.annualData : []).forEach((d: any) => { if (d.year) yearSet.add(Number(d.year)); });
            (Array.isArray(p.collectionPlan) ? p.collectionPlan : []).forEach((d: any) => { if (d.year) yearSet.add(Number(d.year)); });
            const esy = Number(p.estimatedSignYear);
            if (!Number.isNaN(esy) && esy > 2000 && esy < 2100) yearSet.add(esy);
            const sd = p.signingDate;
            if (sd && /^\d{4}/.test(sd)) yearSet.add(Number(sd.slice(0, 4)));
        });
        const years = Array.from(yearSet).sort((a, b) => a - b);
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) years.push(currentYear);
        if (!years.includes(currentYear + 1)) years.push(currentYear + 1);

        // 阶段中文名映射
        const stageLabel = (s: string): string => {
            switch (s) {
                case '前期项目跟进': return '前期';
                case '各组项目列表及进度': return '进行中';
                case '年度收款计划': return '收款计划';
                case '已完成项目': return '已完成';
                default: return s || '未知';
            }
        };

        // 按部门 × 阶段 × 年份 统计
        const departments = Array.from(new Set(filteredProjects.map(p => p.department).filter(Boolean)));
        const deptYearStageStats: Record<string, Record<string, Record<string, number>>> = {};
        const deptStageStats: Record<string, Record<string, number>> = {};

        departments.forEach(dept => {
            const deptProjects = filteredProjects.filter(p => p.department === dept);
            deptStageStats[dept] = {};
            deptYearStageStats[dept] = {};
            years.forEach(y => {
                deptYearStageStats[dept][String(y)] = { 前期: 0, 进行中: 0, 已完成: 0, 收款计划: 0, 合计: 0 };
            });
            deptProjects.forEach(p => {
                const stage = stageLabel(p.stage);
                deptStageStats[dept][stage] = (deptStageStats[dept][stage] || 0) + 1;
                years.forEach(y => {
                    if (belongsToYear(p, y)) {
                        deptYearStageStats[dept][String(y)][stage] += 1;
                        deptYearStageStats[dept][String(y)]['合计'] += 1;
                    }
                });
            });
        });

        // 部门全名 → 常用简称，方便 AI 理解 "综合组"
        const deptAlias: Record<string, string> = {};
        departments.forEach(d => {
            const short = d.replace(/（.*）/, '组').replace(/组$/, '');
            deptAlias[d] = short;
        });

        // ===== 统计画像：各维度分布（全量 + 按年份）=====
        // 通用维度聚合函数：返回 { 维度值: 计数 }，可叠加年份过滤
        const countByDimension = (field: keyof typeof filteredProjects[number] | 'stage', yearFilter?: number) => {
            const result: Record<string, number> = {};
            filteredProjects.forEach(p => {
                if (yearFilter !== undefined && !belongsToYear(p, yearFilter)) return;
                const v = (p as any)[field];
                if (!v) return;
                result[v] = (result[v] || 0) + 1;
            });
            return result;
        };

        // 按年份的维度分布
        const dimByYear = (field: string) => {
            const result: Record<string, Record<string, number>> = {};
            years.forEach(y => {
                result[String(y)] = countByDimension(field as any, y);
            });
            return result;
        };

        // 各维度全量分布
        const dimensionDistributions = {
            按地区分布: countByDimension('region'),
            按项目类别分布: countByDimension('category'),
            按项目来源分布: countByDimension('source'),
            按三审类型分布: countByDimension('threeReviewType'),
            按收款等级分布: countByDimension('paymentLevel'),
            按前期类型分布: countByDimension('preliminaryType'),
            按状态灯分布: countByDimension('statusLight'),
            按是否靠谱分布: countByDimension('remarks'),
            按项目类型分布: countByDimension('type')
        };

        // 各年份的维度分布（用于回答"2026年有多少个花东的项目"这类问题）
        const dimensionByYearDistributions = {
            按地区分布_按年份: dimByYear('region'),
            按项目类别分布_按年份: dimByYear('category'),
            按项目来源分布_按年份: dimByYear('source'),
            按三审类型分布_按年份: dimByYear('threeReviewType'),
            按收款等级分布_按年份: dimByYear('paymentLevel'),
            按前期类型分布_按年份: dimByYear('preliminaryType'),
            按状态灯分布_按年份: dimByYear('statusLight'),
            按是否靠谱分布_按年份: dimByYear('remarks')
        };

        // 各年份财务汇总
        const financeByYear: Record<string, { 合同额: number, 已收款: number, 计划收款: number }> = {};
        years.forEach(y => {
            let contract = 0, collected = 0, planned = 0;
            filteredProjects.forEach(p => {
                if (!belongsToYear(p, y)) return;
                const ad = Array.isArray(p.annualData) ? p.annualData : [];
                const cp = Array.isArray(p.collectionPlan) ? p.collectionPlan : [];
                const yearData = ad.find((d: any) => Number(d.year) === y);
                if (yearData) {
                    contract += Number(yearData.contractAmount) || 0;
                    collected += Number(yearData.collectedAmount) || 0;
                }
                cp.filter((d: any) => Number(d.year) === y).forEach((d: any) => {
                    planned += Number(d.amount) || 0;
                });
            });
            financeByYear[String(y)] = { 合同额: contract, 已收款: collected, 计划收款: planned };
        });

        // 状态灯在各阶段的分布（用于回答"哪个进行中项目是红灯"）
        const statusLightByStage: Record<string, Record<string, number>> = {};
        filteredProjects.forEach(p => {
            const stage = stageLabel(p.stage);
            if (!statusLightByStage[stage]) statusLightByStage[stage] = {};
            const light = p.statusLight || 'green';
            statusLightByStage[stage][light] = (statusLightByStage[stage][light] || 0) + 1;
        });

        stats = {
            数据权限范围: isAdmin ? '全部项目' : `仅${userDepartment}的项目`,
            全部项目总数: filteredProjects.length,
            按部门各阶段统计: deptStageStats,
            按部门按年份各阶段统计: deptYearStageStats,
            部门简称对照: deptAlias,
            可选年份: years,
            已完成项目: filteredProjects.filter(p => p.stage === '已完成项目').length,
            前期项目跟进: filteredProjects.filter(p => p.stage === '前期项目跟进').length,
            年度收款计划: filteredProjects.filter(p => p.stage === '年度收款计划').length,
            进行中项目: filteredProjects.filter(p => p.stage === '各组项目列表及进度').length,
            总合同额: filteredProjects.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
            已收款总额: filteredProjects.reduce((sum, p) => sum + (p.collectedAmount || 0), 0),
            ...dimensionDistributions,
            ...dimensionByYearDistributions,
            各年份财务汇总: financeByYear,
            各阶段状态灯分布: statusLightByStage
        };

        // 精简项目明细（控制 token 量，统计画像已覆盖数量类问题）
        projectContext = filteredProjects.map(p => {
            const annualData = Array.isArray(p.annualData) ? p.annualData : [];
            const collectionPlan = Array.isArray(p.collectionPlan) ? p.collectionPlan : [];
            // 预计算该项目归属的年份（与前端 belongsToYear 逻辑一致）
            const ownedYears = years.filter(y => belongsToYear(p, y));
            return {
                id: p.id,
                项目名称: p.name, 
                阶段: stageLabel(p.stage), 
                部门: p.department, 
                地区: p.region || null, 
                项目类别: p.category || null, 
                项目来源: p.source || null, 
                负责人: p.responsiblePerson, 
                合同总额: p.totalAmount, 
                已收款: p.collectedAmount,
                状态灯: p.statusLight || null,
                是否靠谱: p.remarks || null,
                归属年份: ownedYears, // 该项目被统计到哪些年份（无年份信息的项目视为属于所有年份）
                年度数据: annualData.map((d: any) => ({ 年份: d.year, 合同额: d.contractAmount, 收款额: d.collectedAmount })),
                收款计划: collectionPlan.map((d: any) => ({ 年份: d.year, 月份: d.month, 金额: d.amount, 已完成: d.completed })),
                工作记录回复: repliesByProject[p.id] || []
            };
        });
        
        aiContextCache[cacheKey] = { data: projectContext, stats, timestamp: Date.now() };
    }
    
    // ===== 对话上下文提取：从历史消息中识别用户已建立的筛选条件 =====
    // 目的：后续问题（如"合同额高于100万的有哪几个"）应继承前文范围（如"2026年进行中项目"），
    // 而不是重新对全部项目统计。此处把已确认的条件显式注入 prompt，帮助 AI 保持上下文。
    const stageNameMap: Record<string, string> = {
        '前期': '前期', '前期项目跟进': '前期', '前期项目': '前期',
        '进行中': '进行中', '各组项目列表及进度': '进行中', '进度中': '进行中', '在办': '进行中',
        '已完成': '已完成', '已完成项目': '已完成', '完成': '已完成', '结项': '已完成',
        '收款计划': '收款计划', '年度收款计划': '收款计划', '计划收款': '收款计划'
    };
    const yearRe = /(20\d{2})\s*年/;
    const detectContextFromMessages = () => {
        const ctx: { 年份?: number, 阶段?: string, 部门?: string, 地区?: string, 类别?: string, 来源?: string } = {};
        if (!Array.isArray(messages)) return ctx;
        for (const m of messages) {
            if (m.role !== 'user' || typeof m.content !== 'string') continue;
            const text = m.content;
            // 年份：支持 "2026年" "2026 年" "今年" "明年" 等
            const ym = text.match(yearRe);
            if (ym) ctx.年份 = Number(ym[1]);
            if (/今年/.test(text) && !ctx.年份) ctx.年份 = new Date().getFullYear();
            if (/明年/.test(text) && !ctx.年份) ctx.年份 = new Date().getFullYear() + 1;
            // 阶段
            for (const [k, v] of Object.entries(stageNameMap)) {
                if (text.includes(k)) { ctx.阶段 = v; break; }
            }
            // 部门：优先匹配含括号的全名，再匹配简称（如"规划二组"→"规划二组（润新）"）
            const deptAliasMap = (stats && stats['部门简称对照']) as Record<string, string> | undefined;
            const fullNames = deptAliasMap ? Object.keys(deptAliasMap) : [];
            for (const d of fullNames) {
                if (text.includes(d)) { ctx.部门 = d; break; }
            }
            if (!ctx.部门 && deptAliasMap) {
                for (const [fullName, short] of Object.entries(deptAliasMap)) {
                    if (short && short !== fullName && text.includes(short)) { ctx.部门 = fullName; break; }
                }
            }
            // 地区/类别/来源：从统计画像的取值中匹配
            const regionValues = stats['按地区分布'] ? Object.keys(stats['按地区分布']) : [];
            for (const r of regionValues) { if (text.includes(r)) { ctx.地区 = r; break; } }
            const catValues = stats['按项目类别分布'] ? Object.keys(stats['按项目类别分布']) : [];
            for (const c of catValues) { if (text.includes(c)) { ctx.类别 = c; break; } }
            const srcValues = stats['按项目来源分布'] ? Object.keys(stats['按项目来源分布']) : [];
            for (const s of srcValues) { if (text.includes(s)) { ctx.来源 = s; break; } }
        }
        return ctx;
    };
    const convCtx = detectContextFromMessages();
    const convCtxLines: string[] = [];
    if (convCtx.年份) convCtxLines.push(`年份: ${convCtx.年份}年`);
    if (convCtx.阶段) convCtxLines.push(`项目阶段: ${convCtx.阶段}`);
    if (convCtx.部门) convCtxLines.push(`部门: ${convCtx.部门}`);
    if (convCtx.地区) convCtxLines.push(`地区: ${convCtx.地区}`);
    if (convCtx.类别) convCtxLines.push(`项目类别: ${convCtx.类别}`);
    if (convCtx.来源) convCtxLines.push(`项目来源: ${convCtx.来源}`);
    
    const systemPrompt = {
        role: "system",
        content: `你是“方舟助手”，${userName}的项目管理智能助手。
你回答中涉及项目的一切内容，必须严格基于以下【数据库实时摘要】和【项目明细数据】——这些数据是刚刚从数据库实际查询出来的结果。绝对禁止编造、猜测或凭常识推断任何项目数据。

=== 当前用户与权限 ===
- 当前登录用户：${userName}
- 用户角色：${isAdmin ? '管理员' : '普通用户'}
- 数据权限范围：${isAdmin ? '可以查看全部项目、全部部门的工作动态与回复、用户信息与操作日志' : `只能查看${userDepartment}这一个部门的项目及其工作动态/回复`}
- 规则：普通用户若询问其他部门、全公司范围、用户管理、操作日志等越权内容，必须明确回复"您没有权限查看该数据"，不得编造。

${convCtxLines.length > 0 ? `=== 当前对话已确认的筛选范围（非常重要，后续问题必须继承） ===
本次对话中，用户已经在前面的提问里确认了以下筛选条件：
${convCtxLines.map(l => `- ${l}`).join('\n')}

规则：用户后续的问题（例如"合同额高于100万的有哪几个"、"哪些是花东的"、"其中几个已完成"等）都是基于上述筛选范围的**进一步筛选**，必须在这个范围内回答，不要扩大到全部项目。除非用户明确说"全部""所有""换个范围"等改变范围的表述。` : ''}
【数据库实时摘要】(这是权威统计数值，任何数量、金额类问题必须直接引用，禁止自行从明细计数):
${JSON.stringify(stats, null, 2)}

【项目明细数据】:
${JSON.stringify(projectContext)}

字段含义说明:
- 阶段: 前期 / 进行中 / 已完成 / 收款计划
- 地区: 项目所在区域（花东、狮岭、全区 等）; 项目类别: 业务类型（法定详细规划、微改造 等）; 项目来源: 委托方（村委会/经济社、私营企业 等）
- 归属年份: 该项目属于哪些年份（依据年度数据/收款计划/预计签约年份/签订日期；无任何年份信息的项目视为属于所有年份）。筛选某年项目时直接看该年份是否在"归属年份"中
- 状态灯: red光表示红灯(需关注), yellow光黄灯, green光正常, white光白灯
- 是否靠谱: 前期项目的靠谱程度（靠谱/一般/先跟进 等）
- 工作进展记录 / 下一步计划: 项目的时间线和计划事项
- 工作记录回复: 各人对工作记录的回复内容

统计口径说明:
- 摘要中的"按部门各阶段统计"= {部门: {阶段: 数量}}; "按部门按年份各阶段统计"= {部门: {年份: {阶段: 数量}}}
- "${'按地区分布'}"等维度分布 = {维度值: 数量}; 对应"${'按地区分布_按年份'}"等 = {年份: {维度值: 数量}}
- "各年份财务汇总" = {年份: {合同额, 已收款, 计划收款}}

回答规则:
0. 【上下文继承最重要】若"当前对话已确认的筛选范围"非空，则用户后续问题都是在该范围内的进一步筛选，必须在该范围内回答，严禁扩大到全部项目。例如：用户先问"2026年进行中项目"得出范围，再问"合同额高于100万的有哪几个"，应从这些进行中项目里筛，而不是对全部项目筛。除非用户明确改变范围（如说"全部""所有""换个年份"）。
1. 数量/金额类问题必须直接从摘要统计中取数，严禁自行数明细，更不得捏造。
2. 部门简称（如"综合组"）先用"部门简称对照"映射到全名（如"综合组（汤、黄）"）再查。
3. 按"年份/地区/类别/来源/阶段/状态灯"等筛选具体项目时，依据明细中每个项目的对应字段逐个筛选并列出。
4. 询问具体项目信息（负责人/金额/进展/下一步计划/工作记录回复等）时，到明细中查找；查不到就答"数据库中未找到相关信息"。
5. 询问统计分布（如"2026年花东有多少项目""法定详细规划有几个"）时，优先从对应维度分布统计中取数。
6. 越权数据一律拒绝并说明无权限。
7. 始终专业、准确、客观; 严禁捏造; 使用 Markdown 增强展示。`
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
