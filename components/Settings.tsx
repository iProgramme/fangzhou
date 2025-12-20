import React, { useState } from 'react';
import { Save, RotateCcw, Shield, Database, User as UserIcon, Plus, X, Edit, Trash2, CheckCircle, AlertCircle, List, BookOpen, Clock, Palette, Download, Upload, FileJson, Monitor, ExternalLink } from 'lucide-react';
import { User, Department, OperationLog, SystemDictionary, DictItem, Project } from '../types';
import { TAG_COLORS } from '../services/mockData';
import { createUser, updateUser, deleteUser as deleteUserApi, fetchProjects, createProject, updateProject, fetchThemeCSS } from '../services/api';

interface SettingsProps {
    users: User[];
    currentUser: User | null; // Added
    onRefreshUsers: () => void;
    logs: OperationLog[];
    dictionaries: SystemDictionary;
    onUpdateDictionary: (key: string, values: DictItem[]) => void;
    currentThemeCode: string;
    onUpdateThemeCode: (code: string) => void;
    confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ users, currentUser, onRefreshUsers, logs, dictionaries, onUpdateDictionary, currentThemeCode, onUpdateThemeCode, confirmCustom }) => {
    const isAdmin = currentUser?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs' | 'dict' | 'appearance'>(isAdmin ? 'users' : 'appearance');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Theme Configs
    const themes = [
        { id: 'default', name: '系统默认', color: 'bg-primary' },
        { id: 'amber_minimal', name: '琥珀简约', color: 'bg-amber-500' },
        { id: 'bubblegum', name: '泡泡糖', color: 'bg-pink-400' },
        { id: 'claude', name: 'Claude 风格', color: 'bg-orange-700' },
        { id: 'cyberpunk', name: '赛博朋克', color: 'bg-blue-400' },
        { id: 'nature', name: '自然清新', color: 'bg-green-600' },
    ];

    const applyPresetTheme = async (id: string) => {
        if (id === 'default') {
            onUpdateThemeCode('');
            return;
        }
        try {
            const css = await fetchThemeCSS(id);
            onUpdateThemeCode(css);
            showToast(`主题 ${id} 已应用`);
        } catch (e) {
            showToast('获取主题文件失败', 'error');
        }
    };

    // New states for Import/Export requirements
    const [hasExported, setHasExported] = useState(false);
    const [importTab, setImportTab] = useState<'add' | 'overwrite'>('add');

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

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
            
            setHasExported(true); // Unlock Import
            showToast('备份导出成功，导入功能已解锁');
        } catch (e) {
            showToast('导出失败', 'error');
        }
    };

    // Import Handler
    const handleImportData = (type: 'projects' | 'dictionaries' | 'users', e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasExported) {
            showToast('安全限制：导入前必须先点击“导出JSON”备份当前数据', 'error');
            e.target.value = '';
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                const modeText = importTabMode === 'add' ? '【增量新增】' : '【全量覆盖】';
                
                confirmCustom(
                    `确认导入 - ${modeText}`,
                    `您确定要使用 ${modeText} 模式导入 ${type} 数据吗？${importTabMode === 'overwrite' ? '警告：此操作将尝试覆盖/替换现有冲突数据！建议先执行导出备份。' : '注意：增量模式下将跳过已存在的数据。'} `,
                    async () => {
                        setIsSubmitting(true);
                        
                        if (type === 'dictionaries') {
                            for (const [key, items] of Object.entries(importedData)) {
                                let finalItems = items as DictItem[];
                                if (importTabMode === 'add') {
                                    const current = dictionaries[key] || [];
                                    const existingLabels = new Set(current.map(i => i.label));
                                    finalItems = [...current, ...finalItems.filter(i => !existingLabels.has(i.label))];
                                }
                                await onUpdateDictionary(key, finalItems);
                            }
                        } else if (type === 'users') {
                            for (const user of (importedData as User[])) {
                                if (user.id) await updateUser(user);
                                else await createUser(user);
                            }
                            onRefreshUsers();
                        } else if (type === 'projects') {
                            for (const proj of (importedData as Project[])) {
                                if (proj.id && importTabMode === 'overwrite') await updateProject(proj);
                                else await createProject(proj);
                            }
                        }
                        showToast(`${modeText} 导入成功`);
                    },
                    importTabMode === 'overwrite'
                );
            } catch (err) {
                showToast('解析文件失败，请确保格式正确', 'error');
            } finally {
                setIsSubmitting(false);
                e.target.value = '';
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
        confirmCustom(
            '删除用户',
            '您确定要删除该用户吗？此操作不可恢复。',
            async () => {
                try {
                    setIsSubmitting(true);
                    await deleteUserApi(id);
                    onRefreshUsers();
                    showToast('用户已删除');
                } catch (e) {
                    showToast('删除失败', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            },
            true
        );
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingUser.id) {
                await updateUser(editingUser as User);
                showToast('更新成功');
            } else {
                await createUser(editingUser);
                showToast('创建成功');
            }
            onRefreshUsers();
            setIsUserModalOpen(false);
        } catch (e) {
            console.error('Save user failed', e);
            showToast('保存失败', 'error');
        } finally {
            setIsSubmitting(false);
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
        confirmCustom(
            '删除选项',
            `确定删除选项 "${item.label}" 吗？此操作将影响后续数据录入。`,
            () => {
                const currentValues = dictionaries[selectedDictKey] || [];
                onUpdateDictionary(selectedDictKey, currentValues.filter(v => v.label !== item.label));
            },
            true
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>

            {/* Settings Navigation */}
            <div className="flex space-x-2 border-b">
                {isAdmin && (
                    <>
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
                    </>
                )}
                <button 
                    onClick={() => setActiveTab('appearance')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'appearance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Palette className="h-4 w-4"/> 个性化
                </button>
                {isAdmin && (
                    <button 
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Database className="h-4 w-4"/> 数据运维
                    </button>
                )}
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
                                    <th className="p-3 font-medium">添加日期</th>
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
                                        <td className="p-3 text-muted-foreground text-xs">
                                            {(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : '-'}
                                        </td>
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

            {/* TAB: Appearance & Themes */}
            {activeTab === 'appearance' && (
                <div className="space-y-8 animate-in fade-in">
                    {/* Preset Themes Section */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Monitor className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">预设皮肤库</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => applyPresetTheme(t.id)}
                                    className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-primary/50 hover:bg-primary/5 transition-all"
                                >
                                    <div className={`h-12 w-12 rounded-full ${t.color} shadow-lg ring-4 ring-background transition-transform group-hover:scale-110`} />
                                    <span className="text-sm font-bold">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Theme Code Section */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-medium">自定义主题代码</h3>
                            </div>
                            <a 
                                href="https://tweakcn.com/editor/theme" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                                前往在线编辑器生成代码 <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 leading-relaxed">
                                <p className="font-bold mb-1">使用说明：</p>
                                <ol className="list-decimal ml-4 space-y-1">
                                    <li>在 TweakCN 编辑器中配置您喜欢的主题色、圆角等参数。</li>
                                    <li>点击编辑器底部的“复制代码”按钮。</li>
                                    <li>将代码粘贴到下方的输入框中，系统将实时应用您的专属皮肤。</li>
                                </ol>
                            </div>

                            <textarea
                                className="w-full h-64 p-4 rounded-xl border bg-muted/20 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="请在此处贴入从 tweakcn.com 复制的主题代码 (CSS :root 结构)..."
                                value={currentThemeCode}
                                onChange={(e) => onUpdateThemeCode(e.target.value)}
                            />
                            
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => onUpdateThemeCode('')}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                                >
                                    清除自定义样式并还原
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: System (Import/Export) */}
            {activeTab === 'system' && (
                 <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-medium">数据导入与导出</h3>
                        </div>

                        {/* Import Mode Tabs */}
                        <div className="flex p-1 bg-muted rounded-lg border shadow-inner">
                            <button 
                                onClick={() => setImportTab('add')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${importTab === 'add' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                模式一：增量新增
                            </button>
                            <button 
                                onClick={() => setImportTab('overwrite')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${importTab === 'overwrite' ? 'bg-red-500 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                模式二：全量覆盖
                            </button>
                        </div>
                    </div>

                    {!hasExported && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-pulse">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm font-bold">安全锁：导入功能已锁定。请先点击下方任意“导出JSON”按钮备份数据，以防误操作导致数据丢失。</p>
                        </div>
                    )}
                    
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
                                 <label className={`w-full flex items-center justify-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!hasExported ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-card hover:bg-muted cursor-pointer'}`}>
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" disabled={!hasExported} className="hidden" onChange={(e) => handleImportData('projects', e)} />
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
                                 <label className={`w-full flex items-center justify-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!hasExported ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-card hover:bg-muted cursor-pointer'}`}>
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" disabled={!hasExported} className="hidden" onChange={(e) => handleImportData('dictionaries', e)} />
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
                                 <label className={`w-full flex items-center justify-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!hasExported ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-card hover:bg-muted cursor-pointer'}`}>
                                    <Upload className="h-4 w-4" /> 导入数据
                                    <input type="file" accept=".json" disabled={!hasExported} className="hidden" onChange={(e) => handleImportData('users', e)} />
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
                                                        <button type="button" disabled={isSubmitting} onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-md border hover:bg-muted text-sm font-medium disabled:opacity-50">取消</button>
                                                        <button 
                                                            type="submit" 
                                                            disabled={isSubmitting}
                                                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium flex items-center gap-2 disabled:opacity-70"
                                                        >
                                                            {isSubmitting && <RotateCcw className="h-4 w-4 animate-spin" />}
                                                            {isSubmitting ? '正在保存...' : '保存'}
                                                        </button>
                                                    </div>
                                                </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3
                    ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Settings;