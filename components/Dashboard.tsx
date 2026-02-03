import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Area
} from 'recharts';
import { Project, ProjectStage, AnnualData } from '../types';
import { 
  Wallet, TrendingUp, FileText, Target, PieChart as PieIcon, BarChart3, 
  Building, Calendar, Filter, X, CheckSquare, Square, Maximize2, 
  GripHorizontal, HelpCircle, Minimize2, Edit
} from 'lucide-react';

interface DashboardProps {
    selectedYear: number;
    availableYears: number[];
    onSelectYear: (year: number) => void;
    selectedQuarter: string;
    projects: Project[];
    dictionaries: any;
    onUpdateDictionary: (key: string, items: any[]) => Promise<void>;
}

const formatWan = (val: number) => `¥${(val / 10000).toFixed(0)}w`;

const safeParseJSON = (data: any) => {
    if (!data) return [];
    if (typeof data === 'object') return data;
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

const CompactKPICard = ({ title, value, target, manualTarget, onManualTargetChange, color, formula }: any) => {
    const progress = Math.min(100, (value / (target || 1)) * 100);
    const manualProgress = Math.min(100, (value / (manualTarget || 1)) * 100);
    const isIndigo = color === 'indigo';
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(manualTarget / 10000);

    // Sync local editValue when external manualTarget changes (e.g. year change or DB load)
    useEffect(() => {
        setEditValue(manualTarget / 10000);
    }, [manualTarget]);

    return (
        <div className={`flex-1 rounded-2xl border bg-card p-6 shadow-lg border-t-8 transition-all hover:shadow-2xl relative group ${isIndigo ? 'border-t-indigo-500 bg-gradient-to-br from-indigo-50/50 to-transparent' : 'border-t-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-4xl font-black ${isIndigo ? 'text-indigo-700' : 'text-emerald-700'} tracking-tighter`}>
                            ¥{(value / 10000).toFixed(0)}<span className="text-xl ml-1">w</span>
                        </h3>
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${isIndigo ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {isIndigo ? <FileText className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                </div>
            </div>

            <div className="space-y-4">
                {/* 系统汇总进度 */}
                {/* <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">系统汇总进度</span>
                            <span className={`text-xs font-black ${isIndigo ? 'text-indigo-600' : 'text-emerald-600'}`}>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] text-gray-400 font-bold block uppercase">系统汇总总额</span>
                            <span className="text-xs font-bold text-gray-500">¥{(target / 10000).toFixed(0)}w</span>
                        </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden border p-0.5">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isIndigo ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div> */}

                {/* 手动设定目标进度 */}
                <div className="space-y-1.5 pt-1 border-t border-dashed">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">手动目标进度</span>
                            <span className="text-xs font-black text-primary">{manualProgress.toFixed(1)}%</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[9px] text-gray-400 font-bold block uppercase flex items-center gap-1">
                                手动设定目标
                                <Edit className="h-2 w-2 cursor-pointer hover:text-primary" onClick={() => setIsEditing(true)} />
                            </span>
                            {isEditing ? (
                                <div className="flex items-center gap-1">
                                    <input 
                                        autoFocus
                                        type="number" 
                                        className="w-16 h-5 text-[10px] border rounded px-1 outline-none focus:border-primary"
                                        value={editValue}
                                        onChange={e => setEditValue(Number(e.target.value))}
                                        onBlur={() => {
                                            onManualTargetChange(editValue * 10000);
                                            setIsEditing(false);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                onManualTargetChange(editValue * 10000);
                                                setIsEditing(false);
                                            }
                                        }}
                                    />
                                    <span className="text-[10px] font-bold">w</span>
                                </div>
                            ) : (
                                <span className="text-sm font-black text-gray-800 cursor-pointer hover:text-primary" onClick={() => setIsEditing(true)}>¥{(manualTarget / 10000).toFixed(0)}w</span>
                            )}
                        </div>
                    </div>
                    <div className="h-3 bg-primary/5 rounded-full overflow-hidden border border-primary/10 p-0.5">
                        <div 
                            className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)] transition-all duration-1000 ease-out"
                            style={{ width: `${manualProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative group/tooltip">
                    <HelpCircle className="h-4 w-4 text-gray-300 hover:text-primary cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-white/10 leading-relaxed font-bold">
                        <div className="text-primary mb-1 uppercase tracking-tighter">[计算逻辑]</div>
                        {formula}
                    </div>
                </div>
            </div>
        </div>
    );
};

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
        <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} className={`rounded-xl border bg-card shadow-sm flex flex-col relative group transition-all duration-300 ${isDragging ? 'opacity-20 scale-95 border-dashed border-primary shadow-none' : 'opacity-100'} ${isDragOver ? 'ring-2 ring-primary ring-offset-4' : ''} ${!isDragging && !isResizing ? 'hover:shadow-xl hover:-translate-y-1' : ''} ${isOpen ? 'z-[50]' : 'z-10'}`} ref={cardRef} style={{ width: size?.w || 'calc(33.333% - 11px)', height: size?.h || 300, minWidth: '300px', minHeight: '250px' }}>
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

const Dashboard: React.FC<DashboardProps> = ({ selectedYear, selectedQuarter, projects, dictionaries, onUpdateDictionary }) => {
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
      return saved ? JSON.parse(saved) : { contractSource: {}, collectionSource: {}, contractType: {}, collectionType: {}, regional: {}, earlySource: {}, earlyProbability: {}, earlyType: {} };
  });

  const [manualTargets, setManualTargets] = useState<Record<number, { contract: number, collection: number }>>({});

  // Load manualTargets from dictionaries
  useEffect(() => {
      const targetsDict = dictionaries?.['dashboard_targets'];
      if (targetsDict && Array.isArray(targetsDict)) {
          const map: any = {};
          targetsDict.forEach((item: any) => {
              try {
                  const data = JSON.parse(item.label);
                  map[data.year] = { contract: data.contract, collection: data.collection };
              } catch (e) { /* ignore error data */ }
          });
          setManualTargets(map);
      }
  }, [dictionaries]);

  const [chartOrder, setChartOrder] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem('dashboard_v7_order');
      return saved ? JSON.parse(saved) : {
          financial: ['contractSource', 'collectionSource', 'contractType', 'collectionType', 'regional'],
          early: ['earlySource', 'earlyProbability', 'earlyType']
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
      
      if (dragIdx === -1) return;

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
    
    const parsedProjects = projects.map(p => ({
        ...p,
        annualData: safeParseJSON(p.annualData)
    }));

    const yearProjects = parsedProjects.filter(p => {
        const hasNoYearInfo = !p.annualData?.length && !p.signingDate && !p.estimatedSignYear && !p.collectionPlan?.length;
        if (hasNoYearInfo) return true;
        const hasAnnualData = p.annualData?.some((d: any) => d.year === selectedYear);
        const hasCollectionPlan = p.collectionPlan?.some(cp => cp.year === selectedYear);
        const isEarlyForYear = p.stage === ProjectStage.EARLY && p.estimatedSignYear === selectedYear.toString();
        const isSignedThisYear = p.signingDate?.startsWith(selectedYear.toString());
        return hasAnnualData || hasCollectionPlan || isEarlyForYear || isSignedThisYear;
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

    const currentManual = manualTargets[selectedYear] || { contract: 0, collection: 0 };

    return {
        totalContract: projectsActive.reduce((acc, p) => {
            const isSignedThisYear = p.signingDate?.startsWith(selectedYear.toString());
            return isSignedThisYear ? acc + (p.deptAmount || 0) : acc;
        }, 0),
        totalCollected: projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'collectedAmount'), 0),
        totalPlannedCollection: projectsActive.reduce((acc, p) => {
            const planForYear = p.collectionPlan?.filter(cp => cp.year === selectedYear) || [];
            return acc + planForYear.reduce((sum, cp) => sum + (cp.amount || 0), 0);
        }, 0),
        contractTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        collectionTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        manualContractTarget: currentManual.contract,
        manualCollectionTarget: currentManual.collection,
        earlyTotal: earlyProjects.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        getChartData: (key: string, isZoomed = false) => {
            const currentChartFilters = isZoomed ? zoomedFilters : filtersToUse[key];
            const dataPool = key.startsWith('early') ? earlyProjects : projectsActive;
            const filtered = applyMultiFilter(dataPool, currentChartFilters);
            switch(key) {
                case 'contractSource': return processPieData(aggregate(filtered, 'source', p => p.signingDate?.startsWith(selectedYear.toString()) ? (p.deptAmount || 0) : 0));
                case 'collectionSource': return processPieData(aggregate(filtered, 'source', p => getYearlyValue(p, 'collectedAmount')));
                case 'contractType': return aggregate(filtered, 'category', p => p.signingDate?.startsWith(selectedYear.toString()) ? (p.deptAmount || 0) : 0);
                case 'collectionType': return aggregate(filtered, 'category', p => getYearlyValue(p, 'collectedAmount'));
                case 'regional': return { 
                    main: aggregate(filtered, 'region', p => p.signingDate?.startsWith(selectedYear.toString()) ? (p.deptAmount || 0) : 0), 
                    coll: aggregate(filtered, 'region', p => getYearlyValue(p, 'collectedAmount')) 
                };
                case 'earlySource': return processPieData(aggregate(filtered, 'source', p => p.totalAmount || 0));
                case 'earlyProbability': return aggregate(filtered, 'remarks', p => p.totalAmount || 0);
                case 'earlyType': return processPieData(aggregate(filtered, 'category', p => p.totalAmount || 0));
                default: return [];
            }
        }
    };
  };

  const analytics = useMemo(() => getAnalytics(), [selectedYear, selectedQuarter, projects, localFilters, manualTargets]);
  const zoomedAnalytics = useMemo(() => zoomedChart ? getAnalytics() : null, [zoomedChart, zoomedFilters, projects]);

  const options = useMemo(() => {
      const getUnique = (key: keyof Project) => Array.from(new Set(projects.map(p => p[key] as string).filter(Boolean))).sort();
      return { department: getUnique('department'), region: getUnique('region'), source: getUnique('source'), category: getUnique('category'), threeReviewType: getUnique('threeReviewType'), probability: getUnique('probability'), remarks: getUnique('remarks') };
  }, [projects]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
  const fieldLabels: Record<string, string> = { department: '部门', region: '地区', source: '来源', category: '类别', threeReviewType: '三审', probability: '可能性', remarks: '是否靠谱' };

  const chartConfigs: any = {
    contractSource: { t: '合同来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionSource: { t: '收款来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    contractType: { t: '合同类别分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionType: { t: '收款类别分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    regional: { t: '地区业务分布', f: ['department', 'category'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    earlySource: { t: '前期来源分析', f: ['region', 'department'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    earlyProbability: { t: '是否靠谱分析', f: ['source', 'department', 'remarks'], icon: <Target className="h-3.5 w-3.5"/> },
    earlyType: { t: '前期类型分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
  };

  const handleUpdateManualTarget = async (type: 'contract' | 'collection', value: number) => {
      const newManualTargets = {
          ...manualTargets,
          [selectedYear]: {
              ...(manualTargets[selectedYear] || { contract: 0, collection: 0 }),
              [type]: value
          }
      };
      
      // Update local state immediately
      setManualTargets(newManualTargets);

      // Save to database
      const dictItems = Object.entries(newManualTargets).map(([year, data]: [any, any]) => ({
          label: JSON.stringify({ year: Number(year), ...data }),
          bgColor: 'bg-primary/5',
          textColor: 'text-primary'
      }));

      await onUpdateDictionary('dashboard_targets', dictItems);
  };

  const renderChartContent = (key: string, height: number, isZoomed = false) => {
      const h = isZoomed ? (window.innerHeight * 0.6) : (height - 80);
      let data = isZoomed ? zoomedAnalytics!.getChartData(key, true) : analytics.getChartData(key);
      
      // Special handling for regional data which returns { main, coll }
      if (key === 'regional') {
          data = (data as any).main;
      }

      switch(key) {
          case 'contractSource': 
          case 'collectionSource':
          case 'contractType':
          case 'collectionType':
          case 'regional':
          case 'earlySource': 
          case 'earlyType': 
          case 'earlyProbability':
              return (
                  <ResponsiveContainer width="100%" height={h}>
                      <PieChart>
                          <Pie 
                              data={processPieData(data as any)} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={0} 
                              outerRadius={isZoomed ? 180 : 70} 
                              paddingAngle={2} 
                              minAngle={15}
                              dataKey="value"
                              isAnimationActive={false}
                              labelLine={true}
                              label={({ name, value, percent, x, y, cx }) => {
                                  if (percent < 0.01) return null; // 过滤占比小于1%的标签
                                  return (
                                      <text x={x} y={y} fill="#4b5563" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight={700}>
                                          {`${name} ${formatWan(value)} (${(percent * 100).toFixed(0)}%)`}
                                      </text>
                                  );
                              }}
                          >
                              { (data as any).map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }
                          </Pie>
                          <Tooltip formatter={(v:any)=>formatWan(v)}/>
                      </PieChart>
                  </ResponsiveContainer>
              );
          default: return null;
      }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-[1800px] mx-auto px-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><BarChart3 className="text-primary h-7 w-7" /><h1 className="text-xl font-black tracking-tight text-gray-800 uppercase italic">经营决策实时看板</h1></div>
            <div className="flex p-1 bg-muted rounded-xl border text-[12px] font-bold shadow-sm">
                <button onClick={() => setActiveTab('financial')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'financial' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>财务经营</button>
                <button onClick={() => setActiveTab('early')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'early' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>前期跟进</button>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 transition-all">
            {activeTab === 'financial' ? (
              <>
                  <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <CompactKPICard 
                        title="年度合同额度" 
                        value={analytics.totalContract} 
                        target={analytics.contractTarget} 
                        manualTarget={analytics.manualContractTarget}
                        onManualTargetChange={(v: number) => handleUpdateManualTarget('contract', v)}
                        color="indigo" 
                        formula="【当前值】: Σ (已填写签订日期且年份匹配项目的 [我所合同额])。 【系统汇总总额】: 当前筛选范围内项目的总合同额汇总。" 
                      />
                      <CompactKPICard 
                        title="年度计划收款" 
                        value={analytics.totalPlannedCollection} 
                        target={analytics.collectionTarget} 
                        manualTarget={0}
                        onManualTargetChange={() => {}}
                        color="amber" 
                        formula="【当前值】: Σ (所有项目的 [收款计划] 中对应年份的金额之和)。" 
                      />
                      <CompactKPICard 
                        title="年度实收回款" 
                        value={analytics.totalCollected} 
                        target={analytics.collectionTarget} 
                        manualTarget={analytics.manualCollectionTarget}
                        onManualTargetChange={(v: number) => handleUpdateManualTarget('collection', v)}
                        color="emerald" 
                        formula="【当前值】: Σ (年度数据中 [当前年份] 的已收款额)。 【系统汇总总额】: 当前筛选范围内项目的总合同额汇总。" 
                      />
                  </div>
                  {chartOrder.financial.filter(key => chartConfigs[key]).map(key => (<ChartCard key={key} title={chartConfigs[key].t} icon={chartConfigs[key].icon} fields={chartConfigs[key].f} filters={localFilters[key]} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, chartConfigs[key].t, chartConfigs[key].f)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 300)}</ChartCard>))}
              </>
            ) : (
              <>
                  <div className="w-full rounded-xl border bg-card p-5 shadow-sm bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between border-l-4 border-l-primary mb-2">
                      <div className="flex items-center gap-4"><div className="p-2.5 bg-primary/10 rounded-lg text-primary shadow-inner"><TrendingUp className="h-5 w-5"/></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">前期预估总额</p><h2 className="text-2xl font-black text-primary tracking-tighter">{formatWan(analytics.earlyTotal)}</h2></div></div>
                  </div>
                  {chartOrder.early.filter(key => chartConfigs[key]).map(key => (<ChartCard key={key} title={chartConfigs[key].t} icon={chartConfigs[key].icon} fields={chartConfigs[key].f} filters={localFilters[key]} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, chartConfigs[key].t, chartConfigs[key].f)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 300)}</ChartCard>))}
              </>
            )}
        </div>
      </div>

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

export default Dashboard;