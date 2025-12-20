import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Area
} from 'recharts';
import { Project, ProjectStage, AnnualData } from '../types';
import { Wallet, TrendingUp, FileText, Target, PieChart as PieIcon, BarChart3, Building, Calendar, Filter, X, CheckSquare, Square, Maximize2, GripHorizontal } from 'lucide-react';

interface DashboardProps {
    selectedYear: number;
    availableYears: number[];
    onSelectYear: (year: number) => void;
    selectedQuarter: string;
    projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ selectedYear, selectedQuarter, projects }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'early'>('financial');
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  
  const [zoomedChart, setZoomedChart] = useState<{key: string, title: string, fields: string[]} | null>(null);
  const [zoomedFilters, setZoomedFilters] = useState<Record<string, string[]>>({});

  const [chartSizes, setChartSizes] = useState<Record<string, { w: string, h: number }>>(() => {
      const saved = localStorage.getItem('dashboard_v7_sizes');
      return saved ? JSON.parse(saved) : {};
  });

  const [localFilters, setLocalFilters] = useState<Record<string, Record<string, string[]>>>(() => {
      const saved = localStorage.getItem('dashboard_v7_filters');
      return saved ? JSON.parse(saved) : { contractSource: {}, collectionSource: {}, contractType: {}, collectionType: {}, regional: {}, earlySource: {}, earlyProbability: {}, earlyYear: {}, earlyType: {} };
  });

  const [chartOrder, setChartOrder] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem('dashboard_v7_order');
      return saved ? JSON.parse(saved) : {
          financial: ['contractSource', 'collectionSource', 'contractType', 'collectionType', 'regional'],
          early: ['earlySource', 'earlyProbability', 'earlyYear', 'earlyType']
      };
  });

  useEffect(() => { localStorage.setItem('dashboard_v7_sizes', JSON.stringify(chartSizes)); }, [chartSizes]);
  useEffect(() => { localStorage.setItem('dashboard_v7_filters', JSON.stringify(localFilters)); }, [localFilters]);
  useEffect(() => { localStorage.setItem('dashboard_v7_order', JSON.stringify(chartOrder)); }, [chartOrder]);

  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomedChart(null); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const toggleFilterValue = (chartKey: string, field: string, val: string, isZoomed = false) => {
      if (isZoomed) {
          setZoomedFilters(prev => {
              const current = prev[field] || [];
              const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
              return { ...prev, [field]: next };
          });
      } else {
          setLocalFilters(prev => {
              const current = prev[chartKey][field] || [];
              const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
              return { ...prev, [chartKey]: { ...prev[chartKey], [field]: next } };
          });
      }
  };

  const onResize = (key: string, width: string, height: number) => {
      setChartSizes(prev => ({ ...prev, [key]: { w: width, h: height } }));
  };

  const handleZoom = (key: string, title: string, fields: string[]) => {
      setZoomedFilters({ ...localFilters[key] });
      setZoomedChart({ key, title, fields });
  };

  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDragStart = (key: string) => setDraggedKey(key);
  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      setDragOverKey(targetKey);
      if (!draggedKey || draggedKey === targetKey) return;
      
      const currentOrder = [...chartOrder[activeTab]];
      const dragIdx = currentOrder.indexOf(draggedKey);
      const hoverIdx = currentOrder.indexOf(targetKey);
      
      currentOrder.splice(dragIdx, 1);
      currentOrder.splice(hoverIdx, 0, draggedKey);
      setChartOrder(prev => ({ ...prev, [activeTab]: currentOrder }));
  };
  const handleDragEnd = () => {
      setDraggedKey(null);
      setDragOverKey(null);
  };

  const processPieData = (data: {name: string, value: number}[]) => {
      if (data.length <= 7) return data;
      const sorted = [...data].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 6);
      const others = sorted.slice(6).reduce((acc, curr) => acc + curr.value, 0);
      return [...top, { name: '其他', value: others }];
  };

  const getAnalytics = (customFilters?: Record<string, Record<string, string[]>>) => {
    const filtersToUse = customFilters || localFilters;
    const yearProjects = projects.filter(p => {
        const hasAnnualData = p.annualData?.some(d => d.year === selectedYear);
        const isEarlyForYear = p.stage === ProjectStage.EARLY && p.estimatedSignYear === selectedYear.toString();
        const isSignedThisYear = p.signingDate?.startsWith(selectedYear.toString());
        return hasAnnualData || isEarlyForYear || isSignedThisYear;
    });
    const filterByQuarter = (data: Project[]) => {
        if (selectedQuarter === 'all') return data;
        return data.filter(p => {
            if (!p.signingDate) return false;
            const q = Math.ceil(parseInt(p.signingDate.split('-')[1]) / 3).toString();
            return q === selectedQuarter;
        });
    };
    const baseData = filterByQuarter(yearProjects);
    const projectsActive = baseData.filter(p => p.stage !== ProjectStage.EARLY);
    const earlyProjects = yearProjects.filter(p => p.stage === ProjectStage.EARLY);
    const getYearlyValue = (p: Project, key: keyof AnnualData) => {
        const record = p.annualData?.find(d => d.year === selectedYear);
        return (record?.[key] as number) || 0;
    };
    const applyMultiFilter = (data: Project[], filters: Record<string, string[]>) => {
        return data.filter(p => Object.entries(filters || {}).every(([field, values]) => {
            if (!values || values.length === 0) return true;
            return values.includes(p[field as keyof Project] as string);
        }));
    };
    const aggregate = (data: Project[], key: keyof Project, valFn: (p: Project) => number) => {
        const map = new Map<string, number>();
        data.forEach(p => {
            const k = (p[key] as string) || '未分类';
            map.set(k, (map.get(k) || 0) + valFn(p));
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    };

    return {
        totalContract: projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'contractAmount'), 0),
        totalCollected: projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'collectedAmount'), 0),
        contractTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0) * 0.8,
        collectionTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0) * 0.6,
        earlyTotal: earlyProjects.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        getChartData: (key: string, isZoomed = false) => {
            const currentChartFilters = isZoomed ? zoomedFilters : filtersToUse[key];
            const dataPool = key.startsWith('early') ? earlyProjects : projectsActive;
            const filtered = applyMultiFilter(dataPool, currentChartFilters);
            switch(key) {
                case 'contractSource': return processPieData(aggregate(filtered, 'source', p => getYearlyValue(p, 'contractAmount')));
                case 'collectionSource': return processPieData(aggregate(filtered, 'source', p => getYearlyValue(p, 'collectedAmount')));
                case 'contractType': return aggregate(filtered, 'category', p => getYearlyValue(p, 'contractAmount'));
                case 'collectionType': return aggregate(filtered, 'category', p => getYearlyValue(p, 'collectedAmount'));
                case 'regional': return { main: aggregate(filtered, 'region', p => getYearlyValue(p, 'contractAmount')), coll: aggregate(filtered, 'region', p => getYearlyValue(p, 'collectedAmount')) };
                case 'earlySource': return processPieData(aggregate(filtered, 'source', p => 1));
                case 'earlyProbability': return aggregate(filtered, 'probability', p => 1);
                case 'earlyYear': return aggregate(filtered, 'estimatedSignYear', p => p.totalAmount || 0);
                case 'earlyType': return processPieData(aggregate(filtered, 'category', p => 1));
                default: return [];
            }
        }
    };
  };

  const analytics = useMemo(() => getAnalytics(), [selectedYear, selectedQuarter, projects, localFilters]);
  const zoomedAnalytics = useMemo(() => zoomedChart ? getAnalytics() : null, [zoomedChart, zoomedFilters, projects]);

  const options = useMemo(() => {
      const getUnique = (key: keyof Project) => Array.from(new Set(projects.map(p => p[key] as string).filter(Boolean))).sort();
      return { department: getUnique('department'), region: getUnique('region'), source: getUnique('source'), category: getUnique('category'), threeReviewType: getUnique('threeReviewType'), probability: getUnique('probability') };
  }, [projects]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
  const formatWan = (val: number) => `¥${(val / 10000).toFixed(0)}w`;
  const fieldLabels: Record<string, string> = { department: '部门', region: '地区', source: '来源', category: '类别', threeReviewType: '三审', probability: '可能性' };

  const renderChartContent = (key: string, height: number, isZoomed = false) => {
      const h = isZoomed ? (window.innerHeight * 0.6) : (height - 80);
      const data = isZoomed ? zoomedAnalytics!.getChartData(key, true) : analytics.getChartData(key);
      switch(key) {
          case 'contractSource': case 'collectionSource':
              return <ResponsiveContainer width="100%" height={h}><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={isZoomed ? 100 : 45} outerRadius={isZoomed ? 180 : 70} paddingAngle={4} dataKey="value" label={isZoomed}>{ data.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }</Pie><Tooltip formatter={(v:any)=>formatWan(v)}/><Legend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer>;
          case 'contractType': case 'collectionType':
              return <ResponsiveContainer width="100%" height={h}><BarChart data={data} layout="vertical" margin={{left: 10, right: 40}}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 600}} /><Tooltip formatter={(v:any)=>formatWan(v)} /><Bar dataKey="value" fill={key.includes('contract') ? '#6366f1' : '#10b981'} radius={[0, 4, 4, 0]} label={{position: 'right', fontSize: 10, fontWeight: 700}}/></BarChart></ResponsiveContainer>;
          case 'regional':
              const regData = data as any;
              return <ResponsiveContainer width="100%" height={h}><BarChart data={regData.main} margin={{bottom: 20}}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 600}} interval={0} angle={-30} textAnchor="end" /><YAxis tickFormatter={(v)=>`${v/10000}w`} tick={{fontSize: 9}}/><Tooltip formatter={(v:any)=>formatWan(v)}/><Legend verticalAlign="top" align="right"/><Bar dataKey="value" name="合同" fill="#6366f1" radius={[2, 2, 0, 0]} /><Bar data={regData.coll} dataKey="value" name="已收" fill="#f43f5e" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>;
          case 'earlySource': case 'earlyType':
              return <ResponsiveContainer width="100%" height={h}><PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={isZoomed ? 180 : 70} dataKey="value" label={isZoomed}>{ data.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }</Pie><Tooltip /><Legend verticalAlign="bottom"/></PieChart></ResponsiveContainer>;
          case 'earlyProbability':
              return <ResponsiveContainer width="100%" height={h}><BarChart data={data} margin={{top: 20}}><XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 700}} /><YAxis hide /><Tooltip /><Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={100} label={{position: 'top', fontSize: 11, fontWeight: 800}}/></BarChart></ResponsiveContainer>;
          case 'earlyYear':
              return <ResponsiveContainer width="100%" height={h}><ComposedChart data={data} margin={{bottom: 10}}><XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600}} /><YAxis tickFormatter={(v)=>`${v/10000}w`} tick={{fontSize: 9}}/><Tooltip formatter={(v:any)=>formatWan(v)}/><Area type="monotone" dataKey="value" fill="#6366f1" fillOpacity={0.1} stroke="#6366f1"/><Bar dataKey="value" fill="#6366f1" barSize={60} radius={[2, 2, 0, 0]} /></ComposedChart></ResponsiveContainer>;
          default: return null;
      }
  };

  const chartConfigs = {
    contractSource: { t: '合同来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionSource: { t: '收款来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    contractType: { t: '合同类别排行', f: ['department', 'region'], icon: <BarChart3 className="h-3.5 w-3.5"/> },
    collectionType: { t: '收款类别排行', f: ['department', 'region'], icon: <BarChart3 className="h-3.5 w-3.5"/> },
    regional: { t: '地区业务对比', f: ['department', 'category'], icon: <Building className="h-3.5 w-3.5"/> },
    earlySource: { t: '前期来源分析', f: ['region', 'department'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    earlyProbability: { t: '项目可能性分布', f: ['source', 'department'], icon: <Target className="h-3.5 w-3.5"/> },
    earlyYear: { t: '签约年份预估', f: ['department', 'region'], icon: <Calendar className="h-3.5 w-3.5"/> },
    earlyType: { t: '前期类型分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-[1800px] mx-auto px-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><BarChart3 className="text-primary h-7 w-7" /><h1 className="text-xl font-black tracking-tight text-gray-800 uppercase italic">Live Executive Dashboard</h1></div>
            <div className="flex p-1 bg-muted rounded-xl border text-[12px] font-bold shadow-sm">
                <button onClick={() => setActiveTab('financial')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'financial' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>财务经营</button>
                <button onClick={() => setActiveTab('early')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'early' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>前期跟进</button>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 transition-all">
            {activeTab === 'financial' ? (
              <>
                  <div className="w-full grid gap-4 grid-cols-2 lg:grid-cols-4 mb-2">
                      <CompactKPICard title="年度合同" value={analytics.totalContract} target={analytics.contractTarget} color="indigo" />
                      <CompactKPICard title="年度收款" value={analytics.totalCollected} target={analytics.collectionTarget} color="emerald" />
                      <div className="col-span-2 rounded-xl border bg-card p-4 flex items-center gap-6 shadow-sm border-b-4 border-b-primary/30">
                          <div className="flex-1">
                              <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 mb-1"><span>回款进度</span><span className="text-primary">{((analytics.totalCollected / (analytics.collectionTarget || 1)) * 100).toFixed(1)}%</span></div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden border"><div className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000" style={{ width: `${Math.min(100, (analytics.totalCollected / (analytics.collectionTarget || 1) * 100))}%` }}></div></div>
                          </div>
                      </div>
                  </div>
                  {chartOrder.financial.map(key => (<ChartCard key={key} title={(chartConfigs as any)[key].t} icon={(chartConfigs as any)[key].icon} fields={(chartConfigs as any)[key].f} filters={localFilters[key]} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, (chartConfigs as any)[key].t, (chartConfigs as any)[key].f)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 300)}</ChartCard>))}
              </>
            ) : (
              <>
                  <div className="w-full rounded-xl border bg-card p-5 shadow-sm bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between border-l-4 border-l-primary mb-2">
                      <div className="flex items-center gap-4"><div className="p-2.5 bg-primary/10 rounded-lg text-primary shadow-inner"><TrendingUp className="h-5 w-5"/></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">前期预估总额</p><h2 className="text-2xl font-black text-primary tracking-tighter">{formatWan(analytics.earlyTotal)}</h2></div></div>
                  </div>
                  {chartOrder.early.map(key => (<ChartCard key={key} title={(chartConfigs as any)[key].t} icon={(chartConfigs as any)[key].icon} fields={(chartConfigs as any)[key].f} filters={localFilters[key]} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, (chartConfigs as any)[key].t, (chartConfigs as any)[key].f)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 300)}</ChartCard>))}
              </>
            )}
        </div>
      </div>

      {/* Zoom Modal - MOVED OUTSIDE OF space-y-6 container to fix top margin issue */}
      {zoomedChart && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setZoomedChart(null)}>
              <div className="bg-background w-[95vw] h-[90vh] rounded-[2.5rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex justify-between items-center bg-muted/30 shrink-0">
                      <div className="flex items-center gap-3"><BarChart3 className="text-primary h-6 w-6" /><h3 className="text-xl font-black tracking-tight">{zoomedChart.title} - 深度穿透分析</h3></div>
                      <button onClick={() => setZoomedChart(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="h-6 w-6 text-gray-400"/></button>
                  </div>
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
                      <div className="w-full lg:w-80 border-r bg-muted/5 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/10 pb-2 flex items-center gap-2"><Filter className="h-3 w-3"/> 局部维度筛选</p>
                          {zoomedChart.fields.map(f => (
                              <div key={f} className="space-y-3">
                                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">{fieldLabels[f]}</p>
                                  <div className="flex flex-wrap gap-2">
                                      {(options as any)[f]?.map((v:any) => {
                                          const sel = (zoomedFilters[f] || []).includes(v);
                                          return <button key={v} onClick={() => toggleFilterValue(zoomedChart.key, f, v, true)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${sel ? 'bg-primary text-white border-primary shadow-md scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-primary'}`}>{v}</button>
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex-1 p-8 flex items-center justify-center relative min-h-0">{renderChartContent(zoomedChart.key, 0, true)}</div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

const CompactKPICard = ({ title, value, target, color }: any) => (
    <div className={`rounded-xl border bg-card p-4 shadow-sm border-t-4 ${color === 'indigo' ? 'border-t-indigo-500' : 'border-t-emerald-500'}`}>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className={`text-xl font-black ${color === 'indigo' ? 'text-indigo-700' : 'text-emerald-700'} tracking-tight`}>¥{(value / 10000).toFixed(0)}w</h3>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed text-[9px]"><span className="text-gray-400 font-medium">目标: {(target / 10000).toFixed(0)}w</span><span className={`font-black ${value >= target ? 'text-emerald-600' : 'text-orange-500'}`}>{((value / (target || 1)) * 100).toFixed(0)}%</span></div>
    </div>
);

const ChartCard = ({ title, icon, children, fields, filters, options, labels, onToggle, isOpen, onOpen, onZoom, size, onResize, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }: any) => {
    const activeCount = Object.values(filters).flat().length;
    const cardRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const startResize = (e: React.MouseEvent) => {
        e.preventDefault(); setIsResizing(true);
        const startX = e.pageX, startY = e.pageY, startW = cardRef.current?.offsetWidth || 0, startH = cardRef.current?.offsetHeight || 0;
        const onMouseMove = (me: MouseEvent) => onResize(`${startW + (me.pageX - startX)}px`, startH + (me.pageY - startY));
        const onMouseUp = () => { setIsResizing(false); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    };
    return (
        <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} className={`rounded-xl border bg-card shadow-sm flex flex-col relative group transition-all duration-300 ${isDragging ? 'opacity-20 scale-95 border-dashed border-primary shadow-none' : 'opacity-100'} ${isDragOver ? 'ring-2 ring-primary ring-offset-4' : ''} ${!isDragging && !isResizing ? 'hover:shadow-xl hover:-translate-y-1' : ''}`} ref={cardRef} style={{ width: size?.w || 'calc(33.333% - 11px)', height: size?.h || 300, minWidth: '300px', minHeight: '250px' }}>
            <div className="p-3 pb-2 flex items-center justify-between border-b bg-muted/5 shrink-0 cursor-grab active:cursor-grabbing group/header">
                <div className="flex items-center gap-2">
                    <GripHorizontal className={`h-3.5 w-3.5 transition-colors ${isDragging ? 'text-primary' : 'text-gray-300 group-hover/header:text-primary'}`} />
                    <div className="p-1 bg-primary/10 rounded text-primary">{icon}</div>
                    <h3 className="font-bold text-[13px] tracking-tight text-gray-700">{title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onZoom} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-colors"><Maximize2 className="h-3.5 w-3.5"/></button>
                    <button onClick={onOpen} className={`p-1.5 rounded-md border transition-all ${activeCount > 0 ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:text-primary'}`}><Filter className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            {isOpen && (
                <div className="absolute top-12 right-2 left-2 z-[50] bg-white border rounded-xl shadow-2xl p-4 space-y-4 animate-in zoom-in-95 ring-1 ring-black/5">
                    <div className="flex justify-between items-center border-b pb-2"><span className="text-[10px] font-black text-primary uppercase">看板配置</span><button onClick={onOpen}><X className="h-3.5 w-3.5 text-gray-400"/></button></div>
                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {fields.map((f: string) => (
                            <div key={f} className="space-y-2">
                                <p className="text-[9px] font-black text-gray-400 uppercase">{labels[f]}</p>
                                <div className="flex flex-wrap gap-1.5">{options[f]?.map((v: string) => {
                                    const sel = (filters[f] || []).includes(v);
                                    return <button key={v} onClick={() => onToggle(f, v)} className={`px-2 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-1 transition-all ${sel ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary'}`}>{sel ? <CheckSquare className="h-2.5 w-2.5" /> : <Square className="h-2.5 w-2.5" />}{v}</button>;
                                })}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="p-4 flex-1 relative overflow-hidden">{children}</div>
            <div onMouseDown={startResize} className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group-hover:opacity-100 opacity-0 transition-opacity"><div className="w-2 h-2 border-r-2 border-b-2 border-gray-300 rounded-br-sm" /></div>
            {isResizing && <div className="absolute inset-0 z-[60] bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl" />}
        </div>
    );
};

export default Dashboard;