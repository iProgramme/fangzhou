import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, SystemDictionary, AnnualData, TimelineEvent } from '../types';
import { Search, SlidersHorizontal, Plus, Eye, Edit, Trash2, X, FileText, Check, X as XIcon, Calendar, Coins, Filter, History, Milestone, Clock, MessageSquare, Tag, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { nanoid } from 'nanoid';

export interface ColumnDef {
  key: keyof Project | 'actions' | 'annualContract' | 'annualCollection';
  header: string;
  render?: (value: any, row: Project) => React.ReactNode;
  inputType?: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean';
  dictKey?: string;
}

interface ProjectTableProps {
  data: Project[]; title?: string; columns: ColumnDef[]; dictionaries?: SystemDictionary; onAddProject?: (newProject: any) => void; onEditProject?: (project: Project) => void; onDeleteProject?: (id: string) => void; showAddButton?: boolean; selectedYear: number; availableYears: number[]; onSelectYear: (year: number) => void; confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const formatMoney = (val: any) => val ? `¥${Number(val).toLocaleString()}` : '-';

const ProjectTable: React.FC<ProjectTableProps> = ({ 
    data, title, columns, dictionaries, onAddProject, onEditProject, onDeleteProject,
    showAddButton, selectedYear, availableYears, onSelectYear, confirmCustom
}) => {
  const storageKey = `table_settings_${title || 'default'}`;
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [advancedFilters, setAdvancedFilters] = useState({ contractNo: '', clientName: '', responsiblePerson: '', region: '', category: '', minAmount: '', maxAmount: '' });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  useEffect(() => {
      const saved = localStorage.getItem(storageKey);
      const defaultKeys = columns.map(c => c.key as string);
      if (saved) {
          try {
              const { visible, order } = JSON.parse(saved);
              const validOrder = order.filter((k: string) => defaultKeys.includes(k));
              const finalOrder = [...validOrder, ...defaultKeys.filter(k => !validOrder.includes(k))];
              setColumnOrder(finalOrder); setVisibleColumns(visible.filter((k: string) => defaultKeys.includes(k)));
          } catch { setColumnOrder(defaultKeys); setVisibleColumns(defaultKeys); }
      } else { setColumnOrder(defaultKeys); setVisibleColumns(defaultKeys); }
  }, [title, columns.length]);

  useEffect(() => { if (columnOrder.length > 0) localStorage.setItem(storageKey, JSON.stringify({ visible: visibleColumns, order: columnOrder })); }, [visibleColumns, columnOrder]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentForm, setCurrentForm] = useState<Partial<Project>>({});
  const [formAnnualData, setFormAnnualData] = useState<AnnualData[]>([]);
  const [formTimeline, setFormTimeline] = useState<TimelineEvent[]>([]);
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (columnToggleRef.current && !columnToggleRef.current.contains(e.target as Node)) setShowColumnToggle(false); };
    if (showColumnToggle) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnToggle]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, columnFilters, showAdvancedSearch, advancedFilters, data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
        // 同时匹配名称和项目 ID
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchLower) || 
            item.id.toLowerCase().includes(searchLower);
            
        if (!matchesSearch) return false;
        if (showAdvancedSearch) {
             if (advancedFilters.contractNo && !item.contractNo?.toLowerCase().includes(advancedFilters.contractNo.toLowerCase())) return false;
             if (advancedFilters.clientName && !item.clientName?.toLowerCase().includes(advancedFilters.clientName.toLowerCase())) return false;
             if (advancedFilters.responsiblePerson && !item.responsiblePerson?.toLowerCase().includes(advancedFilters.responsiblePerson.toLowerCase())) return false;
             if (advancedFilters.region && item.region !== advancedFilters.region) return false;
             const amount = item.totalAmount || 0;
             if (advancedFilters.minAmount && amount < Number(advancedFilters.minAmount)) return false;
             if (advancedFilters.maxAmount && amount > Number(advancedFilters.maxAmount)) return false;
        }
        for (const [key, filterVal] of Object.entries(columnFilters)) { if (filterVal && item[key as keyof Project] !== filterVal) return false; }
        return true;
    });
  }, [data, searchTerm, showAdvancedSearch, advancedFilters, columnFilters]);

  const paginatedData = filteredData.slice((currentPage-1)*pageSize, currentPage*pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const moveColumn = (index: number, direction: 'up' | 'down') => {
      const newOrder = [...columnOrder]; const target = direction === 'up' ? index - 1 : index + 1;
      if (target >= 0 && target < newOrder.length) { [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]; setColumnOrder(newOrder); }
  };

  const sortedColumnDefs = useMemo(() => columnOrder.map(key => columns.find(c => c.key === key)).filter(Boolean) as ColumnDef[], [columnOrder, columns]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault(); const final = { ...currentForm, annualData: formAnnualData, timeline: formTimeline };
      modalMode === 'add' ? onAddProject?.(final) : onEditProject?.(final as Project); setIsModalOpen(false);
  };

  const renderDictCell = (value: string, dictKey: string) => {
      if (!value || !dictionaries || !dictionaries[dictKey]) return value || '-';
      const item = dictionaries[dictKey].find(d => d.label === value);
      return item ? <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold ${item.bgColor} ${item.textColor} border border-transparent`}>{value}</span> : value;
  };

  const renderProgressBar = (value: any, row: Project) => {
      // 1. 尝试从 paymentProgress 获取百分比数字
      let percent = 0;
      if (typeof value === 'string' && value.includes('%')) {
          percent = parseFloat(value.replace('%', ''));
      } else if (!isNaN(Number(value)) && value !== null && value !== '') {
          percent = Number(value) <= 1 ? Number(value) * 100 : Number(value);
      } else {
          // 2. 如果字段为空，则自动根据 已收款/合同额 计算
          const total = row.totalAmount || 0;
          const collected = row.collectedAmount || 0;
          percent = total > 0 ? (collected / total) * 100 : 0;
      }

      const safePercent = Math.min(100, Math.max(0, percent));
      
      return (
          <div className="w-32 py-1">
              <div className="flex justify-between text-[9px] font-black mb-1">
                  <span className={safePercent >= 100 ? 'text-green-600' : 'text-primary'}>{safePercent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/20">
                  <div 
                    className={`h-full transition-all duration-1000 ${safePercent >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
                    style={{ width: `${safePercent}%` }}
                  />
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 md:w-56"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="项目名称、ID搜索..." className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className={`h-9 px-3 rounded-lg border text-sm font-bold flex items-center gap-2 ${showAdvancedSearch ? 'bg-primary text-white shadow-sm' : 'bg-background'}`}>高级搜索</button>
            <div className="relative" ref={columnToggleRef}>
                <button onClick={() => setShowColumnToggle(!showColumnToggle)} className="h-9 px-3 rounded-lg border bg-background text-sm font-bold">视图定制</button>
                {showColumnToggle && (
                    <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border bg-white p-3 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-2 border-b pb-2 text-sm font-black text-muted-foreground uppercase"><span>排序与显示</span><button onClick={() => setShowColumnToggle(false)}><X className="h-4 w-4"/></button></div>
                        <div className="space-y-0.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                            {columnOrder.filter(k => k !== 'actions').map((key, idx) => {
                                const col = columns.find(c => c.key === key); if (!col) return null;
                                return (
                                    <div key={key} className="flex items-center gap-2 group p-1.5 hover:bg-muted/50 rounded-md">
                                        <input type="checkbox" checked={visibleColumns.includes(key)} onChange={() => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} className="h-4 w-4" />
                                        <span className="flex-1 text-sm font-medium truncate">{col.header}</span>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100"><button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-white rounded"><ArrowUp className="h-4 w-4"/></button><button onClick={() => moveColumn(idx, 'down')} disabled={idx === columnOrder.length - 2} className="p-1 hover:bg-white rounded"><ArrowDown className="h-4 w-4"/></button></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            {showAddButton && <button onClick={() => {setModalMode('add'); setCurrentForm({}); setIsModalOpen(true);}} className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-black shadow-sm">新增</button>}
        </div>
      </div>

      {showAdvancedSearch && (
          <div className="rounded-xl border bg-card p-4 shadow-sm grid gap-3 md:grid-cols-3 lg:grid-cols-4 animate-in slide-in-from-top-2">
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">合同编号</label><input className="h-8 w-full rounded border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.contractNo} onChange={e => setAdvancedFilters({...advancedFilters, contractNo: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">甲方名称</label><input className="h-8 w-full rounded border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.clientName} onChange={e => setAdvancedFilters({...advancedFilters, clientName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">负责人</label><input className="h-8 w-full rounded border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.responsiblePerson} onChange={e => setAdvancedFilters({...advancedFilters, responsiblePerson: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">地区</label><select className="h-8 w-full rounded border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.region} onChange={e => setAdvancedFilters({...advancedFilters, region: e.target.value})}><option value="">全部</option>{dictionaries?.['地区']?.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}</select></div>
              <div className="space-y-1 md:col-span-2"><label className="text-sm font-black text-muted-foreground uppercase tracking-widest">总额区间</label><div className="flex gap-2"><input type="number" placeholder="MIN" className="h-8 flex-1 rounded border bg-muted/10 px-2 text-sm" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} /><input type="number" placeholder="MAX" className="h-8 flex-1 rounded border bg-muted/10 px-2 text-sm" value={advancedFilters.maxAmount} onChange={e => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})} /></div></div>
              <div className="flex items-end"><button onClick={() => {setSearchTerm(''); setAdvancedFilters({contractNo:'', clientName:'', responsiblePerson:'', region:'', category:'', minAmount:'', maxAmount:''});}} className="h-8 px-3 rounded border border-dashed border-red-200 text-red-500 text-sm font-black w-full text-center">重置</button></div>
          </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="relative w-full overflow-auto" style={{ maxHeight: '65vh' }}>
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="h-10 px-4 font-black text-muted-foreground whitespace-nowrap text-sm uppercase tracking-wider">项目ID</th>
                {sortedColumnDefs.map((col) => {
                    if (col.key === 'id' || (col.key !== 'actions' && !visibleColumns.includes(col.key as string))) return null;
                    let header = col.header; if (col.key === 'annualContract') header = `${selectedYear} 合同`; if (col.key === 'annualCollection') header = `${selectedYear} 收款`;
                    const isFilterable = col.inputType === 'select' && col.dictKey && dictionaries?.[col.dictKey];
                    const activeFilter = columnFilters[col.key as string];
                    return (
                        <th key={col.key as string} className="h-10 px-4 font-black text-muted-foreground whitespace-nowrap text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-1.5"><span>{header}</span>{isFilterable && <div className="relative cursor-pointer"><Filter className={`h-4 w-4 ${activeFilter ? 'text-primary' : 'opacity-30'}`} /><select className="absolute inset-0 opacity-0 cursor-pointer" value={activeFilter || ''} onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.key as string]: e.target.value }))}><option value="">全部</option>{dictionaries![col.dictKey!].map((opt) => (<option key={opt.label} value={opt.label}>{opt.label}</option>))}</select></div>}</div>
                        </th>
                    );
                })}
                <th className="h-10 px-4 text-right sticky right-0 bg-secondary/95 text-sm font-black uppercase tracking-wider text-muted-foreground shadow-[-8px_0_12px_-5px_rgba(0,0,0,0.05)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedData.length === 0 ? (<tr><td colSpan={columns.length + 1} className="p-16 text-center text-muted-foreground font-bold italic">No Data.</td></tr>) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="group hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-4 whitespace-nowrap"><span className="font-mono text-[10px] font-black px-2 py-1 rounded bg-muted/50 text-muted-foreground border border-border/50">{row.id}</span></td>
                    {sortedColumnDefs.map((col) => {
                        if (col.key === 'id' || (col.key !== 'actions' && !visibleColumns.includes(col.key as string))) return null;
                        let cell: React.ReactNode;
                        if (col.key === 'annualContract' || col.key === 'annualCollection') cell = formatMoney(row.annualData?.find(d => d.year === selectedYear)?.[col.key === 'annualContract' ? 'contractAmount' : 'collectedAmount']);
                        else if (col.key === 'paymentProgress') cell = renderProgressBar(row[col.key], row);
                        else if (col.render) cell = col.render(row[col.key as keyof Project], row);
                        else if (col.dictKey) cell = renderDictCell(row[col.key as keyof Project] as string, col.dictKey);
                        else {
                            const val = row[col.key as keyof Project]; cell = (val === true ? <Check className="h-4 w-4 text-green-500" /> : val === false ? <XIcon className="h-4 w-4 text-red-300" /> : (val as React.ReactNode) || '-');
                        }
                        return <td key={col.key as string} className="py-2 px-4 whitespace-nowrap font-bold text-gray-700">{cell}</td>;
                    })}
                    <td className="py-2 px-4 text-right sticky right-0 bg-white/80 backdrop-blur-sm group-hover:bg-muted/80 shadow-[-8px_0_12px_-5px_rgba(0,0,0,0.05)] transition-colors"><div className="flex justify-end gap-1"><button onClick={() => setViewProject(row)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye className="h-4 w-4"/></button><button onClick={() => {setCurrentForm({...row}); setFormAnnualData(row.annualData||[]); setFormTimeline(row.timeline||[]); setModalMode('edit'); setIsModalOpen(true);}} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"><Edit className="h-4 w-4"/></button><button onClick={() => confirmCustom('删除', '确定删除？', () => onDeleteProject?.(row.id), true)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4"/></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 text-sm font-black text-muted-foreground tracking-widest border-t uppercase">
          <div className="flex items-center gap-4"><span>共 {filteredData.length} 条</span><div className="flex items-center gap-1.5"><span>显示:</span><select className="border-none bg-muted rounded px-1.5 py-0.5" value={pageSize} onChange={e => {setPageSize(Number(e.target.value)); setCurrentPage(1);}}>{[10, 20, 50, 100].map(s => (<option key={s} value={s}>{s}</option>))}</select></div></div>
          <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 border rounded-lg hover:bg-muted disabled:opacity-20"><ChevronLeft className="h-4 w-4"/></button>
              <span className="bg-muted px-3 py-1 rounded-lg text-foreground font-black">{currentPage} / {totalPages || 1}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 border rounded-lg hover:bg-muted disabled:opacity-20"><ChevronRight className="h-4 w-4"/></button>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-lg p-4 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
              <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6 border-b pb-4"><h3 className="text-2xl font-black">{modalMode === 'add' ? '创建' : '编辑'}</h3><button onClick={() => setIsModalOpen(false)}><X className="h-6 w-6"/></button></div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-8"><form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                          {columns.filter(c => c.key !== 'actions' && c.key !== 'id' && c.key !== 'annualContract' && c.key !== 'annualCollection').map(col => (
                            <div key={col.key as string} className={`space-y-1.5 ${col.inputType === 'textarea' ? 'col-span-full' : ''}`}>
                                <label className="text-sm font-black uppercase text-muted-foreground tracking-wide">{col.header}</label>
                                {col.inputType === 'select' ? <select className="h-10 w-full rounded-xl border bg-gray-50 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})}><option value="">请选择</option>{dictionaries?.[col.dictKey!]?.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}</select> :
                                 col.inputType === 'textarea' ? <textarea className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-primary/10" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})} /> :
                                 col.inputType === 'boolean' ? <div className="h-10 flex items-center"><input type="checkbox" className="h-6 w-6" checked={!!currentForm[col.key as keyof Project]} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.checked})} /></div> :
                                 <input type={col.inputType === 'number' ? 'number' : col.inputType === 'date' ? 'date' : 'text'} className="h-10 w-full rounded-xl border bg-gray-50 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: col.inputType === 'number' ? parseFloat(e.target.value) : e.target.value})} />}
                            </div>
                          ))}
                          <div className="col-span-full border-t pt-6 mt-4"><div className="flex items-center justify-between mb-4"><h4 className="text-xl font-black flex items-center gap-2"><Coins className="h-6 w-6 text-primary" />年度数据</h4><button type="button" onClick={() => setFormAnnualData([...formAnnualData, {year:selectedYear, contractAmount:0, collectedAmount:0}])} className="text-sm font-black text-primary px-4 py-1.5 bg-primary/10 rounded-full transition-all">+ 新增记录</button></div><div className="bg-gray-50 rounded-2xl p-4 space-y-3">{formAnnualData.map((d, idx) => (<div key={idx} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0"><div className="w-24 space-y-1"><label className="text-[11px] font-black text-muted-foreground uppercase">年份</label><input type="number" className="h-9 w-full bg-white border rounded-xl px-3 text-sm font-bold" value={d.year} onChange={e => {const n=[...formAnnualData]; n[idx].year=Number(e.target.value); setFormAnnualData(n);}} /></div><div className="flex-1 space-y-1"><label className="text-[11px] font-black text-muted-foreground uppercase">合同</label><input type="number" className="h-9 w-full bg-white border rounded-xl px-3 text-sm font-bold" placeholder="合同额" value={d.contractAmount} onChange={e => {const n=[...formAnnualData]; n[idx].contractAmount=Number(e.target.value); setFormAnnualData(n);}} /></div><div className="flex-1 space-y-1"><label className="text-[11px] font-black text-muted-foreground uppercase">收款</label><input type="number" className="h-9 w-full bg-white border rounded-xl px-3 text-sm font-bold" placeholder="收款额" value={d.collectedAmount} onChange={e => {const n=[...formAnnualData]; n[idx].collectedAmount=Number(e.target.value); setFormAnnualData(n);}} /></div><button type="button" onClick={() => setFormAnnualData(formAnnualData.filter((_,i)=>i!==idx))} className="mt-5 h-9 w-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl"><Trash2 className="h-5 w-5"/></button></div>))}</div></div>
                      </form></div>
                      <div className="lg:col-span-4 border-l pl-8 space-y-6"><div className="flex items-center justify-between"><h4 className="text-xl font-black flex items-center gap-2">追踪</h4><button type="button" onClick={() => setFormTimeline([...formTimeline, {id:nanoid(), date:new Date().toISOString().split('T')[0], title:'', description:'', type:'progress'}])} className="text-sm font-black text-primary px-4 py-1.5 bg-primary/10 rounded-full transition-all">+ 节点</button></div><div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">{formTimeline.map((ev, idx) => (<div key={ev.id} className="relative pl-6 pb-6 border-l-4 border-primary/10 last:pb-0"><div className="absolute -left-[10px] top-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-md"><div className="h-1.5 w-1.5 rounded-full bg-white" /></div><div className="space-y-2 bg-gray-50 p-4 rounded-2xl border transition-all hover:border-primary/30"><div className="flex gap-1.5"><input type="date" className="h-8 text-sm font-bold border-none bg-white rounded-lg px-2 shadow-sm" value={ev.date} onChange={e => {const n=[...formTimeline]; n[idx].date=e.target.value; setFormTimeline(n);}} /><select className="h-8 text-sm font-bold border-none bg-white rounded-lg px-2 shadow-sm flex-1" value={ev.type} onChange={e => {const n=[...formTimeline]; n[idx].type=e.target.value as any; setFormTimeline(n);}}><option value="progress">进展</option><option value="milestone">里程碑</option><option value="payment">财务</option></select><button type="button" onClick={()=>setFormTimeline(formTimeline.filter((_,i)=>i!==idx))} className="text-red-400 p-1.5 hover:bg-white rounded-lg shadow-sm"><X className="h-4 w-4"/></button></div><input className="w-full text-sm font-black bg-transparent border-b-2 border-gray-200 outline-none py-1 focus:border-primary transition-all" placeholder="标题" value={ev.title} onChange={e => {const n=[...formTimeline]; n[idx].title=e.target.value; setFormTimeline(n);}} /><textarea className="w-full text-sm font-medium bg-transparent border-none p-0 resize-none text-muted-foreground leading-snug" rows={2} placeholder="描述..." value={ev.description} onChange={e => {const n=[...formTimeline]; n[idx].description=e.target.value; setFormTimeline(n);}} /></div></div>))}</div></div>
                  </div>
                  <div className="flex justify-end gap-4 border-t pt-8 mt-10"><button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-3 rounded-2xl border font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button><button onClick={handleSubmit} className="px-12 py-3 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all">Save Changes</button></div>
              </div>
          </div>
      )}

      {viewProject && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in" onClick={() => setViewProject(null)}>
             <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row border border-white/20" onClick={e => e.stopPropagation()}>
                 <div className="p-12 md:w-2/3 border-r border-gray-100"><div className="flex items-center gap-5 mb-10"><div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner"><FileText className="h-7 w-7" /></div><div className="space-y-1"><h3 className="text-4xl font-black tracking-tight text-gray-900 leading-none">{viewProject.name}</h3><p className="text-sm font-black text-muted-foreground uppercase tracking-widest">ID: {viewProject.id} • {viewProject.department}</p></div></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">{columns.filter(c => c.key !== 'actions' && c.key !== 'name').map(col => (<div key={col.key as string} className="space-y-2"><span className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">{col.header}</span><div className="font-bold text-gray-800 text-lg leading-tight">{col.key === 'annualContract' ? formatMoney(viewProject.annualData?.find(d => d.year === selectedYear)?.contractAmount) : col.key === 'annualCollection' ? formatMoney(viewProject.annualData?.find(d => d.year === selectedYear)?.collectedAmount) : col.dictKey ? renderDictCell(viewProject[col.key as keyof Project] as string, col.dictKey) : (viewProject[col.key as keyof Project] === true ? '是' : viewProject[col.key as keyof Project] === false ? '否' : String(viewProject[col.key as keyof Project] || '-'))}</div></div>))}</div></div>
                 <div className="bg-gray-50/50 p-12 md:w-1/3 flex flex-col"><div className="flex items-center gap-4 mb-10"><div className="h-12 w-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-primary"><History className="h-6 w-6" /></div><h4 className="text-2xl font-black text-gray-900">生命周期</h4></div><div className="flex-1 relative space-y-8">{viewProject.timeline?.length ? viewProject.timeline.map((ev, idx) => (<div key={ev.id} className="relative pl-10">{idx !== viewProject.timeline!.length - 1 && <div className="absolute left-4 top-8 bottom-[-32px] w-[3px] bg-primary/10 rounded-full" />}<div className={`absolute left-0 top-1.5 h-8 w-8 rounded-2xl flex items-center justify-center shadow-md ${ev.type === 'milestone' ? 'bg-amber-500 shadow-amber-200' : ev.type === 'payment' ? 'bg-green-500 shadow-green-200' : 'bg-primary shadow-primary-200'}`}>{ev.type === 'milestone' ? <Milestone className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}</div><div className="space-y-1.5"><span className="text-[11px] font-black text-muted-foreground uppercase bg-white border px-3 py-1 rounded-full shadow-sm">{ev.date}</span><h5 className="font-black text-gray-900 text-lg leading-tight">{ev.title}</h5><p className="text-sm text-muted-foreground font-bold leading-relaxed">{ev.description}</p></div></div>)) : (<div className="h-full flex flex-col items-center justify-center opacity-30 italic font-black text-muted-foreground text-sm uppercase tracking-widest">No Events Found</div>)}</div><button onClick={() => setViewProject(null)} className="mt-12 w-full py-4 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black">Close Panel</button></div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProjectTable;