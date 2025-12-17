
import { Project, ProjectStage, Department, User, SystemDictionary, OperationLog, DictItem } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const CURRENT_USER: User = {
    id: 'u-001',
    name: '管理员(Admin)',
    role: 'admin',
    department: Department.COMPREHENSIVE,
    email: 'admin@institute.com',
    status: 'active'
};

export const MOCK_USERS: User[] = [
    CURRENT_USER,
    { id: 'u-002', name: '张三', role: 'manager', department: Department.PLANNING_1, email: 'zhangsan@institute.com', status: 'active' },
    { id: 'u-003', name: '李四', role: 'user', department: Department.MUNICIPAL, email: 'lisi@institute.com', status: 'active' },
    { id: 'u-004', name: '王五', role: 'user', department: Department.TRAFFIC, email: 'wangwu@institute.com', status: 'inactive' },
];

// Color Presets for Tags
export const TAG_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-red-100', text: 'text-red-800' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-gray-100', text: 'text-gray-800' },
    { bg: 'bg-orange-100', text: 'text-orange-800' },
    { bg: 'bg-teal-100', text: 'text-teal-800' },
];

const assignColors = (items: string[]): DictItem[] => {
    return items.map((label, index) => {
        const color = TAG_COLORS[index % TAG_COLORS.length];
        return { label, bgColor: color.bg, textColor: color.text };
    });
};

const RAW_DICTIONARIES = {
    '系统年份': ['2024', '2025', '2026', '2027'], // Added as requested
    '地区': ['全市', '全区', '空港', '新华', '新雅', '狮岭', '花山', '花东', '赤坭', '炭步', '秀全', '梯面', '花城', '汽车城', '海珠', '天河', '越秀', '西安', '黄埔', '中山', '番禺', '白云', '其他'],
    '项目类别': ['城市设计/概念规划', '地下空间', '村镇工业集聚区', '法定详细规划', '交通咨询/评估', '市政工程/评估', '国土空间和土地储备', '工改工完善用地手续', '微改造', '做地', '全流程用地服务', '村庄规划', '桥下空间', '建筑工程设计', '城市更新'],
    '三审类型': ['院重点项目', '院管项目', '所管项目'],
    '项目来源': ['市规自局', '市住建局', '区规自局+土发', '区住建局', '区交通局', '区项目服务中心', '市空港委', '镇街政府', '村委会/经济社', '国有企业', '私营企业', '其他区职能部门', '其他区镇街'],
    '合同准备': ['2026合同', '2025年合同', '重大项目经费申报', '前期研判', '25/26拆开', '历史项目补签合同'],
    '前期备注': ['靠谱', '一般', '先跟进', '重大项目前期经费', 'PASS'], 
    '签订方式': ['总院', '花都分院', '子公司', '300,000.00'],
    '联合体单位': ['无', '市规划院花都分院', '省建筑院', '城规公司', '市城建院', '衡信', '市规划院', '浔峰环保', '市环保工程设计院', '粤风环保', '图鉴规划公司', '碧航环保', '莫伯治事务所', '省建科'],
    '项目类型': ['院扶持', '半传统', '非传统', '待定'],
    '收款等级': ['已收', '一定要收', '需要争取', '彩蛋', '2026年'],
    '合同位置': ['总院', '花都分院', '子公司'],
};

// Transform raw strings to DictItems
export const INITIAL_DICTIONARIES: SystemDictionary = Object.fromEntries(
    Object.entries(RAW_DICTIONARIES).map(([key, values]) => [key, assignColors(values)])
);

export const INITIAL_LOGS: OperationLog[] = [
    {
        id: 'log-1',
        userId: 'u-001',
        userName: '管理员(Admin)',
        action: 'LOGIN',
        targetType: 'SYSTEM',
        details: '系统登录',
        timestamp: new Date().toISOString()
    }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: generateId(),
    stage: ProjectStage.EARLY,
    department: Department.PLANNING_1,
    name: "2030未来城市总体规划",
    responsiblePerson: "张三",
    region: "空港",
    category: "国土空间和土地储备",
    threeReviewType: "院重点项目",
    source: "市规自局",
    contractStatus: "2025年合同",
    remarks: "靠谱",
    totalAmount: 5000000,
    instituteAmount: 3000000,
    deptAmount: 2000000,
    annualData: [],
    signingDate: "2025-03-15",
    workProgress: "已完成初步调研"
  },
  {
    id: generateId(),
    stage: ProjectStage.COLLECTION,
    department: Department.MUNICIPAL,
    contractNo: "CT-2024-001",
    name: "中央公园排水系统改造",
    clientName: "城市基建集团",
    category: "市政工程/评估",
    threeReviewType: "所管项目",
    source: "国有企业",
    type: "半传统",
    totalAmount: 3000000,
    annualData: [
        { year: 2025, contractAmount: 3000000, collectedAmount: 500000, collectionDate: "2025-06-15" }
    ],
    collectedAmount: 500000,
    paymentProgress: "33%",
    signingDate: "2024-05-20",
    paymentLevel: "一定要收",
    collectionTarget: "力争年底前回款50%"
  },
];

// Generate robust data for dashboard visualization
const DEPARTMENTS = Object.values(Department);
const STAGES = Object.values(ProjectStage);

for (let i = 0; i < 80; i++) {
  const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
  const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
  const source = INITIAL_DICTIONARIES['项目来源'][Math.floor(Math.random() * INITIAL_DICTIONARIES['项目来源'].length)].label;
  const category = INITIAL_DICTIONARIES['项目类别'][Math.floor(Math.random() * INITIAL_DICTIONARIES['项目类别'].length)].label;
  const type = INITIAL_DICTIONARIES['项目类型'][Math.floor(Math.random() * INITIAL_DICTIONARIES['项目类型'].length)].label;
  const threeReview = INITIAL_DICTIONARIES['三审类型'][Math.floor(Math.random() * INITIAL_DICTIONARIES['三审类型'].length)].label;
  
  const totalAmount = Math.floor(Math.random() * 200) * 10000 + 50000; // 5w to 205w
  
  // Logic for financials
  let contractYear = 0;
  let collectedYear = 0;
  let annualData = [];

  if (stage === ProjectStage.COLLECTION || stage === ProjectStage.GROUP_PROGRESS) {
    contractYear = Math.random() > 0.3 ? totalAmount : 0; // Some are signed in current year
    const planYear = Math.floor(totalAmount * (0.3 + Math.random() * 0.4)); // 30-70% plan
    collectedYear = Math.floor(planYear * Math.random()); // Collected portion
    
    annualData.push({
        year: 2025,
        contractAmount: contractYear,
        collectedAmount: collectedYear,
        collectionDate: collectedYear > 0 ? "2025-09-10" : undefined
    });
    // Maybe add some 2024 data
    if (Math.random() > 0.5) {
         annualData.push({
            year: 2024,
            contractAmount: Math.floor(totalAmount * 0.2),
            collectedAmount: Math.floor(totalAmount * 0.1),
            collectionDate: "2024-12-20"
        });
    }
  }

  MOCK_PROJECTS.push({
    id: generateId(),
    stage: stage,
    department: dept,
    name: `模拟项目 ${i + 1} - ${category}`,
    source: source,
    category: category,
    threeReviewType: threeReview,
    type: type, 
    region: INITIAL_DICTIONARIES['地区'][Math.floor(Math.random() * INITIAL_DICTIONARIES['地区'].length)].label,
    signingDate: `2024-0${Math.ceil(Math.random()*9)}-${Math.ceil(Math.random()*28)}`, // Random date
    
    totalAmount: totalAmount,
    annualData: annualData,
    collectedAmount: collectedYear,
    contractStatus: INITIAL_DICTIONARIES['合同准备'][Math.floor(Math.random() * INITIAL_DICTIONARIES['合同准备'].length)].label,
    
    responsiblePerson: "模拟用户",
    workProgress: "进行中",
    paymentProgress: `${Math.floor(Math.random() * 100)}%`,
    completionStatus: Math.random() > 0.8,
    paymentLevel: INITIAL_DICTIONARIES['收款等级'][Math.floor(Math.random() * INITIAL_DICTIONARIES['收款等级'].length)].label
  });
}
