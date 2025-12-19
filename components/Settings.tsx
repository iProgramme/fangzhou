import React, { useState } from 'react';
import { Save, RotateCcw, Shield, Database, User as UserIcon, Plus, X, Edit, Trash2, CheckCircle, AlertCircle, List, BookOpen, Clock, Palette, Download, Upload, FileJson } from 'lucide-react';
import { User, Department, OperationLog, SystemDictionary, DictItem } from '../types';
import { TAG_COLORS } from '../services/mockData';
import { createUser, updateUser, deleteUser as deleteUserApi, fetchProjects } from '../services/api';

interface SettingsProps {
    users: User[];
    onRefreshUsers: () => void;
    logs: OperationLog[];
    dictionaries: SystemDictionary;
    onUpdateDictionary: (key: string, values: DictItem[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ users, onRefreshUsers, logs, dictionaries, onUpdateDictionary }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs' | 'dict'>('users');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});

    // Export Handler
    const handleExportData = async (type: 'projects' | 'dictionaries' | 'users') => {
        let data: any;
        let filename = `export_${type}_${new Date().toISOString().split('T')[0]}.json`;

        try {
            if (type === 'projects') data = await fetchProjects();
            else if (type === 'dictionaries') data = dictionaries;
            else if (type === 'users') data = users;

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出失败');
        }
    };

    // Import Handler
    const handleImportData = (type: 'projects' | 'dictionaries' | 'users', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                if (window.confirm(`确定要导入${type}数据吗？现有数据可能会被覆盖或冲突。`)) {
                    if (type === 'dictionaries') {
                        for (const [key, items] of Object.entries(importedData)) {
                            await onUpdateDictionary(key, items as DictItem[]);
                        }
                    } else if (type === 'users') {
                        for (const user of importedData) {
                            if ((user as User).id) await updateUser(user as User);
                            else await createUser(user);
                        }
                        onRefreshUsers();
                    } else if (type === 'projects') {
                        // Projects import needs individual API calls in current setup
                        alert('项目导入功能需要后端批量接口支持，目前建议手动录入。');
                    }
                    alert('导入操作已执行，请刷新检查。');
                }
            } catch (err) {
                alert('解析文件失败，请确保是正确的 JSON 格式。');
            }
        };
        reader.readAsText(file);
    };

    // Dictionary State
    const [selectedDictKey, setSelectedDictKey] = useState<string>(Object.keys(dictionaries)[0]);
    const [newDictValue, setNewDictValue] = useState('');
    const [selectedColor, setSelectedColor] = useState<number>(0);

    // User Management Handlers
    const handleAddUser = () => {
        setEditingUser({ status: 'active', role: 'user', password: '123' });
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser({ ...user });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (id: string) => {
        if (window.confirm('确定要删除该用户吗？此操作不可恢复。')) {
            try {
                await deleteUserApi(id);
                onRefreshUsers();
            } catch (e) {
                alert('删除失败');
            }
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser.id) {
                await updateUser(editingUser as User);
            } else {
                await createUser(editingUser);
            }
            onRefreshUsers();
            setIsUserModalOpen(false);
        } catch (e) {
            alert('保存失败');
        }
    };

    // Dictionary Handlers
    const handleAddDictValue = () => {
        if (!newDictValue.trim()) return;
        const currentValues = dictionaries[selectedDictKey] || [];
        if (currentValues.some(v => v.label === newDictValue)) return;
        
        const color = TAG_COLORS[selectedColor];
        const newItem: DictItem = {
            label: newDictValue,
            bgColor: color.bg,
            textColor: color.text
        };

        onUpdateDictionary(selectedDictKey, [...currentValues, newItem]);
        setNewDictValue('');
    };

    const handleDeleteDictValue = (item: DictItem) => {
        if (window.confirm(`确定删除选项 "${item.label}" 吗？此操作将影响后续数据录入。`)) {
            const currentValues = dictionaries[selectedDictKey] || [];
            onUpdateDictionary(selectedDictKey, currentValues.filter(v => v.label !== item.label));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>

            {/* Settings Navigation */}
            <div className="flex space-x-2 border-b">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Shield className="h-4 w-4"/> 用户与权限
                </button>
                <button 
                    onClick={() => setActiveTab('dict')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'dict' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <BookOpen className="h-4 w-4"/> 字典管理
                </button>
                 <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <List className="h-4 w-4"/> 操作日志
                </button>
                <button 
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Database className="h-4 w-4"/> 数据运维
                </button>
            </div>

            {/* TAB: User Management */}
            {activeTab === 'users' && (
                <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium">用户列表</h3>
                        <button 
                            onClick={handleAddUser}
                            className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md text-sm transition-colors"
                        >
                            <Plus className="h-4 w-4" /> 添加新用户
                        </button>
                    </div>
                    
                    <div className="rounded-md border overflow-hidden mb-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="p-3 font-medium">姓名</th>
                                    <th className="p-3 font-medium">邮箱</th>
                                    <th className="p-3 font-medium">角色</th>
                                    <th className="p-3 font-medium">所属部门</th>
                                    <th className="p-3 font-medium">状态</th>
                                    <th className="p-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y bg-card">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-3 font-medium flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            {user.name}
                                        </td>
                                        <td className="p-3 text-muted-foreground">{user.email || '-'}</td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                                                ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                                user.role === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                {user.role === 'admin' ? '超级管理员' : user.role === 'manager' ? '部门经理' : '普通用户'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-muted-foreground text-xs">{user.department || '全院'}</td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center gap-1.5 text-xs
                                                ${user.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                                {user.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                                {user.status === 'active' ? '正常' : '禁用'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEditUser(user)} className="p-1.5 hover:bg-muted rounded text-blue-600"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 hover:bg-muted rounded text-red-600"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: Dictionaries */}
            {activeTab === 'dict' && (
                <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 border-r pr-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">字典类型</h3>
                        <div className="space-y-1">
                            {Object.keys(dictionaries).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedDictKey(key)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedDictKey === key ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                             <span className="text-primary font-bold">{selectedDictKey}</span> 选项列表
                        </h3>
                        
                        <div className="flex flex-col gap-3 mb-6 bg-muted/20 p-4 rounded-lg border">
                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 h-9 px-3 rounded-md border text-sm"
                                    placeholder={`添加新的${selectedDictKey}选项`}
                                    value={newDictValue}
                                    onChange={(e) => setNewDictValue(e.target.value)}
                                />
                                <button onClick={handleAddDictValue} className="px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">添加</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3"/> 选择标签颜色:</span>
                                <div className="flex gap-1">
                                    {TAG_COLORS.map((color, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setSelectedColor(idx)}
                                            className={`w-6 h-6 rounded-full border-2 ${color.bg} ${selectedColor === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:scale-110'} transition-all`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dictionaries[selectedDictKey]?.map((item, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded border bg-card`}>
                                    <span className={`text-sm px-2 py-0.5 rounded ${item.bgColor} ${item.textColor} font-medium`}>
                                        {item.label}
                                    </span>
                                    <button onClick={() => handleDeleteDictValue(item)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                                        <X className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Logs */}
            {activeTab === 'logs' && (
                <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in">
                    <h3 className="text-lg font-medium mb-4">系统操作日志</h3>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="p-3 w-40">时间</th>
                                    <th className="p-3 w-32">操作人</th>
                                    <th className="p-3 w-24">动作</th>
                                    <th className="p-3 w-24">对象类型</th>
                                    <th className="p-3">详情</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y bg-card">
                                {logs.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">暂无日志记录</td></tr>
                                ) : (
                                    logs.slice().reverse().map((log) => (
                                        <tr key={log.id} className="hover:bg-muted/50">
                                            <td className="p-3 text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-3 w-3"/>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-3 font-medium">{log.userName}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold
                                                    ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                      log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                      log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground">{log.targetType}</td>
                                            <td className="p-3">{log.details}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: System (Import/Export) */}
            {activeTab === 'system' && (
                 <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2 mb-6">
                        <Database className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">数据导入与导出</h3>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-3">
                         {/* Projects */}
                         <div className="p-5 border rounded-xl bg-muted/10 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileJson className="h-5 w-5 text-blue-500" />
                                    <p className="font-bold">项目数据表</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">包含所有项目的前期、收款、进度及完成状态数据。</p>
                            </div>
                            <div className="space-y-2">
                                 <button onClick={() => handleExportData('projects')} className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                                    <Download className="h-4 w-4" /> 导出 JSON
                                 </button>
                                 <label className="w-full flex items-center justify-center gap-2 border bg-card px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted cursor-pointer transition-colors">
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" className="hidden" onChange={(e) => handleImportData('projects', e)} />
                                 </label>
                            </div>
                         </div>

                         {/* Dictionaries */}
                         <div className="p-5 border rounded-xl bg-muted/10 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-5 w-5 text-green-500" />
                                    <p className="font-bold">系统字典表</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">包含地区、类别、三审类型、标签颜色等所有配置项。</p>
                            </div>
                            <div className="space-y-2">
                                 <button onClick={() => handleExportData('dictionaries')} className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                                    <Download className="h-4 w-4" /> 导出 JSON
                                 </button>
                                 <label className="w-full flex items-center justify-center gap-2 border bg-card px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted cursor-pointer transition-colors">
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" className="hidden" onChange={(e) => handleImportData('dictionaries', e)} />
                                 </label>
                            </div>
                         </div>

                         {/* Users */}
                         <div className="p-5 border rounded-xl bg-muted/10 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <UserIcon className="h-5 w-5 text-purple-500" />
                                    <p className="font-bold">用户与权限表</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">包含所有账号、部门分配、角色权限及登录密码数据。</p>
                            </div>
                            <div className="space-y-2">
                                 <button onClick={() => handleExportData('users')} className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                                    <Download className="h-4 w-4" /> 导出 JSON
                                 </button>
                                 <label className="w-full flex items-center justify-center gap-2 border bg-card px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted cursor-pointer transition-colors">
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" className="hidden" onChange={(e) => handleImportData('users', e)} />
                                 </label>
                            </div>
                         </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                        <div className="text-xs text-yellow-800 leading-relaxed">
                            <p className="font-bold mb-1">注意事项：</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>导入操作具有危险性，建议在导入前先执行“导出”以备份现有数据。</li>
                                <li>请确保导入的 JSON 文件结构与系统导出的文件保持一致。</li>
                                <li>用户表导入时，如果 ID 重复则会执行更新，如果 ID 为空则会创建新用户。</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal (Same as before) */}
            {isUserModalOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setIsUserModalOpen(false)}
                >
                    <div 
                        className="bg-background w-full max-w-lg rounded-xl shadow-xl border p-6 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                {editingUser.id ? '编辑用户' : '添加新用户'}
                            </h3>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5"/>
                            </button>
                        </div>
                                                <form onSubmit={handleSaveUser} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">姓名 (登录账号)</label>
                                                            <input required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="请输入姓名"/>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">登录密码</label>
                                                            <input required type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="默认 123"/>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">邮箱</label>
                                                            <input type="email" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="user@example.com"/>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">角色</label>
                                                            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                                                                                                        <option value="user">普通用户</option>
                                                                                                        <option value="manager">部门经理</option>
                                                                                                        <option value="admin">超级管理员</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                            </div>                        
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">状态</label>
                                                            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.status || 'active'} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}>
                                                                <option value="active">正常</option>
                                                                <option value="inactive">禁用</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">所属部门</label>
                                                            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value as any})}>
                                                                <option value="">-- 全院 --</option>
                                                                {Object.values(Department).map(dept => (
                                                                    <option key={dept} value={dept}>{dept}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                        
                                                    <div className="pt-4 flex justify-end gap-2 border-t">
                                                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-md border hover:bg-muted text-sm font-medium">取消</button>
                                                        <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium">保存</button>
                                                    </div>
                                                </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;