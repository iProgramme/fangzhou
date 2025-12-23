import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, RotateCcw, Shield, Database, User as UserIcon, Plus, X, Edit, Trash2, CheckCircle, AlertCircle, List, BookOpen, Clock, Palette, Download, Upload, FileJson, Monitor, ExternalLink, FileSpreadsheet, File, ChevronLeft, ChevronRight, Loader2, Info, AlertTriangle, History, ArrowUp, ArrowDown, Sparkles, Bot } from 'lucide-react';
import { User, Department, OperationLog, SystemDictionary, DictItem, Project } from '../types';
import { TAG_COLORS } from '../services/mockData';
import { createUser, updateUser, deleteUser as deleteUserApi, fetchProjects, createProject, updateProject, fetchThemeCSS } from '../services/api';
import * as XLSX from 'xlsx';

const PROJECT_FIELD_MAPPING: Record<string, keyof Project | 'annualDataJson'> = { "项目ID": "id", "项目阶段": "stage", "所属部门": "department", "项目负责人": "responsiblePerson", "地区": "region", "项目类别": "category", "三审类型": "threeReviewType", "项目来源": "source", "合同编号": "contractNo", "合同状态": "contractStatus", "项目名称": "name", "甲方名称": "clientName", "客户类型": "clientType", "可能性": "probability", "工作进展": "workProgress", "备注": "remarks", "签订方式": "signingMethod", "签订日期": "signingDate", "联合体单位": "consortium", "项目类型": "type", "总合同额": "totalAmount", "我院合同额": "instituteAmount", "我所合同额": "deptAmount", "收款进度": "paymentProgress", "已收款": "collectedAmount", "下一步计划": "nextPlan", "团队成员": "teamMembers", "收款目标": "collectionTarget", "收款等级": "paymentLevel", "完成情况": "completionStatus", "合同位置": "contractLocation", "进度情况": "progressStatus", "年度数据(JSON)": "annualDataJson" };
const USER_FIELD_MAPPING: Record<string, keyof User> = { "用户ID": "id", "姓名": "name", "邮箱": "email", "角色": "role", "部门": "department", "状态": "status", "密码": "password" };
const DICT_FIELD_MAPPING = { "字典类型": "type", "选项名称": "label", "背景颜色": "bgColor", "文字颜色": "textColor" };

const safeNumber = (v: any): number => { if (v === undefined || v === null || v === '') return 0; if (typeof v === 'number') return v; const c = String(v).replace(/[¥, \s]/g, ''); const n = parseFloat(c); return isNaN(n) ? 0 : n; };
const safeBoolean = (v: any): boolean => (v === true || v === 'true' || v === 'TRUE' || v === '是' || v === '1' || v === 1 || v === '√');

interface SettingsProps { users: User[]; currentUser: User | null; onRefreshUsers: () => void; logs: OperationLog[]; dictionaries: SystemDictionary; onUpdateDictionary: (key: string, values: DictItem[]) => void; currentThemeCode: string; onUpdateThemeCode: (code: string) => void; confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void; }

const Settings: React.FC<SettingsProps> = ({ users, currentUser, onRefreshUsers, logs, dictionaries, onUpdateDictionary, currentThemeCode, onUpdateThemeCode, confirmCustom }) => {
    const isAdmin = currentUser?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs' | 'dict' | 'appearance' | 'ai'>(() => {
        const s = localStorage.getItem('st_tab');
        return (isAdmin && s && ['users','system','logs','dict','appearance', 'ai'].includes(s)) ? s as any : 'appearance';
    });
    const [apiKey, setApiKey] = useState(() => {
        const saved = localStorage.getItem('deepseek_api_key') || '';
        if (!saved || saved.includes('ReferenceError')) return '';
        try {
            return atob(saved); // Decrypt on load
        } catch {
            return '';
        }
    });

    const saveApiKey = () => {
        if (!apiKey.trim() || apiKey.includes('ReferenceError')) {
            showToast('无效的 API Key', 'error');
            return;
        }
        localStorage.setItem('deepseek_api_key', btoa(apiKey)); // Encrypt on save
        showToast('DeepSeek API Key 已安全加密保存');
    };
    const [selectedDictKey, setSelectedDictKey] = useState<string>(() => {
        const s = localStorage.getItem('st_dict');
        return (s && Object.keys(dictionaries).includes(s)) ? s : (Object.keys(dictionaries)[0] || '地区');
    });

    // Local temporary state for dictionary items to support smooth sorting
    const [localDictItems, setLocalDictItems] = useState<DictItem[]>([]);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { setLocalDictItems(dictionaries[selectedDictKey] || []); }, [selectedDictKey, dictionaries]);

    const changeTab = (t: any) => { setActiveTab(t); localStorage.setItem('st_tab', t); };
    const changeDict = (k: string) => { setSelectedDictKey(k); localStorage.setItem('st_dict', k); };

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStats, setImportStats] = useState({ success: 0, updated: 0, error: 0, total: 0, processed: 0 });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [newDictValue, setNewDictValue] = useState('');
    const [lastSyncInfo, setLastSyncInfo] = useState<{ time: string, success: number, updated: number, error: number, addedIds: string[], updatedIds: string[], failedIds: {id: string, reason: string}[] } | null>(() => { const s = localStorage.getItem('last_sync'); return s ? JSON.parse(s) : null; });

    const VALID_STAGES = ['前期项目跟进', '年度收款计划', '各组项目列表及进度', '已完成项目'];
    const showToast = (m: string, t: 'success'|'error' = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 5000); };

    const handleImportData = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            confirmCustom(`确认同步`, `ID存在将更新，不存在将新增。`, async () => {
                setLastSyncInfo(null); setIsSubmitting(true); setImportProgress(0);
                let [s, up, er] = [0, 0, 0]; let aIds: string[] = [], uIds: string[] = [], fIds: any[] = [];
                try {
                    const data = file.name.endsWith('.xlsx') ? XLSX.utils.sheet_to_json(XLSX.read(ev.target?.result, {type:'array'}).Sheets[XLSX.read(ev.target?.result, {type:'array'}).SheetNames[0]]) : JSON.parse(ev.target?.result as string);
                    const total = data.length;
                    const curProjs = type === 'projects' ? await fetchProjects() : [];
                    for(let i=0; i<total; i++) {
                        const row: any = data[i];
                        try {
                            if (type === 'projects') {
                                const p: any = {}; 
                                Object.entries(PROJECT_FIELD_MAPPING).forEach(([cn, en]) => { 
                                    if (en === 'annualDataJson') {
                                        try { p.annualData = row[cn] ? JSON.parse(row[cn]) : []; } catch { p.annualData=[]; } 
                                    } else {
                                        p[en] = row[cn]; 
                                    }
                                });
                                
                                // 补全必填项默认值，使同步更灵活
                                if (!p.name) p.name = '未命名项目';
                                if (!p.stage) p.stage = '前期项目跟进';
                                if (!p.department) p.department = '综合组（汤、黄）';
                                
                                const pid = String(p.id||'').trim(); 
                                const exists = pid ? curProjs.find(ex => String(ex.id) === pid) : null;
                                const clean = { 
                                    ...p, 
                                    id: pid||undefined, 
                                    totalAmount: safeNumber(p.totalAmount), 
                                    instituteAmount: safeNumber(p.instituteAmount), 
                                    deptAmount: safeNumber(p.deptAmount), 
                                    collectedAmount: safeNumber(p.collectedAmount), 
                                    completionStatus: safeBoolean(p.completionStatus) 
                                };
                                
                                if (exists) { 
                                    await updateProject(clean as Project); 
                                    up++; 
                                    uIds.push(pid); 
                                } else { 
                                    const res = await createProject(clean); 
                                    s++; 
                                    aIds.push(res.id); 
                                }
                            } else if (type === 'users') {
                                const u: any = {}; 
                                Object.entries(USER_FIELD_MAPPING).forEach(([cn, en]) => u[en] = row[cn]);
                                if (!u.name) u.name = '新用户';
                                if (!u.role) u.role = 'user';
                                const exists = users.find(ex => String(ex.id) === String(u.id));
                                exists ? (await updateUser(u), up++, uIds.push(u.id)) : (await createUser(u), s++, aIds.push(u.id));
                            }
                        } catch(err: any) { 
                            er++; 
                            const errorDetail = { 
                                id: row["项目ID"] || row["项目名称"] || row["用户ID"] || `第 ${i+1} 行`, 
                                reason: err.message || '未知错误' 
                            };
                            fIds.push(errorDetail); 
                        }
                        setImportProgress(Math.round(((i+1)/total)*100)); 
                        setImportStats({ success: s, updated: up, error: er, total, processed: i+1 });
                    }
                    const res = { time: new Date().toLocaleString(), success: s, updated: up, error: er, addedIds: aIds, updatedIds: uIds, failedIds: fIds };
                    setLastSyncInfo(res); localStorage.setItem('last_sync', JSON.stringify(res));
                    showToast(`同步完成！新增 ${s} 条，更新 ${up} 条，失败 ${er} 条`);
                } catch(err:any) { showToast(err.message, 'error'); }
                finally { setIsSubmitting(false); onRefreshUsers(); e.target.value = ''; }
            });
        };
        if (file.name.endsWith('.xlsx')) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    };

    const handleDownloadTemplate = (t: string) => {
        let h = Object.keys(t==='projects' ? PROJECT_FIELD_MAPPING : (t==='users' ? USER_FIELD_MAPPING : DICT_FIELD_MAPPING));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h]), "Tpl"); XLSX.writeFile(wb, `template_${t}.xlsx`);
    };

    const handleExportData = async (t: string) => {
        try {
            const data = t === 'projects' ? await fetchProjects() : users;
            const ed = data.map((p: any) => { 
                const r: any = {}; 
                const m = t==='projects'?PROJECT_FIELD_MAPPING:USER_FIELD_MAPPING; 
                Object.entries(m).forEach(([cn, en]) => { 
                    if(en==='annualDataJson') r[cn]=JSON.stringify(p.annualData||[]); 
                    else r[cn]=p[en]; 
                }); 
                return r; 
            });
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(ed);
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, `export_${t}.xlsx`); 
            showToast('导出成功');
        } catch (error) { 
            console.error('Export error:', error);
            showToast('导出失败', 'error'); 
        }
    };

    const applyPresetTheme = async (id: string) => { if (id === 'default') onUpdateThemeCode(''); else { try { const css = await fetchThemeCSS(id); onUpdateThemeCode(css); showToast(`应用成功`); } catch { showToast('失败', 'error'); } } };

    const moveDictItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...localDictItems]; const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setLocalDictItems(newItems);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
            try { await onUpdateDictionary(selectedDictKey, newItems); } catch { showToast('同步失败', 'error'); }
        }, 500);
    };

    const handleAddDictValue = async () => {
        if (!newDictValue.trim()) return; const cur = dictionaries[selectedDictKey] || []; if (cur.some(v => v.label === newDictValue)) return;
        const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]; const newItems = [...cur, { label: newDictValue, bgColor: color.bg, textColor: color.text }];
        setNewDictValue(''); try { await onUpdateDictionary(selectedDictKey, newItems); } catch { showToast('失败', 'error'); }
    };

    const handleDeleteDictValue = (it: any) => {
        confirmCustom('删除', `确定删除 "${it.label}"？`, async () => {
            const rem = (dictionaries[selectedDictKey] || []).filter((v: any) => v.label !== it.label);
            try { await onUpdateDictionary(selectedDictKey, rem); } catch { showToast('失败', 'error'); }
        }, true);
    };

    const [uPage, setUPage] = useState(1); const [uSize, setUSize] = useState(10);
    const paginatedUsers = users.slice((uPage-1)*uSize, uPage*uSize);
    const [lPage, setLPage] = useState(1); const [lSize, setLSize] = useState(10);
    const paginatedLogs = [...logs].reverse().slice((lPage-1)*lSize, lPage*lSize);

    return (
        <div className="space-y-4 animate-in fade-in max-w-6xl relative pb-10 px-2 sm:px-4">
            {isSubmitting && (
                <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4">
                    <div className="bg-card p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 w-full max-w-[400px] border border-primary/20 text-card-foreground">
                        <div className="relative flex items-center justify-center"><Loader2 className="h-16 w-16 text-primary animate-spin opacity-10 absolute" /><span className="text-2xl font-black text-primary">{importProgress}%</span></div>
                        <div className="w-full space-y-4 text-center">
                            <p className="text-sm font-black uppercase">Syncing...</p>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden border"><div className="bg-primary h-full transition-all duration-500" style={{ width: `${importProgress}%` }}/></div>
                            <div className="grid grid-cols-3 gap-2 text-sm font-black uppercase">
                                <div className="bg-primary/5 p-2 rounded-xl">新 {importStats.success}</div><div className="bg-primary/5 p-2 rounded-xl">更 {importStats.updated}</div><div className="bg-destructive/5 p-2 rounded-xl text-destructive">失 {importStats.error}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">系统设置</h2>
            <div className="flex space-x-1 border-b mb-4 overflow-x-auto no-scrollbar">
                {[ { id: 'users', n: '用户权限', i: Shield }, { id: 'dict', n: '字典管理', i: BookOpen }, { id: 'logs', n: '操作日志', i: List }, { id: 'appearance', n: '个性化', i: Palette }, { id: 'ai', n: 'AI 配置', i: Sparkles }, { id: 'system', n: '同步中心', i: Database } ].map(t => (
                    (t.id === 'appearance' || t.id === 'ai' || isAdmin) && (
                        <button key={t.id} onClick={() => changeTab(t.id as any)} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><t.i className="h-4 w-4" /> {t.n}</button>
                    )
                ))}
            </div>

            <div className="animate-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'ai' && (
                    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 relative overflow-hidden">
                        <div className="flex items-center gap-3 border-b pb-6 bg-muted/20 -mx-6 px-6">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold tracking-tight">AI 智能助手配置</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">接入 DeepSeek 大模型，实现基于项目数据的智能问答</p>
                            </div>
                        </div>

                        <div className="max-w-2xl space-y-6 py-4">
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-foreground uppercase tracking-wider">DeepSeek API Key</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="password" 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="sk-..." 
                                        className="flex-1 h-12 px-4 rounded-xl border bg-muted/50 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                    <button 
                                        onClick={saveApiKey}
                                        className="px-8 bg-primary text-white rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                                    >
                                        保存配置
                                    </button>
                                </div>
                                <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/30 border border-border">
                                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        <p className="font-bold text-foreground mb-1">如何获取 Key？</p>
                                        您可以在 <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">DeepSeek 开放平台</a> 注册并创建 API Key。
                                        <br />Key 将安全地保存在您的浏览器本地存储（LocalStorage）中，不会上传到我们的服务器。
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                                <h4 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" /> 助手核心能力
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground">数据分析</p>
                                        <p className="text-[11px] text-muted-foreground">自动汇总各组项目进度、收款情况及负责人信息。</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground">实时同步</p>
                                        <p className="text-[11px] text-muted-foreground">回答始终基于当前数据库的最新版本，无滞后。</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground">精细决策</p>
                                        <p className="text-[11px] text-muted-foreground">询问“哪些项目超期”或“下月收款预测”，快速获取答案。</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground">隐私保护</p>
                                        <p className="text-[11px] text-muted-foreground">仅使用项目相关数据作为上下文，不触及用户敏感隐私。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'users' && (
                    <div className="rounded-xl border bg-card p-4 shadow-sm overflow-hidden space-y-4">
                        <div className="flex items-center justify-between"><h3 className="text-lg font-black">账号管理</h3><button onClick={() => {setEditingUser({}); setIsUserModalOpen(true);}} className="h-8 px-4 bg-primary text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Plus className="h-4 w-4"/>添加</button></div>
                        <div className="rounded-xl border overflow-x-auto shadow-sm"><table className="w-full text-sm text-left"><thead className="bg-muted text-muted-foreground font-bold uppercase tracking-wider"><tr><th className="p-3">姓名</th><th className="p-3">角色</th><th className="p-3">部门</th><th className="p-3 text-right">操作</th></tr></thead><tbody className="divide-y">{paginatedUsers.map(u => (<tr key={u.id} className="hover:bg-muted/30 transition-colors"><td className="p-3 font-bold">{u.name}</td><td className="p-3 text-muted-foreground">{u.role}</td><td className="p-3 text-muted-foreground font-medium">{u.department || '-'}</td><td className="p-3 text-right"><button onClick={() => {setEditingUser(u); setIsUserModalOpen(true);}} className="p-1.5 hover:bg-primary/10 rounded-full text-primary transition-all"><Edit className="h-4 w-4" /></button></td></tr>))}</tbody></table></div>
                        <div className="flex items-center justify-between text-sm font-bold text-muted-foreground uppercase"><span>共 {users.length} 条</span><div className="flex items-center gap-2"><button disabled={uPage===1} onClick={()=>setUPage(p=>p-1)} className="p-1 border rounded"><ChevronLeft className="h-4 w-4"/></button><span>{uPage} / {Math.ceil(users.length/uSize)||1}</span><button disabled={uPage>=Math.ceil(users.length/uSize)} onClick={()=>setUPage(p=>p+1)} className="p-1 border rounded"><ChevronRight className="h-4 w-4"/></button></div></div>
                    </div>
                )}

                {activeTab === 'dict' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-2">{Object.keys(dictionaries).map(k => (<button key={k} onClick={() => changeDict(k)} className={`whitespace-nowrap text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedDictKey === k ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}>{k}</button>))}</div>
                        <div className="md:col-span-3 rounded-2xl border bg-card p-4 shadow-sm space-y-4">
                            <h3 className="text-lg font-black">{selectedDictKey} 列表</h3>
                            <div className="flex gap-2"><input className="flex-1 h-9 px-4 rounded-xl border bg-muted/50 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="新选项..." value={newDictValue} onChange={e => setNewDictValue(e.target.value)}/><button onClick={handleAddDictValue} className="h-9 px-4 bg-primary text-white rounded-xl text-sm font-black">添加</button></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {localDictItems.map((it, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 group transition-all hover:border-primary/30">
                                        <span className={`text-sm px-2 py-0.5 rounded-lg font-bold ${it.bgColor} ${it.textColor}`}>{it.label}</span>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={()=>moveDictItem(idx, 'up')} disabled={idx===0} className="p-1 hover:bg-white rounded text-primary disabled:opacity-10"><ArrowUp className="h-3.5 w-3.5"/></button>
                                            <button onClick={()=>moveDictItem(idx, 'down')} disabled={idx===localDictItems.length-1} className="p-1 hover:bg-white rounded text-primary disabled:opacity-10"><ArrowDown className="h-3.5 w-3.5"/></button>
                                            <button onClick={()=>handleDeleteDictValue(it)} className="p-1 hover:bg-red-50 text-destructive rounded"><X className="h-3.5 w-3.5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="rounded-xl border bg-card p-4 shadow-sm overflow-hidden space-y-4">
                        <h3 className="text-lg font-black">操作日志</h3>
                        <div className="rounded-xl border overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-muted text-muted-foreground font-bold uppercase tracking-wider"><tr><th className="p-3">时间</th><th className="p-3">人员</th><th className="p-3">动作</th><th className="p-3">详情</th></tr></thead><tbody className="divide-y">{paginatedLogs.map(l => (<tr key={l.id} className="hover:bg-muted/20 transition-colors"><td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-sm">{l.userName}</td><td className="p-3 font-bold text-primary">{l.action}</td><td className="p-3 text-sm">{l.details}</td></tr>))}</tbody></table></div>
                        <div className="flex items-center justify-between text-sm font-bold text-muted-foreground uppercase"><span>共 {logs.length} 条</span><div className="flex items-center gap-2"><button disabled={lPage===1} onClick={()=>setLPage(p=>p-1)} className="p-1 border rounded disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button><span>{lPage} / {Math.ceil(logs.length/lSize)||1}</span><button disabled={lPage>=Math.ceil(logs.length/lSize)} onClick={()=>setLPage(p=>p+1)} className="p-1 border rounded disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button></div></div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm"><Database className="h-5 w-5" /></div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">智能同步中心</h3></div>
                                {lastSyncInfo && (<div className="bg-muted p-2 rounded-2xl border border-dashed flex items-center gap-2 text-sm font-bold text-primary"><History className="h-4 w-4" /><span>{lastSyncInfo.time} | 新+{lastSyncInfo.success} 更+{lastSyncInfo.updated} 失-{lastSyncInfo.error}</span></div>)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                                        <BookOpen className="h-4 w-4" /> 核心字段：年度数据 (JSON) 指南
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            此字段决定项目在哪个年份显示及金额。请务必使用以下格式：
                                        </p>
                                        <pre className="bg-white/50 p-3 rounded-xl border border-primary/10 text-[10px] font-mono text-primary overflow-x-auto">
                                            {"[\n  {\n    \"year\": 2025,\n    \"contractAmount\": 10000,\n    \"collectedAmount\": 5000\n  }\n]"}
                                        </pre>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            * 注意：必须是英文双引号，[] 包裹 {}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                                        <Shield className="h-4 w-4" /> 导入规则说明
                                    </div>
                                    <ul className="text-[11px] text-muted-foreground space-y-2 list-disc list-inside">
                                        <li><strong className="text-foreground">项目ID</strong> 是唯一身份证，系统靠它识别更新。</li>
                                        <li>如果 ID 已存在：系统将用 Excel 中的内容覆盖现有数据。</li>
                                        <li>如果 ID 不存在：系统将创建一条全新的项目记录。</li>
                                        <li>其他字段（如名称、负责人等）均可不填或后续修改。</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                {[ { t: 'projects', n: '项目数据', c: 'bg-primary' }, { t: 'dictionaries', n: '字典表', c: 'bg-primary/80' }, { t: 'users', n: '用户权限', c: 'bg-primary/60' } ].map(i => (
                                    <div key={i.t} className="p-5 rounded-2xl border bg-card flex flex-col justify-between hover:shadow-md transition-all">
                                        <div className="mb-4"><div className={`h-8 w-8 rounded-lg ${i.c} flex items-center justify-center text-white mb-2 shadow-sm`}><FileSpreadsheet className="h-4 w-4" /></div><h4 className="font-bold text-lg">{i.n}</h4></div>
                                        <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><button onClick={() => handleDownloadTemplate(i.t)} className="h-8 border bg-muted py-1 rounded-lg text-sm font-bold hover:bg-muted transition-all">模板</button><button onClick={() => handleExportData(i.t)} className="h-8 border bg-muted py-1 rounded-lg text-sm font-bold hover:bg-muted transition-all">备份</button></div><label className="w-full flex items-center justify-center h-10 rounded-xl text-sm font-black bg-primary text-white hover:opacity-90 cursor-pointer transition-all active:scale-95 shadow-sm"><Upload className="h-4 w-4 mr-2" />同步导入<input type="file" accept=".json, .xlsx" className="hidden" onChange={e => handleImportData(i.t, e)} /></label></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {lastSyncInfo && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-1000 px-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                                        <History className="h-5 w-5 text-primary" /> 同步历史追溯
                                    </h4>
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">{lastSyncInfo.time}</span>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {[ 
                                        { t: '新增成功', c: 'primary', bg: 'bg-primary/5', border: 'border-primary/20', iconColor: 'text-primary', ids: lastSyncInfo.addedIds, i: CheckCircle }, 
                                        { t: '更新成功', c: 'primary', bg: 'bg-primary/5', border: 'border-primary/20', iconColor: 'text-primary', ids: lastSyncInfo.updatedIds, i: RotateCcw }, 
                                        { t: '同步失败', c: 'destructive', bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600', ids: lastSyncInfo.failedIds, i: AlertCircle } 
                                    ].map(g => (
                                        <div key={g.t} className={`${g.bg} ${g.border} border-2 rounded-[2rem] p-5 space-y-4 shadow-sm`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${g.iconColor} bg-white shadow-sm`}><g.i className="h-4 w-4" /></div>
                                                    <span className={`text-sm font-black uppercase tracking-widest ${g.iconColor}`}>{g.t}</span>
                                                </div>
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white shadow-sm ${g.iconColor}`}>{g.ids.length}</span>
                                            </div>
                                            
                                            <div className="bg-white/60 rounded-2xl border border-white/80 max-h-64 overflow-y-auto p-2 space-y-2 no-scrollbar backdrop-blur-sm">
                                                {g.ids.length === 0 ? (
                                                    <div className="py-12 flex flex-col items-center justify-center opacity-20 italic">
                                                        <CheckCircle className="h-8 w-8 mb-2" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">无数据</p>
                                                    </div>
                                                ) : (
                                                    g.ids.map((it: any, idx: number) => (
                                                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1.5 hover:border-primary/30 transition-all">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-black font-mono truncate max-w-[150px]">{typeof it === 'string' ? it : it.id}</span>
                                                                <span className="text-[9px] text-muted-foreground/50 font-bold uppercase">Record #{idx+1}</span>
                                                            </div>
                                                            {it.reason && (
                                                                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50/50 border border-red-100/50">
                                                                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                                                    <p className="text-[11px] text-red-700 font-bold leading-tight">{it.reason}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-8">
                            <div className="flex items-center gap-3 mb-6"><Monitor className="h-6 w-6 text-primary" /><h3 className="text-xl font-bold">视觉皮肤</h3></div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
                                {[ { id: 'default', n: '系统经典', c: 'bg-pink-500' }, { id: 'amber_minimal', n: '琥珀之光', c: 'bg-amber-500' }, { id: 'bubblegum', n: '糖果', c: 'bg-pink-400' }, { id: 'claude', n: '克劳德', c: 'bg-orange-700' }, { id: 'cyberpunk', n: '不夜城', c: 'bg-blue-400' }, { id: 'nature', n: '自然', c: 'bg-green-600' } ].map(t => (<button key={t.id} onClick={() => applyPresetTheme(t.id)} className="flex flex-col items-center gap-2 group"><div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full ${t.c} shadow-md ring-4 ring-white transition-all group-hover:scale-110 active:scale-95`} /><span className="text-sm font-bold uppercase">{t.n}</span></button>))}
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 relative">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold flex items-center gap-3">自定义 CSS</h3><a href="https://tweakcn.com/editor/theme" target="_blank" rel="noreferrer" className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-2">编辑器 <ExternalLink className="h-3 w-3" /></a></div>
                            <div className="p-3 bg-muted border rounded-xl text-sm font-bold text-muted-foreground uppercase mb-4 leading-relaxed tracking-tight">1. 配置 2. 复制 3. 粘贴</div>
                            <textarea className="w-full h-48 p-4 rounded-2xl border bg-muted/20 text-sm font-mono focus:ring-8 focus:ring-primary/5 outline-none" value={currentThemeCode} onChange={e => onUpdateThemeCode(e.target.value)}/><div className="mt-4 flex justify-end"><button onClick={() => onUpdateThemeCode('')} className="text-sm font-black text-primary hover:underline uppercase tracking-widest">Reset</button></div>
                        </div>
                    </div>
                )}
            </div>

            {isUserModalOpen && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-lg p-4 animate-in fade-in" onClick={() => setIsUserModalOpen(false)}>
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-bold flex items-center gap-3">账号设置</h3><button onClick={() => setIsUserModalOpen(false)}><X className="h-6 w-6"/></button></div>
                        <form onSubmit={handleSaveUser} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-sm font-bold text-muted-foreground uppercase">姓名</label><input required className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div><div className="space-y-1"><label className="text-sm font-bold text-muted-foreground uppercase">密码</label><input required type="text" className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} /></div></div>
                            <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-sm font-bold text-muted-foreground uppercase">角色</label><select className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}><option value="user">职员</option><option value="manager">经理</option><option value="admin">管理员</option></select></div><div className="space-y-1"><label className="text-sm font-bold text-muted-foreground uppercase">部门</label><select className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value as any})}><option value="">全院</option>{Object.values(Department).map(d => (<option key={d} value={d}>{d}</option>))}</select></div></div>
                            <div className="pt-8 flex justify-end gap-4 border-t"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-8 py-2 border rounded-xl font-bold text-sm hover:bg-muted transition-all text-muted-foreground">Cancel</button><button type="submit" disabled={isSubmitting} className="px-10 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-xl hover:opacity-90">Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-10 py-5 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-10 flex items-center gap-4 ${toast.type === 'success' ? 'bg-primary text-white' : 'bg-destructive text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}<span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Settings;