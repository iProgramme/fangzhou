
import { pgTable, text, timestamp, boolean, integer, jsonb, serial, date } from 'drizzle-orm/pg-core';

// 用户表
export const users = pgTable('users', {
  id: text('id').primaryKey(), // 使用字符串ID，与模拟数据保持一致 (如 'u-001')
  name: text('name').notNull(), // 姓名
  password: text('password').default('123'), // 默认密码 123
  role: text('role').notNull(), // 'admin' | 'user' | 'manager'
  department: text('department'), // 部门
  email: text('email'), // 邮箱
  status: text('status').default('active'), // 状态
  createdAt: timestamp('created_at').defaultNow(), // 创建时间
  updatedAt: timestamp('updated_at').defaultNow(), // 更新时间
});

// 系统字典表
export const systemDictionaries = pgTable('system_dictionaries', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // 字典键，如 '地区', '项目类别'
  items: jsonb('items').notNull(), // 字典项数组 { label, bgColor, textColor }
  createdAt: timestamp('created_at').defaultNow(), // 创建时间
  updatedAt: timestamp('updated_at').defaultNow(), // 更新时间
});

// 项目表
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  stage: text('stage').notNull(), // 项目阶段
  department: text('department').notNull(), // 所属部门
  
  // 基本信息
  responsiblePerson: text('responsible_person'), // 负责人
  region: text('region'), // 地区
  category: text('category'), // 项目类别
  threeReviewType: text('three_review_type'), // 三审类型
  source: text('source'), // 项目来源
  contractNo: text('contract_no'), // 合同编号
  contractStatus: text('contract_status'), // 合同准备状态
  name: text('name').notNull(), // 项目名称
  clientName: text('client_name'), // 甲方名称
  workProgress: text('work_progress'), // 工作进展
  remarks: text('remarks'), // 备注
  
  // 合同与签订
  signingMethod: text('signing_method'), // 签订方式
  signingDate: text('signing_date'), // 签订日期 (YYYY-MM-DD)
  consortium: text('consortium'), // 联合体单位
  type: text('project_type'), // 项目类型 ('type' 是保留字，改用 project_type)
  
  // 财务信息
  totalAmount: integer('contract_amount'), // 合同总额
  instituteAmount: integer('institute_amount'), // 我院合同额
  deptAmount: integer('department_amount'), // 我所合同额
  
  paymentProgress: text('payment_progress'), // 收款进度
  collectedAmount: integer('total_collected_amount'), // 已收款总额
  
  // 年度数据 (存储为 JSONB，因为它是对象数组)
  annualData: jsonb('annual_data').default([]), 

  // 项目时间线 (记录关键节点)
  timeline: jsonb('timeline').default([]),

  // 计划与团队
  nextPlan: text('next_plan'), // 下一步计划
  teamMembers: text('team_members'), // 团队成员

  // 收款计划特定字段
  collectionTarget: text('collection_target'), // 收款目标
  paymentLevel: text('payment_level'), // 收款等级
  completionStatus: boolean('completion_status'), // 完成状态
  contractLocation: text('contract_location'), // 合同位置
  progressStatus: text('progress_status'), // 进度状态
  
  // 旧字段/分析字段
  clientType: text('client_type'), // 客户类型
  probability: text('possibility'), // 可能性
  estimatedSignYear: text('estimated_sign_year'), // 预计签约年份
  collectionPlanYear: integer('plan_collection_2025'), // 2025计划收款

  createdAt: timestamp('created_at').defaultNow(), // 创建时间
  updatedAt: timestamp('updated_at').defaultNow(), // 更新时间
});

// 操作日志表
export const operationLogs = pgTable('operation_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id), // 关联用户ID
  userName: text('user_name'), // 用户名快照
  action: text('action').notNull(), // 动作: CREATE, UPDATE, DELETE, LOGIN, OTHER
  targetType: text('target_type').notNull(), // 目标类型: PROJECT, USER, SYSTEM
  targetId: text('target_id'), // 目标ID
  details: text('details'), // 详情
  timestamp: timestamp('timestamp').defaultNow(), // 时间戳
});
