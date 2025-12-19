import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, SystemDictionary, AnnualData } from '../types';
import { Search, SlidersHorizontal, Plus, Eye, Edit, Trash2, X, FileText, Check, X as XIcon, Calendar, Coins, Filter } from 'lucide-react';

export interface ColumnDef {
  key: keyof Project | 'actions' | 'annualContract' | 'annualCollection';
  header: string;
  render?: (value: any, row: Project) => React.ReactNode;
  inputType?: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean';
  dictKey?: string; // Explicit dictionary key
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
}

const formatMoney = (val: any) => val ? `¥${Number(val).toLocaleString()}` : '-';

const ProjectTable: React.FC<ProjectTableProps> = ({ 
    data, 
    title, 
    columns, 
    dictionaries,
    onAddProject, 
    onEditProject,
    onDeleteProject,
    showAddButton,
    selectedYear,
    availableYears,
    onSelectYear
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key as string));
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const columnToggleRef = useRef<HTMLDivElement>(null);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentForm, setCurrentForm] = useState<Partial<Project>>({});
  const [formAnnualData, setFormAnnualData] = useState<AnnualData[]>([]);
  
  // View Modal State
  const [viewProject, setViewProject] = useState<Project | null>(null);

  // Mock advanced search fields (subset for demo)
  const [advancedFilters, setAdvancedFilters] = useState({
      clientName: '',
      responsiblePerson: '',
      minAmount: '',
  });

  // Handle click outside for column toggle
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnToggleRef.current && !columnToggleRef.current.contains(event.target as Node)) {
        setShowColumnToggle(false);
      }
    };

    if (showColumnToggle) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnToggle]);

  // Close toggle when data or columns change (switching views)
  useEffect(() => {
      setShowColumnToggle(false);
      // Optional: Clear filters when switching views to avoid confusion
      // setColumnFilters({}); 
  }, [data, columns, title]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
        // Basic Search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchLower) || 
            (item.contractNo && item.contractNo.toLowerCase().includes(searchLower)) ||
            (item.clientName && item.clientName.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;

        // Advanced Search
        if (showAdvancedSearch) {
             if (advancedFilters.clientName && !item.clientName?.includes(advancedFilters.clientName)) return false;
             if (advancedFilters.responsiblePerson && !item.responsiblePerson?.includes(advancedFilters.responsiblePerson)) return false;
             if (advancedFilters.minAmount && (item.totalAmount || 0) < Number(advancedFilters.minAmount)) return false;
        }

        // Column Header Filters
        for (const [key, filterVal] of Object.entries(columnFilters)) {
            if (filterVal) {
                const itemVal = item[key as keyof Project];
                // Strict equality for dictionary items or checks if undefined
                if (itemVal !== filterVal) return false;
            }
        }

        return true;
    });
  }, [data, searchTerm, showAdvancedSearch, advancedFilters, columnFilters]);

  // Handlers
  const handleOpenAdd = () => {
      setModalMode('add');
      setCurrentForm({});
      setFormAnnualData([]); // Init empty annual data
      setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
      setModalMode('edit');
      setCurrentForm({ ...project });
      setFormAnnualData(project.annualData || []); // Load existing annual data
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('确认删除该项目吗？此操作将记录在系统日志中。')) {
          if (onDeleteProject) onDeleteProject(id);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Merge annual data into form before submitting
      const finalData = { ...currentForm, annualData: formAnnualData };

      if (modalMode === 'add' && onAddProject) {
          onAddProject(finalData);
      } else if (modalMode === 'edit' && onEditProject) {
          onEditProject(finalData as Project);
      }
      setIsModalOpen(false);
      setCurrentForm({});
      setFormAnnualData([]);
  };

  // Prevent Enter Key Submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
  };

  const toggleColumn = (key: string) => {
      setVisibleColumns(prev => 
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
  };

  const clearAllFilters = () => {
      setColumnFilters({});
      setSearchTerm('');
      setAdvancedFilters({ clientName: '', responsiblePerson: '', minAmount: '' });
  };

  // Annual Data Helper
  const getAnnualValue = (row: Project, key: 'annualContract' | 'annualCollection') => {
      const record = row.annualData?.find(d => d.year === selectedYear);
      if (key === 'annualContract') return record?.contractAmount;
      if (key === 'annualCollection') return record?.collectedAmount;
      return 0;
  };

  // Modal Annual Data Manager
  const handleAnnualChange = (index: number, field: keyof AnnualData, value: any) => {
      const newData = [...formAnnualData];
      newData[index] = { ...newData[index], [field]: value };
      setFormAnnualData(newData);
  };

  const addAnnualRow = () => {
      setFormAnnualData([...formAnnualData, { year: selectedYear, contractAmount: 0, collectedAmount: 0 }]);
  };

  const removeAnnualRow = (index: number) => {
      const newData = formAnnualData.filter((_, i) => i !== index);
      setFormAnnualData(newData);
  };

  // Helper to render dictionary badge
  const renderDictCell = (value: string, dictKey: string) => {
      if (!value || !dictionaries || !dictionaries[dictKey]) return value || '-';
      
      const item = dictionaries[dictKey].find(d => d.label === value);
      if (item) {
          return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.bgColor} ${item.textColor} border border-transparent`}>
                  {value}
              </span>
          );
      }
      return value;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-4">
            {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="搜索项目名称、编号..."
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm pl-9 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {/* Clear Filters Button */}
            {(Object.values(columnFilters).some(Boolean) || searchTerm || showAdvancedSearch) && (
                 <button 
                    onClick={clearAllFilters}
                    className="h-9 px-3 rounded-md border border-dashed border-red-300 text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition-colors"
                >
                    <X className="h-4 w-4" />
                    清除
                </button>
            )}

            {/* Advanced Search Toggle */}
            <button 
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 hover:bg-muted ${showAdvancedSearch ? 'bg-muted' : 'bg-background'}`}
            >
                <SlidersHorizontal className="h-4 w-4" />
                高级
            </button>

            {/* Column Toggle */}
            <div className="relative" ref={columnToggleRef}>
                <button 
                    onClick={() => setShowColumnToggle(!showColumnToggle)}
                    className="h-9 px-3 rounded-md border bg-background text-sm font-medium flex items-center gap-2 hover:bg-muted"
                >
                    <Eye className="h-4 w-4" />
                    列显示
                </button>
                {showColumnToggle && (
                    <div className="absolute right-0 top-10 z-50 w-56 rounded-md border bg-popover p-2 shadow-md bg-white dark:bg-zinc-800">
                        <div className="space-y-1">
                            {columns.filter(c => c.key !== 'actions').map(col => (
                                <label key={col.key as string} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={visibleColumns.includes(col.key as string)}
                                        onChange={() => toggleColumn(col.key as string)}
                                        className="rounded border-gray-300"
                                    />
                                    {col.header}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Project Button */}
            {showAddButton && (
                <button 
                    onClick={handleOpenAdd}
                    className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 shadow"
                >
                    <Plus className="h-4 w-4" />
                    新增项目
                </button>
            )}
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
          <div className="rounded-lg border bg-muted/30 p-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                  <label className="text-xs font-medium">甲方名称</label>
                  <input 
                    className="h-8 w-full rounded border px-2 text-sm" 
                    value={advancedFilters.clientName}
                    onChange={e => setAdvancedFilters({...advancedFilters, clientName: e.target.value})}
                  />
              </div>
              <div className="space-y-1">
                  <label className="text-xs font-medium">负责人</label>
                   <input 
                    className="h-8 w-full rounded border px-2 text-sm" 
                    value={advancedFilters.responsiblePerson}
                    onChange={e => setAdvancedFilters({...advancedFilters, responsiblePerson: e.target.value})}
                  />
              </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium">最小合同额</label>
                   <input 
                    type="number"
                    className="h-8 w-full rounded border px-2 text-sm" 
                    value={advancedFilters.minAmount}
                    onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})}
                  />
              </div>
          </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto" style={{ maxHeight: '65vh' }}>
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b sticky top-0 bg-secondary z-10">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {columns.map((col) => {
                    if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                    
                    let header = col.header;
                    if (col.key === 'annualContract') header = `${selectedYear} 合同额`;
                    if (col.key === 'annualCollection') header = `${selectedYear} 收款`;

                    // Logic to check if filtering is enabled for this column
                    const isFilterable = col.inputType === 'select' && col.dictKey && dictionaries?.[col.dictKey];
                    const activeFilter = columnFilters[col.key as string];

                    return (
                        <th key={col.key as string} className="h-12 px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <span>{header}</span>
                                {isFilterable && (
                                    <div className="relative group/filter cursor-pointer" title={`筛选 ${header}`}>
                                        <Filter 
                                            className={`h-3 w-3 transition-colors ${activeFilter ? 'text-primary fill-primary' : 'text-muted-foreground/40 group-hover/filter:text-primary'}`} 
                                        />
                                        {/* Invisible select over the icon to trigger standard browser dropdown */}
                                        <select
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            value={activeFilter || ''}
                                            onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.key as string]: e.target.value }))}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">全部</option>
                                            {dictionaries![col.dictKey!].map((opt) => (
                                                <option key={opt.label} value={opt.label}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </th>
                    );
                })}
                {/* Actions Header */}
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground whitespace-nowrap text-right sticky right-0 bg-secondary shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">操作</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredData.length === 0 ? (
                <tr>
                    <td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">
                        未找到符合条件的项目。
                    </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {columns.map((col) => {
                        if (col.key !== 'actions' && !visibleColumns.includes(col.key as string)) return null;
                        
                        let cellContent: React.ReactNode;

                        if (col.key === 'annualContract' || col.key === 'annualCollection') {
                            const val = getAnnualValue(row, col.key);
                            cellContent = formatMoney(val);
                        } else if (col.render) {
                            cellContent = col.render(row[col.key as keyof Project], row);
                        } else if (col.dictKey) {
                            // Use generic dictionary renderer
                            const val = row[col.key as keyof Project] as string;
                            cellContent = renderDictCell(val, col.dictKey);
                        } else {
                            const val = row[col.key as keyof Project];
                            if (Array.isArray(val) || (typeof val === 'object' && val !== null && !React.isValidElement(val))) {
                                cellContent = '-';
                            } else {
                                cellContent = val === true ? <Check className="h-4 w-4 text-green-500" /> : val === false ? <XIcon className="h-4 w-4 text-red-300" /> : (val as React.ReactNode) || '-';
                            }
                        }

                        return (
                            <td key={`${row.id}-${col.key as string}`} className="p-4 align-middle whitespace-nowrap">
                                {cellContent}
                            </td>
                        );
                    })}
                    {/* Action Buttons */}
                    <td className="p-4 align-middle whitespace-nowrap text-right sticky right-0 bg-card/95 backdrop-blur-sm shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end gap-2">
                             <button onClick={() => setViewProject(row)} title="查看详情" className="p-1 hover:bg-muted rounded text-blue-600 transition-colors"><Eye className="h-4 w-4"/></button>
                             {onEditProject && <button onClick={() => handleOpenEdit(row)} title="编辑" className="p-1 hover:bg-muted rounded text-orange-600 transition-colors"><Edit className="h-4 w-4"/></button>}
                             {onDeleteProject && <button onClick={() => handleDelete(row.id)} title="删除" className="p-1 hover:bg-muted rounded text-red-600 transition-colors"><Trash2 className="h-4 w-4"/></button>}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        显示 {filteredData.length} 条记录。
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
              <div 
                className="bg-background w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg border p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex items-center justify-between mb-4 border-b pb-4">
                      <h3 className="text-lg font-bold">{modalMode === 'add' ? '新增项目' : '编辑项目'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {columns
                        .filter(c => c.key !== 'actions' && c.key !== 'id' && c.key !== 'annualContract' && c.key !== 'annualCollection')
                        .map(col => {
                          const options = col.dictKey && dictionaries ? dictionaries[col.dictKey] : null;

                          return (
                            <div key={col.key as string} className={`space-y-1 ${col.inputType === 'textarea' ? 'col-span-full' : ''}`}>
                                <label className="text-sm font-medium">{col.header}</label>
                                
                                {col.inputType === 'select' && options ? (
                                    <select
                                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        value={currentForm[col.key as keyof Project] as string || ''}
                                        onChange={(e) => setCurrentForm({...currentForm, [col.key as string]: e.target.value})}
                                    >
                                        <option value="">请选择</option>
                                        {options.map((opt: any) => (
                                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : col.inputType === 'textarea' ? (
                                     <textarea 
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                                        placeholder={`输入${col.header}`}
                                        value={currentForm[col.key as keyof Project] as string || ''}
                                        onChange={(e) => setCurrentForm({...currentForm, [col.key as string]: e.target.value})}
                                    />
                                ) : col.inputType === 'boolean' ? (
                                     <div className="flex items-center gap-4 h-9">
                                         <label className="flex items-center gap-2 text-sm cursor-pointer">
                                             <input 
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={!!currentForm[col.key as keyof Project]}
                                                onChange={(e) => setCurrentForm({...currentForm, [col.key as string]: e.target.checked})}
                                             />
                                             是 / 完成
                                         </label>
                                     </div>
                                ) : (
                                    <input 
                                        type={col.inputType === 'number' ? 'number' : col.inputType === 'date' ? 'date' : 'text'}
                                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        placeholder={col.inputType === 'date' ? '' : `输入${col.header}`}
                                        value={currentForm[col.key as keyof Project] as string || ''}
                                        onChange={(e) => setCurrentForm({...currentForm, [col.key as string]: col.inputType === 'number' ? parseFloat(e.target.value) : e.target.value})}
                                    />
                                )}
                            </div>
                          );
                      })}
                      
                      {/* Annual Data Editor Section */}
                      <div className="col-span-full border-t pt-4 mt-2">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Coins className="h-4 w-4 text-primary" />
                                年度数据管理 (合同 & 收款)
                            </h4>
                            <button type="button" onClick={addAnnualRow} className="text-xs flex items-center gap-1 text-primary hover:underline">
                                <Plus className="h-3 w-3" /> 添加年份
                            </button>
                        </div>
                        <div className="bg-muted/30 rounded-md p-3 space-y-2">
                            {formAnnualData.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">暂无年度数据，请添加。</p>}
                            {formAnnualData.map((data, idx) => (
                                <div key={idx} className="flex flex-wrap items-end gap-3 pb-2 border-b last:border-0 last:pb-0">
                                    <div className="w-20">
                                        <label className="text-xs text-muted-foreground block mb-1">年份</label>
                                        <input 
                                            type="number" 
                                            className="h-8 w-full rounded border px-2 text-sm"
                                            value={data.year}
                                            onChange={(e) => handleAnnualChange(idx, 'year', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                         <label className="text-xs text-muted-foreground block mb-1">该年合同额</label>
                                         <input 
                                            type="number" 
                                            className="h-8 w-full rounded border px-2 text-sm"
                                            value={data.contractAmount}
                                            onChange={(e) => handleAnnualChange(idx, 'contractAmount', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                         <label className="text-xs text-muted-foreground block mb-1">该年收款额</label>
                                         <input 
                                            type="number" 
                                            className="h-8 w-full rounded border px-2 text-sm"
                                            value={data.collectedAmount}
                                            onChange={(e) => handleAnnualChange(idx, 'collectedAmount', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                         <label className="text-xs text-muted-foreground block mb-1">收款日期</label>
                                         <input 
                                            type="date" 
                                            className="h-8 w-full rounded border px-2 text-sm"
                                            value={data.collectionDate || ''}
                                            onChange={(e) => handleAnnualChange(idx, 'collectionDate', e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeAnnualRow(idx)}
                                        className="h-8 w-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                      </div>

                      <div className="col-span-full pt-4 flex justify-end gap-2 border-t mt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md border hover:bg-muted">取消</button>
                          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
                              {modalMode === 'add' ? '保存项目' : '更新项目'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* View Modal */}
      {viewProject && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setViewProject(null)}
          >
             <div 
                className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg border p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
             >
                 <div className="flex items-center justify-between mb-4 border-b pb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">{viewProject.name}</h3>
                      </div>
                      <button onClick={() => setViewProject(null)}><X className="h-5 w-5"/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      {columns.filter(c => c.key !== 'actions').map(col => {
                           let header = col.header;
                           let valueContent;
                           
                           if (col.key === 'annualContract') {
                               header = `${selectedYear} 合同额`;
                               valueContent = formatMoney(getAnnualValue(viewProject, 'annualContract'));
                           } else if (col.key === 'annualCollection') {
                               header = `${selectedYear} 收款`;
                               valueContent = formatMoney(getAnnualValue(viewProject, 'annualCollection'));
                           } else if (col.dictKey) {
                               const val = viewProject[col.key as keyof Project] as string;
                               valueContent = renderDictCell(val, col.dictKey);
                           } else {
                               valueContent = col.render 
                                    ? col.render(viewProject[col.key as keyof Project], viewProject) 
                                    : viewProject[col.key as keyof Project] === true ? '是' : viewProject[col.key as keyof Project] === false ? '否' : viewProject[col.key as keyof Project] || '-';
                           }

                          return (
                              <div key={col.key as string} className="flex flex-col border-b pb-2">
                                  <span className="text-muted-foreground text-xs">{header}</span>
                                  <span className="font-medium mt-1">
                                      {valueContent}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
                  <div className="mt-6 flex justify-end">
                      <button onClick={() => setViewProject(null)} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90">
                          关闭
                      </button>
                  </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProjectTable;