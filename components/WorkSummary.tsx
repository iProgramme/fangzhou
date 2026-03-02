import React, { useState, useEffect } from 'react';
import { Calendar, Filter, ArrowUpRight, CheckCircle2, Activity, Flag, Coins, Layers, Download } from 'lucide-react';

interface WorkRecord {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string; // 'progress' | 'milestone' | 'payment'
  completed?: boolean;
  completedAt?: string;
  projectId: string;
  projectName: string;
  projectResponsible: string | null;
  projectDepartment: string;
  recordType: 'record' | 'plan';
  createdBy?: string;
}

const WorkSummary: React.FC = () => {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [filterType, setFilterType] = useState<'all' | 'record' | 'plan'>('all');
  const [importanceType, setImportanceType] = useState<'all' | 'progress' | 'milestone' | 'payment'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 初始化默认日期范围 (最近一年) - 使用原生 JS 替换 subYears
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1); // 往前推一年
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
        fetchRecords();
    }
  }, [startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await fetch(`/api/work-summary?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
      const matchRecordType = filterType === 'all' || r.recordType === filterType;
      const matchImportance = importanceType === 'all' || r.type === importanceType;
      return matchRecordType && matchImportance;
  });

  const getRecordTypeBadge = (type: string, recordType: 'record' | 'plan') => {
      if (recordType === 'plan') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">计划</span>;
      
      switch(type) {
          case 'milestone': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">里程碑</span>;
          case 'payment': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">财务</span>;
          default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">进度</span>;
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'milestone': return <Flag className="h-4 w-4" />;
          case 'payment': return <Coins className="h-4 w-4" />;
          default: return <Activity className="h-4 w-4" />;
      }
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
        alert('当前没有数据可导出');
        return;
    }

    // CSV Header
    const headers = ['日期', '项目名称', '任务/节点', '详细说明', '类型', '重要程度', '负责人', '部门', '完成状态', '完成日期'];
    
    // CSV Content
    const rows = filteredRecords.map(r => [
        r.date,
        r.projectName,
        r.title,
        r.description || '',
        r.recordType === 'plan' ? '计划' : '记录',
        r.type === 'milestone' ? '重要(里程碑)' : r.type === 'payment' ? '财务' : '普通',
        r.projectResponsible || '-',
        r.projectDepartment || '-',
        r.completed ? '已完成' : '未完成',
        r.completedAt || '-'
    ]);

    // Combine with BOM for Excel utf-8 support
    const csvContent = '\uFEFF' + [
        headers.join(','), 
        ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `工作动态汇总_${startDate}_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">工作动态汇总</h1>
                <p className="text-sm text-muted-foreground font-medium">全院项目工作记录与计划总览</p>
              </div>
            </div>
            <button 
                onClick={handleExport}
                disabled={loading || filteredRecords.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download className="h-4 w-4" />
                导出 CSV
            </button>
        </div>
        
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
             {/* Date Range */}
             <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border shadow-sm">
                <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
                <input 
                    type="date" 
                    className="bg-transparent text-xs font-bold px-1 outline-none text-foreground"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">至</span>
                <input 
                    type="date" 
                    className="bg-transparent text-xs font-bold px-1 outline-none text-foreground"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
             </div>

             <div className="h-8 w-px bg-border mx-2 hidden md:block" />

             {/* Type Filter */}
             <div className="flex bg-muted/30 p-1 rounded-xl border border-border shadow-sm">
                <button 
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    全部动态
                </button>
                <button 
                    onClick={() => setFilterType('record')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'record' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    仅看记录
                </button>
                <button 
                    onClick={() => setFilterType('plan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'plan' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    仅看计划
                </button>
             </div>

             {/* Importance Filter */}
             <div className="flex bg-muted/30 p-1 rounded-xl border border-border shadow-sm">
                <button 
                    onClick={() => setImportanceType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importanceType === 'all' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    所有级别
                </button>
                <button 
                    onClick={() => setImportanceType('progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importanceType === 'progress' ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    普通
                </button>
                <button 
                    onClick={() => setImportanceType('milestone')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importanceType === 'milestone' ? 'bg-amber-50 text-amber-600 shadow-sm border border-amber-100' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    重要(里程碑)
                </button>
                <button 
                    onClick={() => setImportanceType('payment')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importanceType === 'payment' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    财务
                </button>
             </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm font-bold">正在加载数据...</p>
            </div>
        ) : (
            <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">共找到 {filteredRecords.length} 条记录</span>
                </div>
                
                {filteredRecords.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                            <Filter className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">暂无符合条件的数据</h3>
                        <p className="text-sm text-muted-foreground">请尝试调整筛选条件或日期范围</p>
                    </div>
                ) : (
                    filteredRecords.map((record, idx) => (
                        <div key={idx} className="bg-card border border-border/60 rounded-xl p-5 flex gap-5 hover:shadow-lg hover:border-primary/20 transition-all group animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{animationDelay: `${idx * 0.05}s`}}>
                             {/* Date Column */}
                             <div className="flex flex-col items-center gap-3 pt-1 min-w-[80px]">
                                <div className="text-center">
                                    <span className="block text-xl font-black text-foreground leading-none">{record.date.split('-')[2]}</span>
                                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">{record.date.split('-')[0]}-{record.date.split('-')[1]}</span>
                                </div>
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border-2 transition-colors ${
                                    record.completed 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                    : record.type === 'milestone' 
                                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                                        : record.type === 'payment'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                            : 'bg-blue-50 border-blue-200 text-blue-600'
                                }`}>
                                    {record.completed ? <CheckCircle2 className="h-5 w-5" /> : getIcon(record.type)}
                                </div>
                             </div>
                             
                             {/* Content Column */}
                             <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className={`text-base font-bold text-foreground mb-1 ${record.completed ? 'line-through text-muted-foreground' : ''}`}>{record.title || '无标题'}</h3>
                                        <div className="flex items-center gap-2">
                                            {getRecordTypeBadge(record.type, record.recordType)}
                                            {record.completed && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">已完成</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-bold text-foreground bg-muted/50 px-2 py-1 rounded-lg">
                                            {record.projectDepartment}
                                        </div>
                                    </div>
                                </div>
                                
                                <p className={`text-sm text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/50 ${record.completed ? 'line-through opacity-70' : ''}`}>
                                    {record.description || '无详细描述'}
                                </p>
                                
                                <div className="flex items-center flex-wrap gap-4 pt-2 border-t border-dashed border-border text-xs font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5 bg-primary/5 text-primary px-2 py-1 rounded-md">
                                        <ArrowUpRight className="h-3 w-3" />
                                        项目: <span className="font-bold">{record.projectName}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        负责人: <span className="text-foreground">{record.projectResponsible || '-'}</span>
                                    </span>
                                    {record.completedAt && (
                                        <span className="ml-auto text-emerald-600 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            完成于: {record.completedAt}
                                        </span>
                                    )}
                                </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default WorkSummary;