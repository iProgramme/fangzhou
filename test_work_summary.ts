
import { db } from './db/index.js';
import { projects } from './db/schema.js';
import { isNull, and, eq } from 'drizzle-orm';

const STAGE_MAPPING: Record<string, string> = { 'early': '前期项目跟进', 'collection': '年度收款计划', 'progress': '各组项目列表及进度', 'completed': '已完成项目' };
const DEPT_MAPPING: Record<string, string> = { 'comprehensive': '综合组（汤、黄）', 'municipal': '市政组（大汤）', 'traffic': '交通组（任）', 'planning-1': '规划一组（邝）', 'planning-2': '规划二组（润新）', 'planning-3': '规划三组（胡）', 'planning-4': '规划四组（秀明）', 'design': '前期和城市设计组（林）', 'renewal': '城市更新组（利）' };

async function test() {
    try {
        const department = 'planning-1'; // 测试筛选
        
        const conditions = [isNull(projects.deletedAt)];
        // 模拟 API 参数解析
        if (department && typeof department === 'string' && DEPT_MAPPING[department]) {
             // 注意：这里只是模拟逻辑，实际 API 用的就是 DEPT_MAPPING[department]
             // conditions.push(eq(projects.department, DEPT_MAPPING[department]));
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
            },
            limit: 5 // 限制数量以便快速查看
        });

        console.log(`Found ${allProjects.length} projects.`);

        const allRecords: any[] = [];

        allProjects.forEach(p => {
            if (Array.isArray(p.timeline)) {
                (p.timeline as any[]).forEach(t => {
                     allRecords.push({ ...t, projectName: p.name, type: 'record' });
                });
            }
            if (Array.isArray(p.nextPlan)) {
                 (p.nextPlan as any[]).forEach(t => {
                     allRecords.push({ ...t, projectName: p.name, type: 'plan' });
                });
            }
        });

        console.log('Sample Records:', allRecords.slice(0, 3));

    } catch (e) {
        console.error(e);
    }
}

test();
