import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, SystemDictionary, AnnualData, TimelineEvent, ProjectStage, User } from '../types';
import { Search, Plus, Eye, Edit, Trash2, X, FileText, Check, X as XIcon, ChevronLeft,ChevronRight, Coins, Filter, History, Milestone, Clock, CheckCircle2, HelpCircle, ArrowUp, ArrowDown, ChevronDown, Users, Download } from 'lucide-react';
import { nanoid } from 'nanoid';

export interface ColumnDef {
  key: keyof Project | 'actions' | 'annualContract' | 'annualCollection' | 'plannedAmount' | 'statusLight';
  header: string;
  render?: (value: any, row: Project) => React.ReactNode;
  inputType?: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean' | 'multi-select';
  dictKey?: string;
}

interface ProjectTableProps {
  data: Project[]; title?: string; columns: ColumnDef[]; dictionaries?: SystemDictionary; users?: User[]; onAddProject?: (newProject: any) => Promise<boolean>; onEditProject?: (project: Project) => Promise<boolean>; onDeleteProject?: (id: string) => void; showAddButton?: boolean; selectedYear: number | 'all'; availableYears: number[]; onSelectYear: (year: number | 'all') => void; confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void; defaultStage?: string;
}

const formatMoney = (val: any) => val ? `¥${Number(val).toLocaleString()}` : '-';

// --- 自定义美化多选组件 (支持分组/树形展示) ---
const CustomMultiSelect = ({ value, onChange, options, isTree = false }: { value: string, onChange: (val: string) => void, options: any[], isTree?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = useMemo(() => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [], [value]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (label: string, isGroupClick: boolean = false) => {
        let newSelected = [...selected];
        
        if (isGroupClick) {
            const groupMembers = options.filter(o => o.group === label).map(o => o.label);
            const isCurrentlySelected = selected.includes(label);
            
            if (isCurrentlySelected) {
                newSelected = newSelected.filter(s => s !== label && !groupMembers.includes(s));
            } else {
                newSelected = Array.from(new Set([...newSelected, label, ...groupMembers]));
            }
        } else {
            const isCurrentlySelected = selected.includes(label);
            const item = options.find(o => o.label === label);
            const parentGroup = item?.group;
            
            if (isCurrentlySelected) {
                newSelected = newSelected.filter(s => s !== label && s !== parentGroup);
            } else {
                newSelected.push(label);
                if (parentGroup) {
                    const groupMembers = options.filter(o => o.group === parentGroup).map(o => o.label);
                    const allMembersIn = groupMembers.every(m => newSelected.includes(m));
                    if (allMembersIn) newSelected.push(parentGroup);
                }
            }
        }
        onChange(Array.from(new Set(newSelected)).join(','));
    };

    const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

    // Logic to display only groups if all members are selected, else show individuals
    const displaySelected = useMemo(() => {
        if (!isTree) return selected;
        
        const result: string[] = [];
        const processedMembers = new Set<string>();
        
        // 1. Check for full groups
        const groups = Array.from(new Set(options.map(o => o.group).filter(Boolean)));
        groups.forEach(g => {
            if (selected.includes(g)) {
                result.push(`${g} (整组)`);
                const members = options.filter(o => o.group === g).map(o => o.label);
                members.forEach(m => processedMembers.add(m));
            }
        });
        
        // 2. Add remaining individual members
        selected.forEach(s => {
            if (!groups.includes(s) && !processedMembers.has(s)) {
                result.push(s);
            }
        });
        
        return result;
    }, [selected, options, isTree]);

    // Group options for tree view
    const groupedOptions = useMemo(() => {
        if (!isTree) return { '选项': filteredOptions };
        const groups: Record<string, any[]> = {};
        filteredOptions.forEach(o => {
            const groupName = o.group || '其他';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(o);
        });
        return groups;
    }, [filteredOptions, isTree]);

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[36px] w-full rounded-xl border-2 border-border bg-card px-2 py-1 text-sm flex flex-wrap gap-1.5 cursor-pointer hover:border-primary/50 transition-all shadow-sm focus-within:ring-4 focus-within:ring-primary/10"
            >
                {displaySelected.length > 0 ? displaySelected.map(s => (
                    <span key={s} className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-primary/20">
                        {s}
                        <X className="h-2.5 w-2.5 hover:text-destructive" onClick={(e) => { 
                            e.stopPropagation(); 
                            const cleanLabel = s.replace(' (整组)', '');
                            toggleOption(cleanLabel, s.includes('(整组)')); 
                        }} />
                    </span>
                )) : <span className="text-muted-foreground italic text-xs leading-[24px]">请选择 (支持部门与个人)</span>}
                <div className="ml-auto self-center"><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} /></div>
            </div>
            {isOpen && (
                <div className="absolute z-[1000] top-[calc(100%+4px)] left-0 w-full bg-card border-2 border-border rounded-xl shadow-2xl max-h-80 overflow-hidden flex flex-col animate-in zoom-in-95">
                    <div className="p-2 border-b bg-muted/20">
                        <input 
                            autoFocus
                            placeholder="搜索部门或人员..." 
                            className="w-full h-8 px-3 rounded-lg border bg-card text-xs outline-none focus:border-primary"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {Object.entries(groupedOptions).map(([group, items]) => (
                            <div key={group} className="space-y-1">
                                {isTree && (
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); toggleOption(group, true); }}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selected.includes(group) ? 'bg-primary text-white font-black' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <Users className="h-3 w-3" /> {group} (整组)
                                        </span>
                                        {selected.includes(group) && <Check className="h-3.5 w-3.5" />}
                                    </div>
                                )}
                                <div className={isTree ? "pl-4 space-y-0.5" : "space-y-0.5"}>
                                    {items.map(o => (
                                        <div 
                                            key={o.label} 
                                            onClick={(e) => { e.stopPropagation(); toggleOption(o.label, false); }}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selected.includes(o.label) ? 'bg-primary/5 text-primary font-black' : 'hover:bg-muted'}`}
                                        >
                                            <span className="text-sm">{o.label}</span>
                                            {selected.includes(o.label) && <Check className="h-4 w-4" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {Object.keys(groupedOptions).length === 0 && <div className="text-center py-4 text-xs text-muted-foreground italic">未找到匹配项</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProjectTable: React.FC<ProjectTableProps> = ({ 
    data, title, columns, dictionaries: originalDictionaries, users, onAddProject, onEditProject, onDeleteProject,
    showAddButton, selectedYear, availableYears, onSelectYear, confirmCustom, defaultStage
}) => {
    const dictionaries = useMemo(() => {
      const d = { ...originalDictionaries };
      
      // Inject People
      if (users) {
          d['人员'] = users.map(u => ({ label: u.name, bgColor: 'bg-primary/5', textColor: 'text-primary' }));
          
          // Inject Structured Team Data (Department as Group)
          d['团队和人员'] = users.map(u => ({ 
              label: u.name, 
              group: u.department || '未分配',
              bgColor: 'bg-gray-100',
              textColor: 'text-gray-800'
          }));
      }
      return d;
    }, [originalDictionaries, users]);

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
              
              let finalVisible = visible.filter((k: string) => defaultKeys.includes(k));
              if (defaultKeys.includes('statusLight') && !finalVisible.includes('statusLight')) {
                  finalVisible = ['statusLight', ...finalVisible];
              }
              
              setColumnOrder(finalOrder); 
              setVisibleColumns(finalVisible);
          } catch { 
              setColumnOrder(defaultKeys); 
              setVisibleColumns(defaultKeys.filter(k => k !== 'id')); 
          }
      } else { 
          setColumnOrder(defaultKeys); 
          setVisibleColumns(defaultKeys.filter(k => k !== 'id')); 
      }
  }, [title, columns.length]);

  useEffect(() => { if (columnOrder.length > 0) localStorage.setItem(storageKey, JSON.stringify({ visible: visibleColumns, order: columnOrder })); }, [visibleColumns, columnOrder]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentForm, setCurrentForm] = useState<Partial<Project>>({});
  const [formAnnualData, setFormAnnualData] = useState<AnnualData[]>([]);
  const [formCollectionPlan, setFormCollectionPlan] = useState<{ year: number; month: number; amount: number; completed: boolean }[]>([]);
  const [formTimeline, setFormTimeline] = useState<TimelineEvent[]>([]);
  const [formNextPlan, setFormNextPlan] = useState<TimelineEvent[]>([]);
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (columnToggleRef.current && !columnToggleRef.current.contains(e.target as Node)) setShowColumnToggle(false); };
    if (showColumnToggle) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnToggle]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, columnFilters, showAdvancedSearch, advancedFilters, data]);

  // Real-time Payment Progress Calculation: “已收款/我所合同额”
  useEffect(() => {
      if (!isModalOpen) return;
      const deptAmount = Number(currentForm.deptAmount) || 0;
      const collectedAmount = Number(currentForm.collectedAmount) || 0;
      const progress = deptAmount > 0 ? `${((collectedAmount / deptAmount) * 100).toFixed(0)}%` : '0%';
      if (currentForm.paymentProgress !== progress) {
          setCurrentForm(prev => ({ ...prev, paymentProgress: progress }));
      }
  }, [currentForm.deptAmount, currentForm.collectedAmount, isModalOpen]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchLower) || (item.id && item.id.toLowerCase().includes(searchLower));
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

  const showInternalToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); 
      const final = { 
          ...currentForm, 
          annualData: formAnnualData, 
          collectionPlan: formCollectionPlan,
          timeline: formTimeline,
          nextPlan: formNextPlan
      };
      
      const success = modalMode === 'add' 
        ? await onAddProject?.(final) 
        : await onEditProject?.(final as Project); 
      
      if (success) {
          showInternalToast('保存成功', 'success');
          setIsModalOpen(false);
      } else {
          showInternalToast('保存失败，请重试', 'error');
      }
  };

  const renderDictCell = (value: string, dictKey: string) => {
      if (!value || !dictionaries || !dictionaries[dictKey]) return value || '-';
      const item = dictionaries[dictKey].find(d => d.label === value);
      return item ? <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold ${item.bgColor} ${item.textColor} border border-transparent`}>{value}</span> : value;
  };

  // Helper to safely parse JSON strings from SQLite
  const safeParseJSON = (data: any, defaultValue: any = []) => {
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
          try {
              return JSON.parse(data) || defaultValue;
          } catch (e) {
              return defaultValue;
          }
      }
      return defaultValue;
  };

  const getAnnualValue = (row: Project, key: 'contractAmount' | 'collectedAmount') => {
      const annualData = safeParseJSON(row.annualData);
      if (selectedYear === 'all') {
          return annualData.reduce((sum: number, item: any) => sum + (item[key] || 0), 0) || 0;
      }
      return annualData.find((d: any) => d.year === selectedYear)?.[key] || 0;
  };

  const getPlannedValue = (row: Project) => {
      const plan = safeParseJSON(row.collectionPlan);
      if (selectedYear === 'all') {
          return plan.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) || 0;
      }
      return plan.filter((d: any) => d.year === selectedYear).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) || 0;
  };

  // Helper to format team members for table display (matching form logic)
  const renderTeamMembersCell = (value: string) => {
      if (!value || !users) return value || '-';
      const selected = value.split(',').map(s => s.trim()).filter(Boolean);
      const result: string[] = [];
      const processedMembers = new Set<string>();
      
      const groups = Array.from(new Set(users.map(u => u.department).filter(Boolean)));
      
      groups.forEach(g => {
          const groupMembers = users.filter(u => u.department === g).map(u => u.name);
          if (groupMembers.length > 0 && groupMembers.every(m => selected.includes(m))) {
              result.push(`${g} (整组)`);
              groupMembers.forEach(m => processedMembers.add(m));
          }
      });
      
      selected.forEach(s => {
          if (!groups.includes(s as any) && !processedMembers.has(s)) {
              result.push(s);
          }
      });

      return (
          <div className="flex flex-wrap gap-1">
              {result.map(tag => (
                  <span 
                    key={tag} 
                    style={{ 
                        backgroundColor: 'hsl(var(--primary) / 0.1)', 
                        color: 'hsl(var(--primary))',
                        borderColor: 'hsl(var(--primary) / 0.2)'
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                  >
                      {tag}
                  </span>
              ))}
          </div>
      );
  };

  const renderProgressBar = (value: any, row: Project) => {
      let percent = 0;
      if (typeof value === 'string' && value.includes('%')) {
          percent = parseFloat(value.replace('%', ''));
      } else if (!isNaN(Number(value)) && value !== null && value !== '') {
          percent = Number(value) <= 1 ? Number(value) * 100 : Number(value);
      } else {
          const total = row.deptAmount || row.totalAmount || row.instituteAmount || 0;
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
                  <div className={`h-full transition-all duration-1000 ${safePercent >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${safePercent}%` }} />
              </div>
          </div>
      );
  };

  const renderTimelineSection = (
      title: string, 
      items: TimelineEvent[], 
      setItems: React.Dispatch<React.SetStateAction<TimelineEvent[]>> | null,
      colorTheme: 'primary' | 'accent' = 'primary',
      showCheckbox: boolean = false
  ) => (
      <div className="flex flex-col flex-1 basis-1/2 min-w-0 h-full overflow-hidden">
          <div className="flex-shrink-0 space-y-2 mb-4">
              <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black flex items-center gap-2">{title}</h4>
                  {setItems && (
                      <button type="button" onClick={() => setItems([{id: nanoid(), date:new Date().toISOString().split('T')[0], title:'', description:'', type:'progress', completed: false}, ...items])} className="text-xs font-black text-white px-3 py-1.5 rounded-lg shadow-md hover:opacity-90 transition-all flex items-center gap-1 bg-primary">
                          <Plus className="h-3 w-3"/> 添加
                      </button>
                  )}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 pl-1 pt-1 pb-10 custom-scrollbar">
              <div className="space-y-4 relative">
                  {items.length > 0 && <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 rounded-full" />}
                  {items.map((ev, idx) => (
                      <div key={ev.id} className="relative pl-12 group">
                          {showCheckbox ? (
                              <div className="absolute left-0 top-0 h-10 w-10 z-20 flex items-center justify-center">
                                  <input 
                                    type="checkbox" 
                                    disabled={!setItems}
                                    checked={!!ev.completed} 
                                    onChange={e => {
                                        if (!setItems) return;
                                        const n=[...items]; 
                                        n[idx].completed=e.target.checked;
                                        if (e.target.checked) {
                                            n[idx].completedAt = new Date().toISOString().split('T')[0];
                                        } else {
                                            n[idx].completedAt = undefined;
                                        }
                                        setItems(n);
                                    }}
                                    className="h-6 w-6 rounded-lg border-2 border-border bg-card text-primary focus:ring-primary/20 cursor-pointer transition-all disabled:cursor-default"
                                  />
                              </div>
                          ) : (
                              <div className={`absolute left-0 top-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm z-10 border-4 border-white transition-colors ${ev.type === 'milestone' ? 'bg-amber-100 text-amber-600' : ev.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                                  {ev.type === 'milestone' ? <Milestone className="h-5 w-5" /> : ev.type === 'payment' ? <Coins className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                              </div>
                          )}
                          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-all group-hover:border-gray-200 ${ev.completed ? 'opacity-50' : ''}`}>
                              <div className="flex gap-2 mb-2">
                                  <div className="flex flex-col gap-1 flex-1">
                                      <div className="flex items-center gap-1">
                                          <span className="text-[9px] font-black text-muted-foreground uppercase">{ev.completed ? '计划日期' : '日期'}</span>
                                          {setItems ? (
                                              <input type="date" className="h-6 text-[10px] font-bold border border-border bg-card rounded px-1.5 shadow-sm outline-none focus:border-primary" value={ev.date} onChange={e => {const n=[...items]; n[idx].date=e.target.value; setItems(n);}} />
                                          ) : (
                                              <span className="text-[10px] font-bold text-foreground">{ev.date}</span>
                                          )}
                                      </div>
                                      {ev.completed && (
                                          <div className="flex items-center gap-1 animate-in slide-in-from-left-2">
                                              <span className="text-[9px] font-black text-emerald-600 uppercase">完成于</span>
                                              {setItems ? (
                                                  <input type="date" className="h-6 text-[10px] font-bold border border-emerald-200 bg-emerald-50/30 text-emerald-700 rounded px-1.5 shadow-sm outline-none focus:border-emerald-500" value={ev.completedAt || ''} onChange={e => {const n=[...items]; n[idx].completedAt=e.target.value; setItems(n);}} />
                                              ) : (
                                                  <span className="text-[10px] font-bold text-emerald-700">{ev.completedAt}</span>
                                              )}
                                          </div>
                                      )}
                                  </div>
                                  {setItems && (
                                      <>
                                          <select className="h-7 text-[10px] font-bold border border-border bg-card rounded px-2 shadow-sm outline-none focus:border-primary" value={ev.type} onChange={e => {const n=[...items]; n[idx].type=e.target.value as any; setItems(n);}}>
                                              <option value="progress">普通</option><option value="milestone">重要</option><option value="payment">财务</option>
                                          </select>
                                          <button type="button" onClick={() => confirmCustom('删除', '确定删除？', () => setItems(items.filter((_,i)=>i!==idx)), true)} className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 className="h-3 w-3"/></button>
                                      </>
                                  )}
                              </div>
                              {setItems ? (
                                  <input className={`w-full text-sm font-black bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none px-1 transition-all placeholder:text-gray-300 mb-1 ${ev.completed ? 'line-through' : ''}`} placeholder="任务名称..." value={ev.title} onChange={e => {const n=[...items]; n[idx].title=e.target.value; setItems(n);}} />
                              ) : (
                                  <h5 className={`text-sm font-black text-foreground mb-1 ${ev.completed ? 'line-through' : ''}`}>{ev.title}</h5>
                              )}
                              {setItems ? (
                                  <textarea className={`w-full text-[11px] font-medium text-gray-600 bg-gray-50/50 rounded p-2 border-0 outline-none resize-none focus:bg-white focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-gray-300 ${ev.completed ? 'line-through' : ''}`} placeholder="补充说明..." rows={2} value={ev.description} onChange={e => {const n=[...items]; n[idx].description=e.target.value; setItems(n);}} />
                              ) : (
                                  <p className={`text-[11px] font-medium text-muted-foreground leading-relaxed ${ev.completed ? 'line-through' : ''}`}>{ev.description}</p>
                              )}
                          </div>
                      </div>
                  ))}
                  {items.length === 0 && <div className="text-center py-6 opacity-40"><p className="text-xs font-bold text-gray-500">暂无记录</p></div>}
              </div>
          </div>
      </div>
  );

  const handleExport = () => {
      if (!filteredData.length) return;
      const exportColumns = sortedColumnDefs.filter(c => c.key !== 'actions' && visibleColumns.includes(c.key as string));
      const headers = exportColumns.map(c => c.header).join(',');
      const csvRows = filteredData.map(row => {
          return exportColumns.map(col => {
              let val: any = '';
              if (col.key === 'annualContract') {
                  val = getAnnualValue(row, 'contractAmount');
              } else if (col.key === 'annualCollection') {
                  val = getAnnualValue(row, 'collectedAmount');
              } else if (col.key === 'plannedAmount') {
                  val = getPlannedValue(row);
              } else if (col.key === 'paymentProgress') {
                  const total = row.deptAmount || row.totalAmount || row.instituteAmount || 0;
                  const collected = row.collectedAmount || 0;
                  val = total > 0 ? ((collected / total) * 100).toFixed(0) + '%' : '0%';
              } else if (col.dictKey) {
                 const dictVal = row[col.key as keyof Project] as string;
                 if (dictionaries && dictionaries[col.dictKey]) {
                     const item = dictionaries[col.dictKey].find(d => d.label === dictVal);
                     val = item ? item.label : dictVal;
                 } else { val = dictVal; }
              } else {
                  val = row[col.key as keyof Project];
                  if (col.key === 'teamMembers') {
                      val = val ? val.split(',').map((s: string) => s.trim()).filter(Boolean).join('; ') : '';
                  } else if (val === true) val = '是';
                  else if (val === false) val = '否';
                  else if (Array.isArray(val)) val = val.length > 0 ? ((val[0] as any).title || '已记录') : '';
              }
              const stringVal = String(val === null || val === undefined ? '' : val);
              if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                  return `"${stringVal.replace(/"/g, '""')}"`;
              }
              return stringVal;
          }).join(',');
      });
      const csvContent = "\uFEFF" + [headers, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title || 'projects'}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 md:w-56"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="项目名称、ID搜索..." className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className={`h-9 px-3 rounded-lg border text-sm font-bold flex items-center gap-2 ${showAdvancedSearch ? 'bg-primary text-white shadow-sm' : 'bg-background'}`}>高级搜索</button>
            <button onClick={handleExport} className="h-9 px-3 rounded-lg border bg-background text-sm font-bold flex items-center gap-2 hover:bg-muted transition-colors"><Download className="h-4 w-4" /> 导出</button>
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
            {showAddButton && <button onClick={() => {setModalMode('add'); setCurrentForm({ stage: defaultStage as any, statusLight: 'green' }); setFormAnnualData([]); setFormCollectionPlan([]); setFormTimeline([]); setFormNextPlan([]); setIsModalOpen(true);}} className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-black shadow-sm">新增</button>}
        </div>
      </div>

      {showAdvancedSearch && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm grid gap-3 md:grid-cols-3 lg:grid-cols-4 animate-in slide-in-from-top-2">
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">合同编号</label><input className="h-8 w-full rounded border border-border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.contractNo} onChange={e => setAdvancedFilters({...advancedFilters, contractNo: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">甲方名称</label><input className="h-8 w-full rounded border border-border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.clientName} onChange={e => setAdvancedFilters({...advancedFilters, clientName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">负责人</label><input className="h-8 w-full rounded border border-border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.responsiblePerson} onChange={e => setAdvancedFilters({...advancedFilters, responsiblePerson: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-sm font-black text-muted-foreground uppercase">地区</label><select className="h-8 w-full rounded border border-border bg-muted/10 px-2 text-sm outline-none" value={advancedFilters.region} onChange={e => setAdvancedFilters({...advancedFilters, region: e.target.value})}><option value="">全部</option>{dictionaries?.['地区']?.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}</select></div>
              <div className="space-y-1 md:col-span-2"><label className="text-sm font-black text-muted-foreground uppercase tracking-widest">总额区间</label><div className="flex gap-2"><input type="number" placeholder="MIN" className="h-8 flex-1 rounded border border-border bg-muted/10 px-2 text-sm" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} /><input type="number" placeholder="MAX" className="h-8 flex-1 rounded border border-border bg-muted/10 px-2 text-sm" value={advancedFilters.maxAmount} onChange={e => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})} /></div></div>
              <div className="flex items-end"><button onClick={() => {setSearchTerm(''); setAdvancedFilters({contractNo:'', clientName:'', responsiblePerson:'', region:'', category:'', minAmount:'', maxAmount:''});}} className="h-8 px-3 rounded border border-dashed border-red-200 text-red-500 text-sm font-black w-full text-center">重置</button></div>
          </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="relative w-full overflow-auto" style={{ maxHeight: '65vh' }}>
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10">
              <tr className="border-b border-border">
                {sortedColumnDefs.map((col) => {
                    if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                    let header = col.header; 
                    if (col.key === 'annualContract') header = selectedYear === 'all' ? '历年合同总额' : `${selectedYear} 合同`; 
                    if (col.key === 'annualCollection') header = selectedYear === 'all' ? '历年收款总额' : `${selectedYear} 收款`;
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
            <tbody className="divide-y divide-border">
              {paginatedData.length === 0 ? (<tr><td colSpan={columns.length + 1} className="p-16 text-center text-muted-foreground font-bold italic">No Data.</td></tr>) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="group hover:bg-muted/40 transition-colors">
                    {sortedColumnDefs.map((col) => {
                        if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                        let cell: React.ReactNode;
                        if (col.key === 'annualContract') cell = formatMoney(getAnnualValue(row, 'contractAmount'));
                        else if (col.key === 'annualCollection') cell = formatMoney(getAnnualValue(row, 'collectedAmount'));
                        else if (col.key === 'plannedAmount') cell = formatMoney(getPlannedValue(row));
                        else if (col.key === 'paymentProgress') cell = renderProgressBar(row[col.key], row);
                        else if (col.render) cell = col.render(row[col.key as keyof Project], row);
                        else if (col.dictKey) cell = renderDictCell(row[col.key as keyof Project] as string, col.dictKey);
                        else {
                            const val = row[col.key as keyof Project]; 
                            if (col.key === 'teamMembers') cell = renderTeamMembersCell(val as string);
                            else if (val === true) cell = <Check className="h-4 w-4 text-green-500" />;
                            else if (val === false) cell = <XIcon className="h-4 w-4 text-red-300" />;
                            else if (Array.isArray(val)) cell = val.length > 0 ? ((val[0] as any).title || '已记录') : '-';
                            else cell = (val as React.ReactNode) || '-';
                        }
                        return <td key={col.key as string} className="py-2 px-4 whitespace-nowrap font-bold text-gray-700">{cell}</td>;
                    })}
                    <td className="py-2 px-4 text-right sticky right-0 bg-card/80 backdrop-blur-sm group-hover:bg-muted/80 shadow-[-8px_0_12px_-5px_rgba(0,0,0,0.05)] transition-colors"><div className="flex justify-end gap-1"><button onClick={() => {
                        const annualData = safeParseJSON(row.annualData);
                        const timeline = safeParseJSON(row.timeline);
                        const nextPlan = safeParseJSON(row.nextPlan);
                        setViewProject({...row, annualData, timeline, nextPlan});
                    }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye className="h-4 w-4"/></button><button onClick={() => { 
                        const annualData = safeParseJSON(row.annualData);
                        const collectionPlan = safeParseJSON(row.collectionPlan);
                        const timeline = safeParseJSON(row.timeline);
                        const nextPlan = safeParseJSON(row.nextPlan);
                        
                        const totalCollected = annualData.reduce((sum: number, item: any) => sum + (item.collectedAmount || 0), 0);
                        setCurrentForm({...row, collectedAmount: totalCollected}); 
                        setFormAnnualData(annualData); 
                        setFormCollectionPlan(collectionPlan); 
                        setFormTimeline(timeline); 
                        setFormNextPlan(nextPlan); 
                        setModalMode('edit'); 
                        setIsModalOpen(true);
                    }} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"><Edit className="h-4 w-4"/></button><button onClick={() => confirmCustom('删除', '确定删除？', () => onDeleteProject?.(row.id), true)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4"/></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 text-sm font-black text-muted-foreground tracking-widest border-t border-border uppercase">
          <div className="flex items-center gap-4"><span>共 {filteredData.length} 条</span><div className="flex items-center gap-1.5"><span>显示:</span><select className="border-none bg-muted rounded px-1.5 py-0.5 text-foreground" value={pageSize} onChange={e => {setPageSize(Number(e.target.value)); setCurrentPage(1);}}>{[10, 20, 50, 100].map(s => (<option key={s} value={s}>{s}</option>))}</select></div></div>
          <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-20"><ChevronLeft className="h-4 w-4"/></button>
              <span className="bg-muted px-3 py-1 rounded-lg text-foreground font-black">{currentPage} / {totalPages || 1}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-20"><ChevronRight className="h-4 w-4"/></button>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-lg p-4 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
              <div className="bg-card w-full max-w-[95vw] h-[90vh] overflow-hidden rounded-3xl shadow-2xl p-8 flex flex-col border border-border" onClick={e => e.stopPropagation()}>
                  {toast && (
                      <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XIcon className="h-5 w-5" />}
                          <span className="text-sm font-bold">{toast.message}</span>
                      </div>
                  )}
                  <div className="flex items-center justify-between mb-6 border-b border-border pb-4 shrink-0"><h3 className="text-2xl font-black text-foreground">{modalMode === 'add' ? '创建项目' : '编辑项目'}</h3><button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-6 w-6"/></button></div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
                      <div className="lg:col-span-6 overflow-y-auto custom-scrollbar pr-6 pb-10">
                          <form onSubmit={handleSubmit} className="space-y-8">
                              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border-2 border-dashed border-border mb-6">
                                  <label className="w-24 flex-shrink-0 text-xs font-black text-muted-foreground uppercase text-right tracking-widest">项目状态灯</label>
                                  <div className="flex flex-wrap gap-3">
                                      {[
                                          { val: 'green', label: '正常推进', color: 'bg-emerald-500 border-emerald-600' },
                                          { val: 'yellow', label: '项目暂停', color: 'bg-yellow-400 border-yellow-600' },
                                          { val: 'red', label: '紧急/重要', color: 'bg-red-500 border-red-600' },
                                          { val: 'white', label: '已完成', color: 'bg-white border-gray-300' }
                                      ].map(opt => (
                                          <button 
                                              type="button" 
                                              key={opt.val} 
                                              onClick={() => setCurrentForm({...currentForm, statusLight: opt.val})} 
                                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${currentForm.statusLight === opt.val ? 'border-primary bg-primary/5 shadow-md scale-105' : 'border-transparent bg-muted/50 hover:bg-muted'}`}
                                          >
                                              <span className={`h-3 w-3 rounded-full border shadow-sm ${opt.color}`} />
                                              <span className={`text-xs font-bold ${currentForm.statusLight === opt.val ? 'text-primary' : 'text-muted-foreground'}`}>{opt.label}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {/* Lifecycle Stage Controls - Moved from View Panel */}
                              <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                                  <label className="w-24 flex-shrink-0 text-xs font-black text-primary uppercase text-right tracking-widest">生命周期</label>
                                  <div className="flex flex-wrap gap-2">
                                      {currentForm.stage === ProjectStage.EARLY && (
                                          <button type="button" onClick={() => setCurrentForm({ ...currentForm, stage: ProjectStage.GROUP_PROGRESS })} className="px-4 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:opacity-90 flex items-center gap-2"><Plus className="h-4 w-4" /> 转为进行中</button>
                                      )}
                                      {currentForm.stage === ProjectStage.GROUP_PROGRESS && (
                                          <>
                                              <button type="button" onClick={() => setCurrentForm({ ...currentForm, stage: ProjectStage.COMPLETED })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> 转为已完成</button>
                                              <button type="button" onClick={() => setCurrentForm({ ...currentForm, stage: ProjectStage.EARLY })} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-600 flex items-center gap-2"><History className="h-4 w-4" /> 回退为前期项目</button>
                                          </>
                                      )}
                                      {currentForm.stage === ProjectStage.COMPLETED && (
                                          <button type="button" onClick={() => setCurrentForm({ ...currentForm, stage: ProjectStage.GROUP_PROGRESS })} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-600 flex items-center gap-2"><History className="h-4 w-4" /> 回退为进行中</button>
                                      )}
                                      <span className="ml-2 px-3 py-2 bg-white border rounded-xl text-[10px] font-black text-muted-foreground uppercase">当前：{currentForm.stage}</span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                                  {columns.filter(c => c.key !== 'actions' && c.key !== 'id' && c.key !== 'statusLight' && c.key !== 'annualContract' && c.key !== 'annualCollection' && c.key !== 'nextPlan').map(col => (
                                      <div key={col.key as string} className="flex items-center gap-4 group">
                                          <label className="w-28 flex-shrink-0 text-[11px] font-black text-muted-foreground uppercase text-right leading-tight tracking-wider group-hover:text-primary transition-colors flex items-center justify-end gap-1">
                                              {col.header}
                                              {col.key === 'paymentProgress' && (
                                                  <div className="group/tip relative">
                                                      <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground border border-border text-[10px] rounded-lg opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all z-50 font-medium shadow-xl">计算规则：已收款总额 / 我所合同额</div>
                                                  </div>
                                              )}
                                          </label>
                                          <div className="flex-1">
                                              {col.inputType === 'multi-select' ? (
                                                  <CustomMultiSelect 
                                                      value={currentForm[col.key as keyof Project] as string || ''} 
                                                      onChange={(val) => setCurrentForm({...currentForm, [col.key as string]: val})}
                                                      options={dictionaries?.[col.dictKey!] || []}
                                                      isTree={col.key === 'teamMembers'}
                                                  />
                                              ) : col.inputType === 'select' ? (
                                                  <select className="h-9 w-full rounded-xl border-2 border-border bg-card px-2 text-sm font-bold text-foreground outline-none focus:border-primary transition-all shadow-sm" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})}>
                                                      <option value="">{(!dictionaries?.[col.dictKey!] || dictionaries[col.dictKey!].length === 0) ? '正在加载选项...' : '请选择'}</option>
                                                      {dictionaries?.[col.dictKey!]?.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                                                  </select>
                                              ) : col.inputType === 'textarea' ? (
                                                  <textarea className="w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-bold text-foreground min-h-[60px] outline-none focus:border-primary transition-all shadow-sm resize-none" value={currentForm[col.key as keyof Project] as string || ''} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.value})} />
                                              ) : col.inputType === 'boolean' ? (
                                                  <div className="h-9 flex items-center"><input type="checkbox" className="h-5 w-5 rounded-lg border-2 border-border bg-card text-primary focus:ring-primary/20 transition-all" checked={!!currentForm[col.key as keyof Project]} onChange={e => setCurrentForm({...currentForm, [col.key as string]: e.target.checked})} /></div>
                                              ) : (
                                                  <input type={col.inputType === 'number' ? 'number' : col.inputType === 'date' ? 'date' : 'text'} className={`h-9 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-primary transition-all shadow-sm ${col.key === 'collectedAmount' || col.key === 'paymentProgress' ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-70' : ''}`} value={currentForm[col.key as keyof Project] as string || ''} readOnly={col.key === 'collectedAmount' || col.key === 'paymentProgress'} onChange={e => setCurrentForm({...currentForm, [col.key as string]: col.inputType === 'number' ? parseFloat(e.target.value) : e.target.value})} />
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="pt-6 border-t-2 border-border space-y-4">
                                  <div className="flex items-center justify-between"><h4 className="text-lg font-black flex items-center gap-3 text-foreground"><Coins className="h-5 w-5 text-amber-500" /> 年度收款数据汇总</h4><button type="button" onClick={() => setFormAnnualData([...formAnnualData, {year: selectedYear === 'all' ? new Date().getFullYear() : selectedYear, contractAmount:0, collectedAmount:0}])} className="text-xs font-black text-primary px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 transition-all hover:bg-primary/10">+ 新增年度记录</button></div>
                                  <div className="space-y-3">{formAnnualData.map((d, idx) => (
                                      <div key={idx} className="relative p-4 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row sm:items-center gap-4 animate-in slide-in-from-right-2">
                                          <div className="flex flex-1 items-center gap-6">
                                              <label className="w-12 flex-shrink-0 text-[10px] font-black text-muted-foreground uppercase text-right tracking-widest">年份</label>
                                              <input type="number" className="h-10 w-24 bg-card border-2 border-border rounded-lg px-3 text-sm font-black text-foreground shadow-sm focus:border-primary outline-none" value={d.year} onChange={e => {const n=[...formAnnualData]; n[idx].year=Number(e.target.value); setFormAnnualData(n);}} />
                                              <label className="w-24 flex-shrink-0 text-[10px] font-black text-muted-foreground uppercase text-right tracking-widest">已收款金额</label>
                                              <input type="number" className="h-10 flex-1 bg-card border-2 border-border rounded-lg px-3 text-sm font-black text-foreground shadow-sm focus:border-primary outline-none" value={d.collectedAmount} onChange={e => {const n=[...formAnnualData]; n[idx].collectedAmount=Number(e.target.value); setFormAnnualData(n); const total = n.reduce((sum, item) => sum + (item.collectedAmount || 0), 0); setCurrentForm(prev => ({...prev, collectedAmount: total})); }} />
                                          </div>
                                          <button type="button" onClick={() => {const n = formAnnualData.filter((_,i)=>i!==idx); setFormAnnualData(n); const total = n.reduce((sum, item) => sum + (item.collectedAmount || 0), 0); setCurrentForm(prev => ({...prev, collectedAmount: total})); }} className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-card rounded-lg transition-all border border-transparent hover:border-border shadow-sm"><Trash2 className="h-4 w-4"/></button>
                                      </div>))}</div>
                              </div>

                              <div className="pt-6 border-t-2 border-border space-y-4">
                                  <div className="flex items-center justify-between"><h4 className="text-lg font-black flex items-center gap-3 text-foreground"><CheckCircle2 className="h-5 w-5 text-green-500" /> 未来收款计划任务</h4><button type="button" onClick={() => setFormCollectionPlan([...formCollectionPlan, {year: selectedYear === 'all' ? new Date().getFullYear() : selectedYear, month: new Date().getMonth() + 1, amount: 0, completed: false}])} className="text-xs font-black text-primary px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 transition-all hover:bg-primary/10">+ 添加计划项</button></div>
                                  <div className="space-y-3">{formCollectionPlan.map((p, idx) => (
                                      <div key={idx} className="relative p-4 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row sm:items-center gap-4">
                                          <div className="flex flex-1 items-center gap-4 flex-wrap">
                                              <input 
                                                type="checkbox" 
                                                checked={p.completed} 
                                                onChange={e => {
                                                    const isChecking = e.target.checked;
                                                    if (isChecking) {
                                                        confirmCustom(
                                                            '确认完成',
                                                            `您确定要标记该笔 ${p.year}年${p.month}月 的收款 (¥${p.amount.toLocaleString()}) 已完成吗？系统将自动将其加总到年度汇总中。`,
                                                            () => {
                                                                const n = [...formCollectionPlan];
                                                                n[idx].completed = true;
                                                                setFormCollectionPlan(n);
                                                                
                                                                setFormAnnualData(prev => {
                                                                    const existing = prev.find(d => d.year === p.year);
                                                                    let next;
                                                                    if (existing) {
                                                                        next = prev.map(d => d.year === p.year ? { ...d, collectedAmount: (d.collectedAmount || 0) + p.amount } : d);
                                                                    } else {
                                                                        next = [...prev, { year: p.year, contractAmount: 0, collectedAmount: p.amount }];
                                                                    }
                                                                    const total = next.reduce((sum, item) => sum + (item.collectedAmount || 0), 0);
                                                                    setCurrentForm(curr => ({...curr, collectedAmount: total}));
                                                                    return next;
                                                                });
                                                            }
                                                        );
                                                    } else {
                                                        confirmCustom(
                                                            '取消确认',
                                                            `确定要取消该笔 ${p.year}年${p.month}月 的收款标记吗？系统将自动从年度汇总中扣除 ¥${p.amount.toLocaleString()}。`,
                                                            () => {
                                                                const n = [...formCollectionPlan];
                                                                n[idx].completed = false;
                                                                setFormCollectionPlan(n);

                                                                setFormAnnualData(prev => {
                                                                    const next = prev.map(d => d.year === p.year ? { ...d, collectedAmount: Math.max(0, (d.collectedAmount || 0) - p.amount) } : d);
                                                                    const total = next.reduce((sum, item) => sum + (item.collectedAmount || 0), 0);
                                                                    setCurrentForm(curr => ({...curr, collectedAmount: total}));
                                                                    return next;
                                                                });
                                                            }
                                                        );
                                                    }
                                                }} 
                                                className="h-6 w-6 rounded-lg border-2 border-border bg-card text-primary focus:ring-primary/20 cursor-pointer" 
                                              />
                                              <div className="flex items-center gap-2">
                                                  <label className="text-[10px] font-black text-muted-foreground uppercase">年份</label>
                                                  <input type="number" disabled={p.completed} className="h-9 w-20 bg-card border-2 border-border rounded-lg px-2 text-xs font-black disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed" value={p.year} onChange={e => {const n=[...formCollectionPlan]; n[idx].year=Number(e.target.value); setFormCollectionPlan(n);}} />
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <label className="text-[10px] font-black text-muted-foreground uppercase">月份</label>
                                                  <select disabled={p.completed} className="h-9 w-20 bg-card border-2 border-border rounded-lg px-1 text-xs font-black disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed" value={p.month} onChange={e => {const n=[...formCollectionPlan]; n[idx].month=Number(e.target.value); setFormCollectionPlan(n);}}>
                                                      {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                                                  </select>
                                              </div>
                                              <div className="flex flex-1 items-center gap-2 min-w-[150px]">
                                                  <label className="text-[10px] font-black text-muted-foreground uppercase">计划金额</label>
                                                  <input type="number" disabled={p.completed} className="h-9 flex-1 bg-card border-2 border-border rounded-lg px-3 text-xs font-black disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed" value={p.amount} onChange={e => {const n=[...formCollectionPlan]; n[idx].amount=Number(e.target.value); setFormCollectionPlan(n);}} />
                                              </div>
                                          </div>
                                          <button type="button" onClick={() => {
                                              const taskToDelete = formCollectionPlan[idx];
                                              if (taskToDelete.completed) {
                                                  // 如果已完成，先从年度数据中扣除
                                                  setFormAnnualData(prev => {
                                                      const next = prev.map(d => d.year === taskToDelete.year ? { ...d, collectedAmount: Math.max(0, (d.collectedAmount || 0) - taskToDelete.amount) } : d);
                                                      const total = next.reduce((sum, item) => sum + (item.collectedAmount || 0), 0);
                                                      setCurrentForm(curr => ({...curr, collectedAmount: total}));
                                                      return next;
                                                  });
                                              }
                                              setFormCollectionPlan(formCollectionPlan.filter((_,i)=>i!==idx));
                                          }} className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-card rounded-lg transition-all border border-transparent hover:border-border shadow-sm"><Trash2 className="h-4 w-4"/></button>
                                      </div>))}</div>
                              </div>
                          </form>
                      </div>
                      <div className="lg:col-span-6 border-l border-border pl-8 flex flex-col h-full overflow-hidden bg-muted/10 rounded-r-3xl -my-8 py-8">
                          <div className="flex-1 min-h-0 flex flex-row gap-6 h-full">
                              {renderTimelineSection('重要工作记录', formTimeline, setFormTimeline, 'primary', false)}
                              {renderTimelineSection('工作计划', formNextPlan, setFormNextPlan, 'primary', true)}
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-end gap-4 border-t border-border pt-6 mt-4 shrink-0">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-3 rounded-2xl border-2 border-border text-foreground font-black text-sm uppercase tracking-widest hover:bg-muted transition-all active:scale-95">取消</button>
                      <button onClick={handleSubmit} className="px-12 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:opacity-90 transition-all active:scale-95">保存</button>
                  </div>
              </div>
          </div>
      )}

      {viewProject && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in" onClick={() => setViewProject(null)}>
             <div className="bg-card w-full max-w-[95vw] h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row border border-border" onClick={e => e.stopPropagation()}>
                 <div className="p-12 md:w-1/2 border-r border-border overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black tracking-tight text-foreground leading-none">{viewProject.name}</h3>
                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">ID: {viewProject.id} • {viewProject.department}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-10 text-sm">
                        {columns.filter(c => c.key !== 'actions' && c.key !== 'name').map(col => (
                            <div key={col.key as string} className="space-y-2">
                                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">{col.header}</span>
                                <div className="font-bold text-foreground text-lg leading-tight">
                                    {col.key === 'annualContract' ? formatMoney(getAnnualValue(viewProject, 'contractAmount')) : 
                                     col.key === 'annualCollection' ? formatMoney(getAnnualValue(viewProject, 'collectedAmount')) : 
                                     col.key === 'teamMembers' ? renderTeamMembersCell(viewProject[col.key as keyof Project] as string) :
                                     col.dictKey ? renderDictCell(viewProject[col.key as keyof Project] as string, col.dictKey) : 
                                     (viewProject[col.key as keyof Project] === true ? '是' : viewProject[col.key as keyof Project] === false ? '否' : String(viewProject[col.key as keyof Project] || '-'))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setViewProject(null)} className="mt-12 w-full py-4 bg-foreground text-background rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:opacity-90">关闭详情面板</button>
                 </div>
                 
                 <div className="bg-muted/30 p-12 md:w-1/2 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 flex flex-row gap-8 h-full">
                        {renderTimelineSection('重要工作记录', Array.isArray(viewProject.timeline) ? viewProject.timeline : [], null, 'primary', false)}
                        {renderTimelineSection('工作计划', Array.isArray(viewProject.nextPlan) ? viewProject.nextPlan : [], null, 'primary', true)}
                    </div>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProjectTable;