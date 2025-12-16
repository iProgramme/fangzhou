
import { Project, User, SystemDictionary, OperationLog, DictItem } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const api = {
    // Projects
    fetchProjects: async (): Promise<Project[]> => {
        const res = await fetch(`${API_BASE}/projects`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    createProject: async (project: Project): Promise<Project> => {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        });
        if (!res.ok) throw new Error('Failed to create project');
        return res.json();
    },

    updateProject: async (project: Project): Promise<Project> => {
        const res = await fetch(`${API_BASE}/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        });
        if (!res.ok) throw new Error('Failed to update project');
        return res.json();
    },

    deleteProject: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    // Users
    fetchUsers: async (): Promise<User[]> => {
        const res = await fetch(`${API_BASE}/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    updateUsers: async (users: User[]): Promise<User[]> => {
        // Using sync endpoint for bulk updates of user list (simplification)
        const res = await fetch(`${API_BASE}/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users),
        });
        if (!res.ok) throw new Error('Failed to update users');
        return res.json();
    },

    // Dictionaries
    fetchDictionaries: async (): Promise<SystemDictionary> => {
        const res = await fetch(`${API_BASE}/dictionaries`);
        if (!res.ok) throw new Error('Failed to fetch dictionaries');
        return res.json();
    },

    updateDictionary: async (key: string, values: DictItem[], allDicts: SystemDictionary): Promise<SystemDictionary> => {
        const updatedDicts = { ...allDicts, [key]: values };
        const res = await fetch(`${API_BASE}/dictionaries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDicts),
        });
        if (!res.ok) throw new Error('Failed to update dictionaries');
        return res.json();
    },

    // Logs
    fetchLogs: async (): Promise<OperationLog[]> => {
        const res = await fetch(`${API_BASE}/logs`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        return res.json();
    },

    createLog: async (log: OperationLog): Promise<OperationLog> => {
        const res = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log),
        });
        // Logs failure shouldn't block app flow generally
        if (!res.ok) console.error('Failed to save log');
        return res.json();
    }
};
