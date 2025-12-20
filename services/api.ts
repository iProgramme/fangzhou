
import { Project, User, SystemDictionary, OperationLog, DictItem } from '../types';
import { INITIAL_DICTIONARIES, MOCK_USERS, MOCK_PROJECTS, INITIAL_LOGS } from './mockData';

const API_PORT = 3001;
const API_BASE = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api`
    : `http://localhost:${API_PORT}/api`;

// --- Projects ---
export const fetchProjects = async (filters: { stage?: string; department?: string } = {}): Promise<Project[]> => {
    try {
        const params = new URLSearchParams();
        if (filters.stage) params.append('stage', filters.stage);
        if (filters.department) params.append('department', filters.department);

        const url = `${API_BASE}/projects?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        
        // 数据转换 (例如日期字符串)
        // 确保 annualData 是一个数组
        return data.map((p: any) => ({
            ...p,
            annualData: p.annualData || []
        }));
    } catch (e) {
        console.warn('API 获取项目失败, 使用模拟数据', e);
        return MOCK_PROJECTS;
    }
};

export const createProject = async (project: Partial<Project>): Promise<Project> => {
    const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    });
    if (!res.ok) throw new Error('创建项目失败');
    return res.json();
};

export const updateProject = async (project: Project): Promise<Project> => {
    const res = await fetch(`${API_BASE}/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    });
    if (!res.ok) throw new Error('更新项目失败');
    return res.json();
};

export const deleteProject = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('删除项目失败');
};

// --- Users ---
export const fetchUsers = async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('获取用户失败');
    return res.json();
};

export const createUser = async (user: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '创建用户失败');
    }
    return res.json();
};

export const updateUser = async (user: User): Promise<User> => {
    const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '更新用户失败');
    }
    return res.json();
};

export const deleteUser = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '删除用户失败');
    }
};

// --- Dictionaries ---
export const fetchDictionaries = async (): Promise<SystemDictionary> => {
    try {
        const res = await fetch(`${API_BASE}/dictionaries`);
        if (!res.ok) throw new Error('获取字典失败');
        const data = await res.json();
        // 如果为空 (首次运行)，可能需要种子数据或回退
        if (Object.keys(data).length === 0) return INITIAL_DICTIONARIES;
        return data;
    } catch (e) {
        console.warn('API 获取字典失败, 使用模拟数据');
        return INITIAL_DICTIONARIES;
    }
};

// --- Auth ---
export const login = async (username: string, password: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '登录失败');
    }
    return res.json();
};

export const fetchThemeCSS = async (id: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/themes/${id}`);
    if (!res.ok) throw new Error('获取主题失败');
    return res.text();
};

export const updateDictionary = async (key: string, items: DictItem[]): Promise<any> => {
    const res = await fetch(`${API_BASE}/dictionaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, items })
    });
    return res.json();
};

// --- Logs ---
export const fetchLogs = async (): Promise<OperationLog[]> => {
    try {
        const res = await fetch(`${API_BASE}/logs`);
        if (!res.ok) throw new Error('获取日志失败');
        return res.json();
    } catch (e) {
        console.warn('API 获取日志失败, 使用模拟数据');
        return INITIAL_LOGS;
    }
};
