import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, SystemDictionary, AnnualData, TimelineEvent } from '../types';
import { Search, SlidersHorizontal, Plus, Eye, Edit, Trash2, X, FileText, Check, X as XIcon, Calendar, Coins, Filter, History, Milestone, Clock, MessageSquare, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { nanoid } from 'nanoid';

export interface ColumnDef {
  key: keyof Project | 'actions' | 'annualContract' | 'annualCollection';
  header: string;
  render?: (value: any, row: Project) => React.ReactNode;
  inputType?: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean';
  dictKey?: string;
}

interface ProjectTableProps {
  data: Project[];
  title?: string;
  columns: ColumnDef[];
  dictionaries?: SystemDictionary;
  onAddProject?: (newProject: any) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  showAddButton?: boolean;
  selectedYear: number;
  availableYears: number[];
  onSelectYear: (year: number) => void;
  confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const formatMoney = (val: any) => val ? `¥${Number(val).toLocaleString()}` : '-';

const ProjectTable: React.FC<ProjectTableProps> = ({ 
    data, title, columns, dictionaries, onAddProject, onEditProject, onDeleteProject,
    showAddButton, selectedYear, availableYears, onSelectYear, confirmCustom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key as string));
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentForm, setCurrentForm] = useState<Partial<Project>>({});
  const [formAnnualData, setFormAnnualData] = useState<AnnualData[]>([]);
  const [formTimeline, setFormTimeline] = useState<TimelineEvent[]>([]);
  const [viewProject, setViewProject] = useState<Project | null>(null);

  const [advancedFilters, setAdvancedFilters] = useState({ clientName: '', responsiblePerson: '', minAmount: '' });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnToggleRef.current && !columnToggleRef.current.contains(event.target as Node)) setShowColumnToggle(false);
    };
    if (showColumnToggle) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnToggle]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, columnFilters, showAdvancedSearch, advancedFilters, data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchLower) || (item.contractNo && item.contractNo.toLowerCase().includes(searchLower)) || (item.clientName && item.clientName.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
        if (showAdvancedSearch) {
             if (advancedFilters.clientName && !item.clientName?.includes(advancedFilters.clientName)) return false;
             if (advancedFilters.responsiblePerson && !item.responsiblePerson?.includes(advancedFilters.responsiblePerson)) return false;
             if (advancedFilters.minAmount && (item.totalAmount || 0) < Number(advancedFilters.minAmount)) return false;
        }
        for (const [key, filterVal] of Object.entries(columnFilters)) {
            if (filterVal && item[key as keyof Project] !== filterVal) return false;
        }
        return true;
    });
  }, [data, searchTerm, showAdvancedSearch, advancedFilters, columnFilters]);

  const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * pageSize;
      return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleOpenAdd = () => { setModalMode('add'); setCurrentForm({}); setFormAnnualData([]); setFormTimeline([]); setIsModalOpen(true); };
  const handleOpenEdit = (project: Project) => { setModalMode('edit'); setCurrentForm({ ...project }); setFormAnnualData(project.annualData || []); setFormTimeline(project.timeline || []); setIsModalOpen(true); };
  const handleDelete = (id: string) => { confirmCustom('确认删除', '确定要删除该项目吗？', () => { if (onDeleteProject) onDeleteProject(id); }, true); };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const finalData = { ...currentForm, annualData: formAnnualData, timeline: formTimeline };
      modalMode === 'add' ? onAddProject?.(finalData) : onEditProject?.(finalData as Project);
      setIsModalOpen(false);
  };

  const getAnnualValue = (row: Project, key: 'annualContract' | 'annualCollection') => {
      const record = row.annualData?.find(d => d.year === selectedYear);
      return key === 'annualContract' ? record?.contractAmount : record?.collectedAmount;
  };

  const renderDictCell = (value: string, dictKey: string) => {
      if (!value || !dictionaries || !dictionaries[dictKey]) return value || '-';
      const item = dictionaries[dictKey].find(d => d.label === value);
      return item ? <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.bgColor} ${item.textColor}`}>{value}</span> : value;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-4">{title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}</div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="搜索名称、编号..." className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm pl-9 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            {(Object.values(columnFilters).some(Boolean) || searchTerm || showAdvancedSearch) && (
                 <button onClick={() => {setColumnFilters({}); setSearchTerm(''); setAdvancedFilters({clientName:'', responsiblePerson:'', minAmount:''});}} className="h-9 px-3 rounded-md border border-dashed border-red-300 text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50"><X className="h-4 w-4" />清除</button>
            )}
            <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className={`h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 ${showAdvancedSearch ? 'bg-muted' : 'bg-background'}`}><SlidersHorizontal className="h-4 w-4" />高级</button>
            <div className="relative" ref={columnToggleRef}>
                <button onClick={() => setShowColumnToggle(!showColumnToggle)} className="h-9 px-3 rounded-md border bg-background text-sm font-medium flex items-center gap-2 hover:bg-muted"><Eye className="h-4 w-4" />列显示</button>
                {showColumnToggle && <div className="absolute right-0 top-10 z-50 w-56 rounded-md border bg-white p-2 shadow-md">{columns.filter(c => c.key !== 'actions').map(col => (<label key={col.key as string} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.includes(col.key as string)} onChange={() => setVisibleColumns(prev => prev.includes(col.key as string) ? prev.filter(k => k !== col.key) : [...prev, col.key as string])} />{col.header}</label>))}</div>}
            </div>
            {showAddButton && <button onClick={handleOpenAdd} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow"><Plus className="h-4 w-4" />新增项目</button>}
        </div>
      </div>

      {showAdvancedSearch && (
          <div className="rounded-lg border bg-muted/30 p-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-1"><label className="text-xs font-medium">甲方名称</label><input className="h-8 w-full rounded border px-2 text-sm" value={advancedFilters.clientName} onChange={e => setAdvancedFilters({...advancedFilters, clientName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">负责人</label><input className="h-8 w-full rounded border px-2 text-sm" value={advancedFilters.responsiblePerson} onChange={e => setAdvancedFilters({...advancedFilters, responsiblePerson: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">最小合同额</label><input type="number" className="h-8 w-full rounded border px-2 text-sm" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} /></div>
          </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto" style={{ maxHeight: '60vh' }}>
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-secondary z-10">
              <tr className="border-b transition-colors">
                {columns.map((col) => {
                    if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                    let header = col.header;
                    if (col.key === 'annualContract') header = `${selectedYear} 合同额`;
                    if (col.key === 'annualCollection') header = `${selectedYear} 收款`;
                    const isFilterable = col.inputType === 'select' && col.dictKey && dictionaries?.[col.dictKey];
                    const activeFilter = columnFilters[col.key as string];
                    return (
                        <th key={col.key as string} className="h-12 px-4 font-medium text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2"><span>{header}</span>{isFilterable && <div className="relative cursor-pointer"><Filter className={`h-3 w-3 ${activeFilter ? 'text-primary' : 'opacity-40'}`} /><select className="absolute inset-0 opacity-0 cursor-pointer" value={activeFilter || ''} onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.key as string]: e.target.value }))}><option value="">全部</option>{dictionaries![col.dictKey!].map((opt) => (<option key={opt.label} value={opt.label}>{opt.label}</option>))}</select></div>}</div>
                        </th>
                    );
                })}
                <th className="h-12 px-4 text-right sticky right-0 bg-secondary">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (<tr><td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">未找到项目。</td></tr>) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                    {columns.map((col) => {
                        if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                        let cell: React.ReactNode;
                        if (col.key === 'annualContract' || col.key === 'annualCollection') cell = formatMoney(getAnnualValue(row, col.key));
                        else if (col.render) cell = col.render(row[col.key as keyof Project], row);
                        else if (col.dictKey) cell = renderDictCell(row[col.key as keyof Project] as string, col.dictKey);
                        else {
                            const val = row[col.key as keyof Project];
                            cell = (val === true ? <Check className="h-4 w-4 text-green-500" /> : val === false ? <XIcon className="h-4 w-4 text-red-300" /> : (val as React.ReactNode) || '-');
                        }
                        return <td key={col.key as string} className="p-4 whitespace-nowrap">{cell}</td>;
                    })}
                    <td className="p-4 text-right sticky right-0 bg-card/95 backdrop-blur-sm shadow-l"><div className="flex justify-end gap-2"><button onClick={() => setViewProject(row)} className="p-1 text-blue-600"><Eye className="h-4 w-4"/></button><button onClick={() => handleOpenEdit(row)} className="p-1 text-orange-600"><Edit className="h-4 w-4"/></button><button onClick={() => handleDelete(row.id)} className="p-1 text-red-600"><Trash2 className="h-4 w-4"/></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-sm text-muted-foreground border-t">
          <div className="flex items-center gap-4">
              <span>共 {filteredData.length} 条</span>
              <div className="flex items-center gap-2"><span>每页:</span><select className="h-8 rounded border bg-background px-1" value={pageSize} onChange={(e) => {setPageSize(Number(e.target.value)); setCurrentPage(1);}}>{[10, 20, 50, 100].map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
          </div>
          <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded border disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button>
              <span className="px-2">第 {currentPage} / {totalPages || 1} 页</span>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded border disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
              <div className="bg-background w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-lg shadow-xl border p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4 border-b pb-4"><h3 className="text-lg font-bold">{modalMode === 'add' ? '新增项目' : '编辑项目'}</h3><button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5"/></button></div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2"><form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                          {columns.filter(c => c.key !== 'actions' && c.key !== 'id' && c.key !== 'annualContract' && c.key !== 'annualCollection').map(col => (
                            <div key={col.key as string} className={`space-y-1 ${col.inputType === 'textarea' ? 'col-span-full' : ''}`}>
                                <label className="text-sm font-medium">{col.header}</label>
                                {col.inputType === 'select' ? (<select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})}><option value="">请选择</option>{dictionaries?.[col.dictKey!]?.map(o => (<option key={o.label} value={o.label}>{o.label}</option>))}</select>) :
                                 col.inputType === 'textarea' ? (<textarea className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})} />) :
                                 col.inputType === 'boolean' ? (<div className="h-9 flex items-center"><input type="checkbox" checked={!!currentForm[col.key as keyof Project]} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.checked})} /></div>) :
                                 (<input type={col.inputType === 'number' ? 'number' : col.inputType === 'date' ? 'date' : 'text'} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: col.inputType === 'number' ? parseFloat(e.target.value) : e.target.value})} />)}
                            </div>
                          ))}
                          <div className="col-span-full border-t pt-4 mt-2"><div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-primary" />年度数据</h4><button type="button" onClick={() => setFormAnnualData([...formAnnualData, {year:selectedYear, contractAmount:0, collectedAmount:0}])} className="text-xs text-primary">+ 添加年份</button></div><div className="bg-muted/30 rounded-md p-3 space-y-2">{formAnnualData.map((d, idx) => (<div key={idx} className="flex gap-2 pb-2 border-b last:border-0"><input type="number" className="h-8 w-16 border rounded px-1 text-xs" value={d.year} onChange={e => {const n=[...formAnnualData]; n[idx].year=Number(e.target.value); setFormAnnualData(n);}} /><input type="number" className="h-8 flex-1 border rounded px-1 text-xs" placeholder="合同额" value={d.contractAmount} onChange={e => {const n=[...formAnnualData]; n[idx].contractAmount=Number(e.target.value); setFormAnnualData(n);}} /><input type="number" className="h-8 flex-1 border rounded px-1 text-xs" placeholder="收款额" value={d.collectedAmount} onChange={e => {const n=[...formAnnualData]; n[idx].collectedAmount=Number(e.target.value); setFormAnnualData(n);}} /><button type="button" onClick={() => setFormAnnualData(formAnnualData.filter((_,i)=>i!==idx))} className="text-red-500"><Trash2 className="h-3 w-3"/></button></div>))}</div></div>
                      </form></div>
                      <div className="border-l pl-6 space-y-4"><div className="flex items-center justify-between"><h4 className="text-sm font-bold flex items-center gap-2"><History className="h-4 w-4 text-primary" />时间线</h4><button type="button" onClick={() => setFormTimeline([...formTimeline, {id:nanoid(), date:new Date().toISOString().split('T')[0], title:'', description:'', type:'progress'}])} className="text-xs text-primary">+ 节点</button></div><div className="space-y-4 max-h-[400px] overflow-y-auto">{formTimeline.map((ev, idx) => (<div key={ev.id} className="relative pl-6 pb-4 border-l-2 border-primary/20"><div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div><div className="space-y-2 bg-muted/20 p-2 rounded"><div className="flex gap-1"><input type="date" className="h-6 text-[10px] border rounded" value={ev.date} onChange={e => {const n=[...formTimeline]; n[idx].date=e.target.value; setFormTimeline(n);}} /><select className="h-6 text-[10px] border rounded flex-1" value={ev.type} onChange={e => {const n=[...formTimeline]; n[idx].type=e.target.value as any; setFormTimeline(n);}}><option value="progress">进展</option><option value="milestone">里程碑</option><option value="payment">回款</option></select><button type="button" onClick={()=>setFormTimeline(formTimeline.filter((_,i)=>i!==idx))} className="text-red-400"><X className="h-3 w-3"/></button></div><input className="w-full text-xs font-bold bg-transparent border-b outline-none" placeholder="标题" value={ev.title} onChange={e => {const n=[...formTimeline]; n[idx].title=e.target.value; setFormTimeline(n);}} /><textarea className="w-full text-[10px] bg-transparent outline-none" rows={2} placeholder="内容" value={ev.description} onChange={e => {const n=[...formTimeline]; n[idx].description=e.target.value; setFormTimeline(n);}} /></div></div>))}</div></div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4 mt-6"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md border text-sm">取消</button><button onClick={handleSubmit} className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-bold">保存</button></div>
              </div>
          </div>
      )}

      {viewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setViewProject(null)}>
             <div className="bg-background w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                 <div className="p-8 md:w-2/3 border-r"><h3 className="text-2xl font-bold mb-6">{viewProject.name}</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">{columns.filter(c => c.key !== 'actions' && c.key !== 'name').map(col => (<div key={col.key as string} className="space-y-1"><span className="text-muted-foreground text-xs uppercase font-semibold">{col.header}</span><div className="font-medium">{col.key === 'annualContract' ? formatMoney(getAnnualValue(viewProject, 'annualContract')) : col.key === 'annualCollection' ? formatMoney(getAnnualValue(viewProject, 'annualCollection')) : col.dictKey ? renderDictCell(viewProject[col.key as keyof Project] as string, col.dictKey) : (viewProject[col.key as keyof Project] === true ? '是' : viewProject[col.key as keyof Project] === false ? '否' : String(viewProject[col.key as keyof Project] || '-'))}</div></div>))}</div></div>
                 <div className="bg-muted/10 p-8 md:w-1/3 flex flex-col"><div className="flex items-center gap-2 mb-6"><History className="h-5 w-5 text-primary" /><h4 className="font-bold">项目全生命周期</h4></div><div className="flex-1 relative space-y-6">{viewProject.timeline?.map((ev, idx) => (<div key={ev.id} className="relative pl-8">{idx !== viewProject.timeline!.length - 1 && <div className="absolute left-3 top-6 bottom-[-24px] w-[2px] bg-primary/10" />}<div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center shadow-sm ${ev.type === 'milestone' ? 'bg-amber-500' : ev.type === 'payment' ? 'bg-green-500' : 'bg-primary'}`}>{ev.type === 'milestone' ? <Milestone className="h-3 w-3 text-white" /> : <Clock className="h-3 w-3 text-white" />}</div><div className="space-y-1"><span className="text-[10px] font-bold text-muted-foreground uppercase">{ev.date}</span><h5 className="font-bold text-sm">{ev.title}</h5><p className="text-xs text-muted-foreground">{ev.description}</p></div></div>))}</div><button onClick={() => setViewProject(null)} className="mt-8 w-full py-2 bg-foreground text-background rounded-lg font-bold text-sm">关闭</button></div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProjectTable;