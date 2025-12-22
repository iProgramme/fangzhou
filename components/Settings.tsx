import React, { useState, useMemo } from 'react';
import { Save, RotateCcw, Shield, Database, User as UserIcon, Plus, X, Edit, Trash2, CheckCircle, AlertCircle, List, BookOpen, Clock, Palette, Download, Upload, FileJson, Monitor, ExternalLink, FileSpreadsheet, File, ChevronLeft, ChevronRight, Loader2, Info, AlertTriangle, History, ArrowRight } from 'lucide-react';
import { User, Department, OperationLog, SystemDictionary, DictItem, Project } from '../types';
import { TAG_COLORS } from '../services/mockData';
import { createUser, updateUser, deleteUser as deleteUserApi, fetchProjects, createProject, updateProject, fetchThemeCSS } from '../services/api';
import * as XLSX from 'xlsx';

const PROJECT_FIELD_MAPPING: Record<string, keyof Project | 'annualDataJson'> = { "项目ID": "id", "项目阶段": "stage", "所属部门": "department", "项目负责人": "responsiblePerson", "地区": "region", "项目类别": "category", "三审类型": "threeReviewType", "项目来源": "source", "合同编号": "contractNo", "合同状态": "contractStatus", "项目名称": "name", "甲方名称": "clientName", "客户类型": "clientType", "可能性": "probability", "工作进展": "workProgress", "备注": "remarks", "签订方式": "signingMethod", "签订日期": "signingDate", "联合体单位": "consortium", "项目类型": "type", "总合同额": "totalAmount", "我院合同额": "instituteAmount", "我所合同额": "deptAmount", "收款进度": "paymentProgress", "已收款": "collectedAmount", "下一步计划": "nextPlan", "团队成员": "teamMembers", "收款目标": "collectionTarget", "收款等级": "paymentLevel", "完成情况": "completionStatus", "合同位置": "contractLocation", "进度情况": "progressStatus", "年度数据(JSON)": "annualDataJson" };
const USER_FIELD_MAPPING: Record<string, keyof User> = { "用户ID": "id", "姓名": "name", "邮箱": "email", "角色": "role", "部门": "department", "状态": "status", "密码": "password" };
const DICT_FIELD_MAPPING = { "字典类型": "type", "选项名称": "label", "背景颜色": "bgColor", "文字颜色": "textColor" };

const safeNumber = (val: any): number => { if (val === undefined || val === null || val === '') return 0; if (typeof val === 'number') return val; const cleaned = String(val).replace(/[¥, \s]/g, ''); const num = parseFloat(cleaned); return isNaN(num) ? 0 : num; };
const safeBoolean = (val: any): boolean => { if (val === true || val === 'true' || val === 'TRUE' || val === '是' || val === '1' || val === 1 || val === '√') return true; return false; };

interface SettingsProps { users: User[]; currentUser: User | null; onRefreshUsers: () => void; logs: OperationLog[]; dictionaries: SystemDictionary; onUpdateDictionary: (key: string, values: DictItem[]) => void; currentThemeCode: string; onUpdateThemeCode: (code: string) => void; confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void; }

const Settings: React.FC<SettingsProps> = ({ users, currentUser, onRefreshUsers, logs, dictionaries, onUpdateDictionary, currentThemeCode, onUpdateThemeCode, confirmCustom }) => {
    const isAdmin = currentUser?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs' | 'dict' | 'appearance'>(isAdmin ? 'users' : 'appearance');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStats, setImportStats] = useState({ success: 0, updated: 0, error: 0, total: 0, processed: 0 });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [lastSyncInfo, setLastSyncInfo] = useState<{ time: string, type: string, success: number, updated: number, error: number, addedIds: string[], updatedIds: string[], failedIds: {id: string, reason: string}[] } | null>(() => { const saved = localStorage.getItem('last_sync_info'); return saved ? JSON.parse(saved) : null; });
    const VALID_STAGES = ['前期项目跟进', '年度收款计划', '各组项目列表及进度', '已完成项目'];
    const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 5000); };

    const handleImportData = (type: 'projects' | 'dictionaries' | 'users', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const processImport = async (importedData: any) => {
            confirmCustom(`确认开始同步`, `系统将自动匹配 ID。现有数据将更新，新数据将创建。`, async () => {
                setLastSyncInfo(null); localStorage.removeItem('last_sync_info'); setIsSubmitting(true); setImportProgress(0);
                let [s, up, er] = [0, 0, 0]; let addedIds: string[] = []; let updatedIds: string[] = []; let failedIds: {id: string, reason: string}[] = [];
                try {
                    if (type === 'dictionaries') {
                        const keys = Object.keys(importedData); const total = keys.length;
                        for (let i = 0; i < total; i++) {
                            const k = keys[i]; try { const current = dictionaries[k] || []; const labs = new Set(current.map(item => item.label)); const items = importedData[k] as DictItem[]; const news = items.filter(item => !labs.has(item.label)); if (news.length > 0) { await onUpdateDictionary(k, [...current, ...news]); s += news.length; addedIds.push(`${k}`); } else { updatedIds.push(k); up++; } } catch (err: any) { er++; failedIds.push({id: k, reason: err.message}); }
                            setImportProgress(Math.round(((i+1)/total)*100)); setImportStats({ success: s, updated: up, error: er, total, processed: i+1 });
                        }
                    } else if (type === 'users') {
                        const dataList = importedData as User[]; const total = dataList.length;
                        for (let i = 0; i < total; i++) {
                            const u = dataList[i]; const uid = String(u.id || u.name || '未知'); try { const exists = users.find(ex => String(ex.id) === String(u.id)); exists ? (await updateUser(u), up++, updatedIds.push(uid)) : (await createUser(u), s++, addedIds.push(uid)); } catch (err: any) { er++; failedIds.push({id: uid, reason: err.message}); }
                            setImportProgress(Math.round(((i+1)/total)*100)); setImportStats({ success: s, updated: up, error: er, total, processed: i+1 });
                        }
                    } else if (type === 'projects') {
                        const curProjs = await fetchProjects(); const dataList = importedData as Project[]; const total = dataList.length;
                        for (let i = 0; i < total; i++) {
                            const p = dataList[i]; const pid = String(p.id || '').trim() || '缺失ID'; try { if (!VALID_STAGES.includes(p.stage)) throw new Error(`阶段不合法`); const exists = pid !== '缺失ID' ? curProjs.find(ex => String(ex.id) === pid) : null; const clean = { ...p, id: pid === '缺失ID' ? undefined : pid, totalAmount: safeNumber(p.totalAmount), instituteAmount: safeNumber(p.instituteAmount), deptAmount: safeNumber(p.deptAmount), collectedAmount: safeNumber(p.collectedAmount), completionStatus: safeBoolean(p.completionStatus) }; if (exists) { await updateProject(clean as Project); up++; updatedIds.push(pid); } else { const created = await createProject(clean); s++; addedIds.push(created.id); } } catch (err: any) { er++; failedIds.push({id: pid, reason: err.message}); }
                            setImportProgress(Math.round(((i+1)/total)*100)); setImportStats({ success: s, updated: up, error: er, total, processed: i+1 });
                        }
                    }
                    const res = { time: new Date().toLocaleString(), type: type === 'projects' ? '项目' : '其他', success: s, updated: up, error: er, addedIds, updatedIds, failedIds };
                    setLastSyncInfo(res); localStorage.setItem('last_sync_info', JSON.stringify(res)); showToast(`同步完成`);
                } catch (err: any) { showToast(`错误: ${err.message}`, 'error'); } finally { setIsSubmitting(false); onRefreshUsers(); e.target.value = ''; }
            });
        };
        const reader = new FileReader();
        if (file.name.endsWith('.xlsx')) {
            reader.onload = (ev) => { try { const wb = XLSX.read(ev.target?.result, { type: 'array' }); const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); let mapped: any = []; if (type === 'projects') mapped = json.map((r: any) => { const p: any = {}; Object.entries(PROJECT_FIELD_MAPPING).forEach(([cn, en]) => { if (en === 'annualDataJson') try { p.annualData = JSON.parse(String(r[cn])); } catch { p.annualData = []; } else p[en] = r[cn]; }); return p; }); else if (type === 'users') mapped = json.map((r: any) => { const u: any = {}; Object.entries(USER_FIELD_MAPPING).forEach(([cn, en]) => { u[en] = r[cn]; }); return u; }); processImport(mapped); } catch { showToast('解析失败', 'error'); } };
            reader.readAsArrayBuffer(file);
        } else { reader.onload = (ev) => { try { processImport(JSON.parse(ev.target?.result as string)); } catch { showToast('JSON解析失败', 'error'); } }; reader.readAsText(file); }
    };

    const handleDownloadTemplate = (type: any) => { let h: string[] = []; if (type === 'projects') h = Object.keys(PROJECT_FIELD_MAPPING); else if (type === 'users') h = Object.keys(USER_FIELD_MAPPING); else h = Object.keys(DICT_FIELD_MAPPING); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h]), "Tpl"); XLSX.writeFile(wb, `template_${type}.xlsx`); };
    const handleExportData = async (type: any) => { try { const data = type === 'projects' ? await fetchProjects() : users; const ed = data.map((p: any) => { const r: any = {}; const map = type === 'projects' ? PROJECT_FIELD_MAPPING : USER_FIELD_MAPPING; Object.entries(map).forEach(([cn, en]) => { if (en === 'annualDataJson') r[cn] = JSON.stringify(p.annualData || []); else r[cn] = p[en]; }); return r; }); XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(ed), "Data"), `export_${type}.xlsx`); showToast('导出成功'); } catch { showToast('导出失败', 'error'); } };
    const applyPresetTheme = async (id: string) => { if (id === 'default') onUpdateThemeCode(''); else { try { const css = await fetchThemeCSS(id); onUpdateThemeCode(css); showToast(`应用成功`); } catch { showToast('失败', 'error'); } } };

    const [userPage, setUserPage] = useState(1); const [userPageSize, setUserPageSize] = useState(10);
    const paginatedUsers = useMemo(() => users.slice((userPage-1)*userPageSize, userPage*userPageSize), [users, userPage, userPageSize]);
    const [logPage, setLogPage] = useState(1); const [logPageSize, setLogPageSize] = useState(10);
    const paginatedLogs = useMemo(() => [...logs].reverse().slice((logPage-1)*logPageSize, logPage*logPageSize), [logs, logPage, logPageSize]);
    const [selectedDictKey, setSelectedDictKey] = useState<string>(Object.keys(dictionaries)[0] || '地区');
    const [newDictValue, setNewDictValue] = useState('');
    const handleAddDictValue = () => { if (!newDictValue.trim()) return; const cur = dictionaries[selectedDictKey] || []; if (cur.some(v => v.label === newDictValue)) return; onUpdateDictionary(selectedDictKey, [...cur, { label: newDictValue, bgColor: TAG_COLORS[0].bg, textColor: TAG_COLORS[0].text }]); setNewDictValue(''); };
    const handleDeleteDictValue = (it: any) => confirmCustom('删除', `确定删除?`, () => onUpdateDictionary(selectedDictKey, dictionaries[selectedDictKey].filter(v => v.label !== it.label)), true);
    const handleSaveUser = async (e: any) => { e.preventDefault(); setIsSubmitting(true); try { editingUser.id ? await updateUser(editingUser as User) : await createUser(editingUser); onRefreshUsers(); setIsUserModalOpen(false); showToast('成功'); } catch { showToast('失败', 'error'); } finally { setIsSubmitting(false); } };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-6xl relative pb-10 px-2 sm:px-4">
            {isSubmitting && (
                <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4">
                    <div className="bg-card p-6 sm:p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-full max-w-[400px] border border-primary/20">
                        <div className="relative flex items-center justify-center"><Loader2 className="h-16 w-16 text-primary animate-spin opacity-10 absolute" /><span className="text-2xl font-black text-primary">{importProgress}%</span></div>
                        <div className="w-full space-y-4 text-center">
                            <p className="text-sm font-black uppercase tracking-tighter">Syncing Data...</p>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden border"><div className="bg-primary h-full transition-all duration-500" style={{ width: `${importProgress}%` }}/></div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-primary/5 p-2 rounded-xl border border-primary/10"><p className="text-[11px] font-black text-primary uppercase">New</p><p className="text-lg font-black">{importStats.success}</p></div>
                                <div className="bg-primary/5 p-2 rounded-xl border border-primary/10"><p className="text-[11px] font-black text-primary uppercase">Upd</p><p className="text-lg font-black">{importStats.updated}</p></div>
                                <div className="bg-destructive/5 p-2 rounded-xl border border-destructive/10"><p className="text-[11px] font-black text-destructive uppercase">Err</p><p className="text-lg font-black text-destructive">{importStats.error}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-black tracking-tighter mb-4">系统设置</h2>
            <div className="flex space-x-1 border-b mb-4 overflow-x-auto no-scrollbar">
                {[ { id: 'users', n: '用户权限', i: Shield }, { id: 'dict', n: '字典管理', i: BookOpen }, { id: 'logs', n: '操作日志', i: List }, { id: 'appearance', n: '个性化', i: Palette }, { id: 'system', n: '同步中心', i: Database } ].map(t => (
                    (t.id === 'appearance' || isAdmin) && (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}><t.i className="h-4 w-4" /> {t.n}</button>
                    )
                ))}
            </div>

            <div className="animate-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'users' && (
                    <div className="rounded-2xl border bg-card p-4 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-black">账号管理</h3><button onClick={() => {setEditingUser({}); setIsUserModalOpen(true);}} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-black shadow-sm"><Plus className="h-4 w-4" />添加</button></div>
                        <div className="rounded-xl border overflow-x-auto shadow-sm"><table className="w-full text-sm text-left"><thead className="bg-muted font-black uppercase text-sm tracking-widest text-muted-foreground"><tr><th className="p-3">姓名</th><th className="p-3">角色</th><th className="p-3">部门</th><th className="p-3 text-right">操作</th></tr></thead><tbody className="divide-y">{paginatedUsers.map(u => (<tr key={u.id} className="hover:bg-muted/30 transition-colors"><td className="p-3 font-bold">{u.name}</td><td className="p-3 text-muted-foreground text-sm">{u.role}</td><td className="p-3 text-muted-foreground font-medium text-sm">{u.department || '-'}</td><td className="p-3 text-right"><button onClick={() => {setEditingUser(u); setIsUserModalOpen(true);}} className="p-1.5 hover:bg-primary/10 rounded-full text-primary transition-all"><Edit className="h-4 w-4" /></button></td></tr>))}</tbody></table></div>
                        <div className="flex items-center justify-between mt-4 text-sm font-bold text-muted-foreground uppercase">
                            <div className="flex items-center gap-4">TOTAL: {users.length} <select className="border rounded-md px-1.5 py-0.5 bg-transparent" value={userPageSize} onChange={e => {setUserPageSize(Number(e.target.value)); setUserPage(1);}}>{[10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div className="flex items-center gap-2"><button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-1 border rounded disabled:opacity-20"><ChevronLeft className="h-4 w-4"/></button><span>{userPage} / {Math.ceil(users.length / userPageSize) || 1}</span><button disabled={userPage >= Math.ceil(users.length / userPageSize)} onClick={() => setUserPage(p => p + 1)} className="p-1 border rounded disabled:opacity-20"><ChevronRight className="h-4 w-4"/></button></div>
                        </div>
                    </div>
                )}

                {activeTab === 'dict' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0">{Object.keys(dictionaries).map(k => (<button key={k} onClick={() => setSelectedDictKey(k)} className={`whitespace-nowrap text-left px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${selectedDictKey === k ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}>{k}</button>))}</div>
                        <div className="md:col-span-3 rounded-2xl border bg-card p-4 shadow-sm"><h3 className="text-lg font-bold mb-4 flex items-center gap-2">{selectedDictKey}</h3><div className="flex gap-2 mb-6"><input className="flex-1 h-9 px-4 rounded-xl border bg-muted/50 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="新选项..." value={newDictValue} onChange={e => setNewDictValue(e.target.value)}/><button onClick={handleAddDictValue} className="px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold">添加</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{dictionaries[selectedDictKey]?.map((it, idx) => (<div key={idx} className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 group"><span className={`text-sm px-2 py-0.5 rounded-lg font-bold ${it.bgColor} ${it.textColor}`}>{it.label}</span><button onClick={() => handleDeleteDictValue(it)} className="opacity-0 group-hover:opacity-100 p-1 text-destructive rounded-md"><X className="h-4 w-4"/></button></div>))}</div></div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="rounded-2xl border bg-card p-4 shadow-sm overflow-hidden"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />系统日志</h3><div className="rounded-xl border overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-muted text-muted-foreground font-black uppercase text-sm tracking-wider"><tr><th className="p-3">时间</th><th className="p-3">人员</th><th className="p-3">动作</th><th className="p-3">详情</th></tr></thead><tbody className="divide-y">{paginatedLogs.map(l => (<tr key={l.id} className="hover:bg-muted/20 transition-colors"><td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-sm">{l.userName}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-sm font-black ${l.action === 'CREATE' ? 'text-primary' : 'text-muted-foreground'}`}>{l.action}</span></td><td className="p-3 text-sm">{l.details}</td></tr>))}</tbody></table></div><div className="flex items-center justify-between mt-4 text-sm font-bold text-muted-foreground uppercase"><div className="flex items-center gap-4">TOTAL: {logs.length} <select className="border rounded-md px-1 py-0.5 bg-transparent" value={logPageSize} onChange={e => {setLogPageSize(Number(e.target.value)); setLogPage(1);}}>{[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="flex items-center gap-2"><button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="p-1 border rounded disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button><span>{logPage} / {Math.ceil(logs.length / logPageSize) || 1}</span><button disabled={logPage >= Math.ceil(logs.length / logPageSize)} onClick={() => setLogPage(p => p + 1)} className="p-1 border rounded disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button></div></div></div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border bg-card p-6 shadow-sm relative overflow-hidden">
                            <div className="space-y-6 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm"><Database className="h-5 w-5" /></div><h3 className="text-xl sm:text-2xl font-black tracking-tight">智能同步</h3></div>{lastSyncInfo && (<div className="bg-muted p-2 rounded-2xl border border-dashed flex items-center gap-3 animate-in fade-in"><div className="space-y-0.5 text-right sm:text-left"><p className="text-sm font-black text-primary">新 +{lastSyncInfo.success} 更 +{lastSyncInfo.updated} 失 -{lastSyncInfo.error}</p><p className="text-sm text-muted-foreground">{lastSyncInfo.time}</p></div></div>)}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex gap-4"><Info className="h-5 w-5 text-primary shrink-0 mt-1" /><div className="space-y-1"><p className="font-black text-primary uppercase text-sm">匹配规则</p><ul className="text-sm text-muted-foreground space-y-0.5 font-bold leading-relaxed"><li>• ID 自动识别：存在更新，不存在创建</li><li>• 其余数据：保持原样不改动</li></ul></div></div>
                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-4"><AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-1" /><div className="space-y-1"><p className="font-black text-primary uppercase text-sm">重要建议</p><p className="text-sm text-muted-foreground font-bold leading-relaxed underline">请务必使用本页下载的【Excel 模板】。项目阶段、部门必须与字典一致。</p></div></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 relative z-10">
                                {[ { t: 'projects', n: '项目数据', c: 'bg-primary' }, { t: 'dictionaries', n: '系统字典', c: 'bg-primary/80' }, { t: 'users', n: '用户权限', c: 'bg-primary/60' } ].map(i => (
                                    <div key={i.t} className="p-5 rounded-2xl border bg-card flex flex-col justify-between hover:shadow-md transition-all"><div className="mb-4"><div className={`h-8 w-8 rounded-lg ${i.c} flex items-center justify-center text-primary-foreground mb-2 shadow-sm`}><FileSpreadsheet className="h-4 w-4" /></div><h4 className="font-black text-lg tracking-tight leading-tight">{i.n}</h4></div><div className="space-y-2"><div className="grid grid-cols-2 gap-2"><button onClick={() => handleDownloadTemplate(i.t)} className="flex items-center justify-center gap-2 border bg-muted py-1.5 rounded-lg text-sm font-bold hover:bg-muted/80 transition-all">模板</button><button onClick={() => handleExportData(i.t)} className="flex items-center justify-center gap-2 border bg-muted py-1.5 rounded-lg text-sm font-bold hover:bg-muted/80 transition-all">备份</button></div><label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black bg-primary text-primary-foreground hover:opacity-90 cursor-pointer shadow-md transition-all active:scale-95"><Upload className="h-4 w-4" />同步导入<input type="file" accept=".json, .xlsx" className="hidden" onChange={e => handleImportData(i.t as any, e)} /></label></div></div>
                                ))}
                            </div>
                        </div>
                        {lastSyncInfo && (
                            <div className="animate-in slide-in-from-bottom-4 duration-1000">
                                <h4 className="text-lg font-black mb-4 px-2">同步明细追溯</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {[ { t: '新增', c: 'primary', ids: lastSyncInfo.addedIds, i: CheckCircle }, { t: '更新', c: 'primary', ids: lastSyncInfo.updatedIds, i: RotateCcw }, { t: '失败', c: 'destructive', ids: lastSyncInfo.failedIds, i: AlertCircle } ].map(group => (
                                        <div key={group.t} className={`bg-muted/20 border border-primary/5 rounded-2xl p-4 space-y-3`}>
                                            <div className="flex items-center justify-between px-1 text-sm font-black uppercase text-muted-foreground"><p className="flex items-center gap-2"><group.i className={`h-4 w-4 text-${group.c}`} /> {group.t}</p><span>{group.ids.length}</span></div>
                                            <div className="bg-card rounded-xl border max-h-48 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
                                                {group.ids.length === 0 ? (<p className="text-center py-8 text-sm font-black opacity-20 italic">EMPTY</p>) : 
                                                group.ids.map((item: any, idx: number) => (<div key={idx} className="bg-muted/30 p-2 rounded-lg flex flex-col gap-0.5 border border-transparent hover:border-primary/20 transition-all"><p className="font-mono text-sm font-black truncate">{typeof item === 'string' ? item : item.id}</p>{item.reason && <p className="text-sm text-destructive font-bold leading-tight">{item.reason}</p>}</div>))}
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
                        <div className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex items-center gap-3 mb-6"><Monitor className="h-6 w-6 text-primary" /><h3 className="text-xl font-black">主题皮肤</h3></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">{[ { id: 'default', n: '经典', c: 'bg-pink-500' }, { id: 'amber_minimal', n: '琥珀', c: 'bg-amber-500' }, { id: 'bubblegum', n: '糖果', c: 'bg-pink-400' }, { id: 'claude', n: '克劳德', c: 'bg-orange-700' }, { id: 'cyberpunk', n: '不夜城', c: 'bg-blue-400' }, { id: 'nature', n: '自然', c: 'bg-green-600' } ].map(t => (<button key={t.id} onClick={() => applyPresetTheme(t.id)} className="flex flex-col items-center gap-2 group"><div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full ${t.c} shadow-md ring-4 ring-white transition-all group-hover:scale-110 active:scale-95`} /><span className="text-sm font-black uppercase">{t.n}</span></button>))}</div></div>
                        <div className="rounded-2xl border bg-card p-6 shadow-sm relative"><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-black">自定义 CSS</h3><a href="https://tweakcn.com/editor/theme" target="_blank" rel="noreferrer" className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2">编辑器 <ExternalLink className="h-3 w-3" /></a></div><div className="p-3 bg-muted border rounded-xl text-sm font-bold text-muted-foreground uppercase mb-4 leading-relaxed tracking-tight">1. 配置  2. 复制  3. 粘贴</div><textarea className="w-full h-48 p-4 rounded-2xl border bg-muted/20 text-sm font-mono focus:ring-[8px] focus:ring-primary/5 outline-none" value={currentThemeCode} onChange={e => onUpdateThemeCode(e.target.value)}/><div className="mt-4 flex justify-end"><button onClick={() => onUpdateThemeCode('')} className="text-sm font-black text-primary hover:underline uppercase">RESET</button></div></div>
                    </div>
                )}
            </div>

            {isUserModalOpen && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-lg p-4 animate-in fade-in" onClick={() => setIsUserModalOpen(false)}>
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8"><h3 className="text-xl font-black flex items-center gap-3">账号设置</h3><button onClick={() => setIsUserModalOpen(false)}><X className="h-6 w-6"/></button></div>
                        <form onSubmit={handleSaveUser} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-sm font-black uppercase text-muted-foreground">姓名</label><input required className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div><div className="space-y-1"><label className="text-sm font-black uppercase text-muted-foreground">密码</label><input required type="text" className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} /></div></div>
                            <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-sm font-black uppercase text-muted-foreground">角色</label><select className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none" value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}><option value="user">职员</option><option value="manager">经理</option><option value="admin">管理员</option></select></div><div className="space-y-1"><label className="text-sm font-black uppercase text-muted-foreground">部门</label><select className="h-10 w-full rounded-xl border bg-muted px-3 text-sm font-bold outline-none" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value as any})}><option value="">全院</option>{Object.values(Department).map(d => (<option key={d} value={d}>{d}</option>))}</select></div></div>
                            <div className="pt-6 flex justify-end gap-3 border-t"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-2 rounded-xl border font-black text-sm hover:bg-muted">CANCEL</button><button type="submit" disabled={isSubmitting} className="px-8 py-2 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-md">CONFIRM</button></div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 flex items-center gap-4 ${toast.type === 'success' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}<span className="font-black text-sm">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Settings;