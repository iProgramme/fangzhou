
import React from 'react';
import { Project } from './types';
import { ColumnDef } from './components/ProjectTable';
import { Check, X } from 'lucide-react';

// Helper to format currency
const formatMoney = (val: any) => val ? `¥${Number(val).toLocaleString()}` : '-';

// Mock ID Renderer
export const renderId = (val: any, r: Project) => r.id.substring(0, 4).toUpperCase();

// Render Boolean
const renderBoolean = (val: any) => val ? <Check className="h-4 w-4 text-green-600"/> : <X className="h-4 w-4 text-gray-300"/>;

// 1. 前期项目跟进 (Early Stage)
export const EARLY_COLUMNS: ColumnDef[] = [
    { key: 'responsiblePerson', header: '负责人', inputType: 'text' },
    { key: 'region', header: '地区', inputType: 'select', dictKey: '地区' },
    { key: 'category', header: '项目类别', inputType: 'select', dictKey: '项目类别' },
    { key: 'threeReviewType', header: '三审类型', inputType: 'select', dictKey: '三审类型' },
    { key: 'source', header: '项目来源', inputType: 'select', dictKey: '项目来源' },
    { key: 'contractStatus', header: '合同准备', inputType: 'select', dictKey: '合同准备' },
    { key: 'name', header: '项目(合同)名称', inputType: 'text' },
    { key: 'clientName', header: '甲方名称', inputType: 'text' },
    { key: 'workProgress', header: '工作进展', inputType: 'text' },
    { key: 'remarks', header: '备注', inputType: 'select', dictKey: '前期备注' }, // Special select for Early stage
    { key: 'signingMethod', header: '签订方式', inputType: 'select', dictKey: '签订方式' },
    { key: 'signingDate', header: '签订日期', inputType: 'date' },
    { key: 'consortium', header: '联合体单位', inputType: 'select', dictKey: '联合体单位' },
    { key: 'type', header: '项目类型', inputType: 'select', dictKey: '项目类型' },
    { key: 'totalAmount', header: '合同额', render: formatMoney, inputType: 'number' },
    { key: 'instituteAmount', header: '我院合同额', render: formatMoney, inputType: 'number' },
    { key: 'deptAmount', header: '我所合同额', render: formatMoney, inputType: 'number' },
    { key: 'paymentProgress', header: '收款进度', inputType: 'text' },
    { key: 'collectedAmount', header: '已收款', render: formatMoney, inputType: 'number' },
    
    // Virtual Keys for Annual Data - handled by Table
    { key: 'annualContract', header: '当年合同额', render: formatMoney, inputType: 'number' }, 
    { key: 'annualCollection', header: '当年收款', render: formatMoney, inputType: 'number' },

    { key: 'nextPlan', header: '下一步工作计划', inputType: 'text' },
    { key: 'teamMembers', header: '项目参与团队和人员', inputType: 'text' },
];

// 2. A2025年底收款计划 (Collection Plan)
export const COLLECTION_COLUMNS: ColumnDef[] = [
    { key: 'responsiblePerson', header: '负责人', inputType: 'text' },
    { key: 'name', header: '项目(合同)名称', inputType: 'text' },
    { key: 'threeReviewType', header: '三审类型', inputType: 'select', dictKey: '三审类型' },
    { key: 'collectionTarget', header: '收款', inputType: 'text' }, // Specified as string:input
    { key: 'paymentLevel', header: '收款等级', inputType: 'select', dictKey: '收款等级' },
    { key: 'completionStatus', header: '完成情况', render: renderBoolean, inputType: 'boolean' },
    { key: 'contractLocation', header: '合同位置', inputType: 'select', dictKey: '合同位置' },
    { key: 'progressStatus', header: '进度情况', inputType: 'text' },
];

// 3. B2025各组项目列表及进度 (Group Progress)
export const PROGRESS_COLUMNS: ColumnDef[] = [
    { key: 'responsiblePerson', header: '负责人', inputType: 'text' },
    { key: 'region', header: '地区', inputType: 'select', dictKey: '地区' },
    { key: 'category', header: '项目类别', inputType: 'select', dictKey: '项目类别' },
    { key: 'threeReviewType', header: '三审类型', inputType: 'select', dictKey: '三审类型' },
    { key: 'source', header: '项目来源', inputType: 'select', dictKey: '项目来源' },
    { key: 'contractNo', header: '合同编号', inputType: 'text' },
    { key: 'name', header: '项目(合同)名称', inputType: 'text' },
    { key: 'clientName', header: '甲方名称', inputType: 'text' },
    { key: 'signingMethod', header: '签订方式', inputType: 'select', dictKey: '签订方式' },
    { key: 'signingDate', header: '签订日期', inputType: 'date' },
    { key: 'consortium', header: '联合体单位', inputType: 'select', dictKey: '联合体单位' },
    { key: 'type', header: '项目类型', inputType: 'select', dictKey: '项目类型' },
    { key: 'totalAmount', header: '合同额', render: formatMoney, inputType: 'number' },
    { key: 'instituteAmount', header: '我院合同额', render: formatMoney, inputType: 'number' },
    { key: 'deptAmount', header: '我所合同额', render: formatMoney, inputType: 'number' },
    { key: 'paymentProgress', header: '收款进度', inputType: 'text' },
    { key: 'collectedAmount', header: '已收款', render: formatMoney, inputType: 'number' },
    
    // Virtual Keys
    { key: 'annualContract', header: '当年合同额', render: formatMoney, inputType: 'number' },
    { key: 'annualCollection', header: '当年收款', render: formatMoney, inputType: 'number' },

    { key: 'workProgress', header: '工作进展', inputType: 'text' },
    { key: 'nextPlan', header: '下一步工作计划', inputType: 'text' },
    { key: 'teamMembers', header: '项目参与团队和人员', inputType: 'text' },
    { key: 'remarks', header: '备注', inputType: 'textarea' }, 
];

// 4. C已完成项目 (Completed)
export const COMPLETED_COLUMNS: ColumnDef[] = [
    { key: 'responsiblePerson', header: '负责人', inputType: 'text' },
    { key: 'region', header: '地区', inputType: 'select', dictKey: '地区' },
    { key: 'category', header: '项目类别', inputType: 'select', dictKey: '项目类别' },
    { key: 'threeReviewType', header: '三审类型', inputType: 'select', dictKey: '三审类型' },
    { key: 'source', header: '项目来源', inputType: 'select', dictKey: '项目来源' },
    { key: 'contractNo', header: '合同编号', inputType: 'text' },
    { key: 'name', header: '项目(合同)名称', inputType: 'text' },
    { key: 'clientName', header: '甲方名称', inputType: 'text' },
    { key: 'signingMethod', header: '签订方式', inputType: 'select', dictKey: '签订方式' },
    { key: 'signingDate', header: '签订日期', inputType: 'date' },
    { key: 'consortium', header: '联合体单位', inputType: 'select', dictKey: '联合体单位' },
    { key: 'type', header: '项目类型', inputType: 'select', dictKey: '项目类型' },
    { key: 'totalAmount', header: '合同额', render: formatMoney, inputType: 'number' },
    { key: 'instituteAmount', header: '我院合同额', render: formatMoney, inputType: 'number' },
    { key: 'deptAmount', header: '我所合同额', render: formatMoney, inputType: 'number' },
    { key: 'paymentProgress', header: '收款进度', inputType: 'text' },
    { key: 'collectedAmount', header: '已收款', render: formatMoney, inputType: 'number' },
    
    // Virtual Keys
    { key: 'annualContract', header: '当年合同额', render: formatMoney, inputType: 'number' },
    { key: 'annualCollection', header: '当年收款', render: formatMoney, inputType: 'number' },

    { key: 'workProgress', header: '工作进展', inputType: 'text' },
    { key: 'nextPlan', header: '下一步工作计划', inputType: 'text' },
    { key: 'teamMembers', header: '项目参与团队和人员', inputType: 'text' },
    { key: 'remarks', header: '备注', inputType: 'textarea' },
];
