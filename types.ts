
export enum ProjectStage {
  EARLY = '前期项目跟进',
  COLLECTION = '年度收款计划', // Renamed from COLLECTION_2025
  GROUP_PROGRESS = '各组项目列表及进度', // Renamed from GROUP_PROGRESS
  COMPLETED = '已完成项目'
}

export enum Department {
  COMPREHENSIVE = '综合组（汤、黄）',
  MUNICIPAL = '市政组（大汤）',
  TRAFFIC = '交通组（任）',
  PLANNING_1 = '规划一组（邝）',
  PLANNING_2 = '规划二组（润新）',
  PLANNING_3 = '规划三组（胡）',
  PLANNING_4 = '规划四组（秀明）',
  DESIGN = '前期和城市设计组（林）',
  RENEWAL = '城市更新组（利）'
}

export const DEPARTMENT_SLUGS: Record<string, Department> = {
  'comprehensive': Department.COMPREHENSIVE,
  'municipal': Department.MUNICIPAL,
  'traffic': Department.TRAFFIC,
  'planning-1': Department.PLANNING_1,
  'planning-2': Department.PLANNING_2,
  'planning-3': Department.PLANNING_3,
  'planning-4': Department.PLANNING_4,
  'design': Department.DESIGN,
  'renewal': Department.RENEWAL,
};

export interface AnnualData {
  year: number;
  contractAmount: number;
  collectedAmount: number;
  collectionDate?: string; // New field for collection date
}

export interface Project {
  id: string;
  stage: ProjectStage;
  department: Department;
  
  // Basic Info & Core Fields
  responsiblePerson?: string; // 负责人
  region?: string; // 地区
  category?: string; // 项目类别
  threeReviewType?: string; // 三审类型
  source?: string; // 项目来源
  contractNo?: string; // 合同编号
  contractStatus?: string; // 合同准备
  name: string; // 项目(合同)名称
  clientName?: string; // 甲方名称
  workProgress?: string; // 工作进展
  remarks?: string; // 备注
  
  // Contract & Signing
  signingMethod?: string; // 签订方式
  signingDate?: string; // 签订日期 (YYYY-MM-DD)
  consortium?: string; // 联合体单位
  type?: string; // 项目类型
  
  // Financials
  totalAmount?: number; // 合同额
  instituteAmount?: number; // 我院合同额
  deptAmount?: number; // 我所合同额
  
  paymentProgress?: string; // 收款进度 (percentage string or text)
  collectedAmount?: number; // 已收款
  
  // Yearly Data (Scalable)
  annualData: AnnualData[]; 

  // Planning & Team
  nextPlan?: string; // 下一步工作计划
  teamMembers?: string; // 项目参与团队和人员

  // Collection Plan Specifics
  collectionTarget?: string; // 收款 (String input as per requirement)
  paymentLevel?: string; // 收款等级
  completionStatus?: boolean; // 完成情况
  contractLocation?: string; // 合同位置
  progressStatus?: string; // 进度情况

  // Legacy/Other for analytics mapping
  clientType?: string; 
  probability?: string; 
  estimatedSignYear?: string; 
  collectionPlanYear?: number; // Deprecated but kept for type compatibility if needed, though we should prefer annualData
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'manager';
  department?: Department;
  email?: string;
  status?: 'active' | 'inactive';
}

export interface OperationLog {
    id: string;
    userId: string;
    userName: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
    targetType: 'PROJECT' | 'USER' | 'SYSTEM';
    targetId?: string;
    details: string;
    timestamp: string;
}

// Dictionary Item with Color
export interface DictItem {
    label: string;
    bgColor: string;  // e.g., 'bg-blue-100' or hex code
    textColor: string; // e.g., 'text-blue-800' or hex code
}

export interface SystemDictionary {
    [key: string]: DictItem[];
}
