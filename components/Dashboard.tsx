import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Area
} from 'recharts';
import { Project, ProjectStage, AnnualData } from '../types';
import { 
  Wallet, TrendingUp, FileText, Target, PieChart as PieIcon, BarChart3, 
  Building, Calendar, Filter, X, CheckSquare, Square, Maximize2, 
  GripHorizontal, HelpCircle, Minimize2, Edit, List, ArrowRight
} from 'lucide-react';

/**
 * Dashboard 组件说明：
 * 1. 核心看板：分为“财务经营”、“年度收款计划”、“前期跟进”三个维度。
 * 2. 数据穿透：所有指标卡和图表均支持点击右上角图标查看底层项目明细。
 * 3. 统计口径：
 *    - 财务经营：基于合同签订日期和实际已收款数据。
 *    - 年度收款计划：基于项目中设置的“未来收款计划任务”金额。
 *    - 前期跟进：基于处于“前期项目”阶段的项目估算金额。
 */

interface DashboardProps {
    selectedYear: number | 'all';
    availableYears: number[];
    onSelectYear: (year: number | 'all') => void;
    selectedQuarter: string;
    projects: Project[];
    dictionaries: any;
    onUpdateDictionary: (key: string, items: any[]) => Promise<void>;
}

const formatWan = (val: number) => `¥${(val / 10000).toFixed(0)}w`;

// 安全解析 JSON
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

/**
 * 紧凑型 KPI 指标卡
 * 展示核心数值、进度条以及手动设定的目标
 */
const CompactKPICard = ({ title, value, target, manualTarget, onManualTargetChange, color, formula, onViewData }: any) => {
    const progress = Math.min(100, (value / (target || 1)) * 100);
    const manualProgress = Math.min(100, (value / (manualTarget || 1)) * 100);
    const isIndigo = color === 'indigo';
    const isAmber = color === 'amber';
    const isEmerald = color === 'emerald';
    
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(manualTarget / 10000);

    useEffect(() => {
        setEditValue(manualTarget / 10000);
    }, [manualTarget]);

    return (
        <div className={`flex-1 rounded-2xl border bg-card p-6 shadow-lg border-t-8 transition-all hover:shadow-2xl relative group ${isIndigo ? 'border-t-indigo-500 bg-gradient-to-br from-indigo-50/50 to-transparent' : isEmerald ? 'border-t-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent' : 'border-t-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-4xl font-black ${isIndigo ? 'text-indigo-700' : isEmerald ? 'text-emerald-700' : 'text-amber-700'} tracking-tighter`}>
                            ¥{(value / 10000).toFixed(0)}<span className="text-xl ml-1">w</span>
                        </h3>
                    </div>
                </div>
                <button 
                    onClick={onViewData}
                    className={`p-3 rounded-xl transition-all shadow-inner hover:scale-110 active:scale-95 ${isIndigo ? 'bg-indigo-100 text-indigo-600' : isEmerald ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}
                    title="点击查看数据明细"
                >
                    <List className="h-6 w-6" />
                </button>
            </div>

            <div className="space-y-4">
                {/* 手动设定目标及进度条 */}
                <div className="space-y-1.5 pt-1 border-t border-dashed">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">手动目标进度</span>
                            <span className={`text-xs font-black ${isIndigo ? 'text-indigo-600' : isEmerald ? 'text-emerald-600' : 'text-amber-600'}`}>{manualProgress.toFixed(1)}%</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[9px] text-gray-400 font-bold block uppercase flex items-center gap-1">
                                手动设定目标
                                <Edit className="h-2 w-2 cursor-pointer hover:text-primary" onClick={() => setIsEditing(true)} />
                            </span>
                            {isEditing ? (
                                <div className="flex items-center gap-1 animate-in zoom-in-95">
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
                                <span className="text-sm font-black text-gray-800 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditing(true)}>¥{(manualTarget / 10000).toFixed(0)}w</span>
                            )}
                        </div>
                    </div>
                    <div className="h-3 bg-primary/5 rounded-full overflow-hidden border border-primary/10 p-0.5">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isIndigo ? 'bg-indigo-500' : isEmerald ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${manualProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                <div className="relative group/tooltip">
                    <HelpCircle className="h-3 w-3 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-white/10 leading-relaxed font-bold">
                        <div className="text-primary mb-1 uppercase tracking-tighter">[计算逻辑]</div>
                        {formula}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 图表卡片组件
 * 封装了标题栏、工具栏（明细、缩放、过滤）以及拖拽排序逻辑
 */
const ChartCard = ({ title, icon, children, fields, filters, options, labels, onToggle, isOpen, onOpen, onZoom, onViewData, size, onResize, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }: any) => {
    const activeCount = Object.values(filters || {}).flat().length;
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
                    <button onClick={onViewData} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-colors" title="查看明细数据"><List className="h-3.5 w-3.5"/></button>
                    <button onClick={onZoom} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-colors"><Maximize2 className="h-3.5 w-3.5"/></button>
                    <button onClick={onOpen} className={`p-1.5 rounded-md border transition-all ${activeCount > 0 ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:text-primary'}`}><Filter className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            {/* 过滤器弹出面板 */}
            {isOpen && (
                <div className="absolute top-12 right-2 left-2 z-[50] bg-white border rounded-xl shadow-2xl p-4 space-y-4 animate-in zoom-in-95 ring-1 ring-black/5">
                    <div className="flex justify-between items-center border-b pb-2"><span className="text-[10px] font-black text-primary uppercase">看板配置</span><button onClick={onOpen}><X className="h-3.5 w-3.5 text-gray-400"/></button></div>
                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {fields.map((f: string) => (
                            <div key={f} className="space-y-2">
                                <p className="text-[9px] font-black text-gray-400 uppercase">{labels[f]}</p>
                                <div className="flex flex-wrap gap-1.5">{options[f]?.map((v: string) => {
                                    const sel = (filters?.[f] || []).includes(v);
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
  const [activeTab, setActiveTab] = useState<'financial' | 'collection' | 'early'>('financial');
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [zoomedChart, setZoomedChart] = useState<{key: string, title: string, fields: string[]} | null>(null);
  const [zoomedFilters, setZoomedFilters] = useState<Record<string, string[]>>({});
  const [viewingDataKey, setViewingDataKey] = useState<string | null>(null);

  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // 从 LocalStorage 加载图表尺寸
  const [chartSizes, setChartSizes] = useState<Record<string, { w: string, h: number }>>(() => {
      const saved = localStorage.getItem('dashboard_v7_sizes');
      return saved ? JSON.parse(saved) : {};
  });

  // 从 LocalStorage 加载过滤器配置，并合并默认值以防新图表键缺失
  const [localFilters, setLocalFilters] = useState<Record<string, Record<string, string[]>>>(() => {
      const saved = localStorage.getItem('dashboard_v7_filters');
      const defaults = { contractSource: {}, collectionSource: {}, contractType: {}, collectionType: {}, regionalContract: {}, regionalCollection: {}, collectionLevel: {}, collectionDept: {}, earlySource: {}, earlyProbability: {}, earlyType: {} };
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return { ...defaults, ...parsed };
          } catch { return defaults; }
      }
      return defaults;
  });

  // 加载手动设定的目标金额
  const [manualTargets, setManualTargets] = useState<Record<string, { contract: number, collection: number }>>({});

  useEffect(() => {
      const targetsDict = dictionaries?.['dashboard_targets'];
      if (targetsDict && Array.isArray(targetsDict)) {
          const map: any = {};
          targetsDict.forEach((item: any) => {
              try {
                  const data = JSON.parse(item.label);
                  map[data.year] = { contract: data.contract, collection: data.collection };
              } catch (e) { }
          });
          setManualTargets(map);
      }
  }, [dictionaries]);

  // 管理图表显示顺序及 Tab 默认布局
  const [chartOrder, setChartOrder] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem('dashboard_v7_order');
      const defaults = {
          financial: ['contractSource', 'collectionSource', 'contractType', 'collectionType', 'regionalContract', 'regionalCollection'],
          collection: ['collectionLevel', 'collectionDept'],
          early: ['earlySource', 'earlyProbability', 'earlyType']
      };
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              return {
                  financial: Array.from(new Set([...defaults.financial, ...(parsed.financial || [])])),
                  collection: (parsed.collection && parsed.collection.length > 0) ? parsed.collection : defaults.collection,
                  early: parsed.early || defaults.early
              };
          } catch { return defaults; }
      }
      return defaults;
  });

  useEffect(() => { localStorage.setItem('dashboard_v7_sizes', JSON.stringify(chartSizes)); }, [chartSizes]);
  useEffect(() => { localStorage.setItem('dashboard_v7_filters', JSON.stringify(localFilters)); }, [localFilters]);
  useEffect(() => { localStorage.setItem('dashboard_v7_order', JSON.stringify(chartOrder)); }, [chartOrder]);

  // 处理过滤器变更
  const toggleFilterValue = (chartKey: string, field: string, val: string, isZoomed = false) => {
      if (isZoomed) {
          setZoomedFilters(prev => {
              const current = prev[field] || [];
              const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
              return { ...prev, [field]: next };
          });
      } else {
          setLocalFilters(prev => {
              const current = (prev[chartKey] || {})[field] || [];
              const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
              return { ...prev, [chartKey]: { ...(prev[chartKey] || {}), [field]: next } };
          });
      }
  };

  const onResize = (key: string, width: string, height: number) => {
      setChartSizes(prev => ({ ...prev, [key]: { w: width, h: height } }));
  };

  const handleZoom = (key: string, title: string, fields: string[]) => {
      setZoomedFilters({ ...(localFilters[key] || {}) });
      setZoomedChart({ key, title, fields });
  };

  const handleDragStart = (key: string) => setDraggedKey(key);
  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      setDragOverKey(targetKey);
      if (!draggedKey || draggedKey === targetKey) return;
      const currentOrder = [...(chartOrder[activeTab] || [])];
      const dragIdx = currentOrder.indexOf(draggedKey);
      const hoverIdx = currentOrder.indexOf(targetKey);
      if (dragIdx === -1) return;
      currentOrder.splice(dragIdx, 1);
      currentOrder.splice(hoverIdx, 0, draggedKey);
      setChartOrder(prev => ({ ...prev, [activeTab]: currentOrder }));
  };
  const handleDragEnd = () => { setDraggedKey(null); setDragOverKey(null); };

  // 饼图数据处理逻辑：合并占比过小的项
  const processPieData = (data: {name: string, value: number}[]) => {
      if (data.length <= 7) return data;
      const sorted = [...data].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 6);
      const others = sorted.slice(6).reduce((acc, curr) => acc + curr.value, 0);
      return [...top, { name: '其他', value: others }];
  };

  /**
   * 核心分析引擎
   * 负责所有 KPI 计算、图表聚合以及明细数据提取
   */
  const { totalContract, totalCollected, totalPlannedCollection, contractTarget, collectionTarget, manualContractTarget, manualCollectionTarget, earlyTotal, getChartData, getProjectsForCard, getPlannedTotal, getYearlyValue } = useMemo(() => {
    const parsedProjects = projects.map(p => ({
        ...p,
        annualData: safeParseJSON(p.annualData),
        collectionPlan: safeParseJSON(p.collectionPlan)
    }));

    // 年份过滤逻辑：支持“全部年份”
    const yearProjects = selectedYear === 'all' ? parsedProjects : parsedProjects.filter(p => {
        const hasNoYearInfo = !p.annualData?.length && !p.signingDate && !p.estimatedSignYear && !p.collectionPlan?.length;
        if (hasNoYearInfo) return true;
        const hasAnnualData = p.annualData?.some((d: any) => d.year === selectedYear);
        const hasCollectionPlan = p.collectionPlan?.some((cp: any) => cp.year === selectedYear);
        const isEarlyForYear = p.stage === ProjectStage.EARLY && p.estimatedSignYear === selectedYear.toString();
        const isSignedThisYear = p.signingDate?.startsWith(selectedYear.toString());
        return hasAnnualData || hasCollectionPlan || isEarlyForYear || isSignedThisYear;
    });

    // 季度过滤逻辑：多场景感知（签约日期、实际收款、计划收款）
    const filterByQuarter = (data: Project[]) => {
        if (selectedQuarter === 'all') return data;
        const q = Number(selectedQuarter);
        return data.filter(p => {
            if (p.signingDate) {
                const m = parseInt(p.signingDate.split('-')[1]);
                if (Math.ceil(m / 3) === q) return true;
            }
            if (p.annualData?.some((d: any) => {
                if (selectedYear !== 'all' && d.year !== selectedYear) return false;
                if (!d.collectionDate) return false;
                return Math.ceil(parseInt(d.collectionDate.split('-')[1]) / 3) === q;
            })) return true;
            if (p.collectionPlan?.some((cp: any) => {
                if (selectedYear !== 'all' && cp.year !== selectedYear) return false;
                return Math.ceil(cp.month / 3) === q;
            })) return true;
            return false;
        });
    };

    const baseData = filterByQuarter(yearProjects);
    const projectsActive = baseData.filter(p => p.stage !== ProjectStage.EARLY);
    const earlyProjects = yearProjects.filter(p => p.stage === ProjectStage.EARLY);

    // 计算特定时间段内的计划收款总额
    const calculatePlannedTotal = (p: Project) => {
        const planItems = (p.collectionPlan || []).filter((cp: any) => {
            const yearMatch = selectedYear === 'all' || cp.year === selectedYear;
            const qMatch = selectedQuarter === 'all' || Math.ceil(cp.month / 3) === Number(selectedQuarter);
            return yearMatch && qMatch;
        });
        return planItems.reduce((sum: number, cp: any) => sum + (cp.amount || 0), 0);
    };

    // 获取项目在选中年份的财务数值
    const getYearlyValue = (p: Project, key: keyof AnnualData) => {
        if (selectedYear === 'all') {
            return p.annualData?.reduce((acc: number, cur: any) => acc + (cur[key] as number || 0), 0) || 0;
        }
        const record = p.annualData?.find((d: any) => d.year === selectedYear);
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

    const currentManual = manualTargets[selectedYear.toString()] || { contract: 0, collection: 0 };

    return {
        totalContract: projectsActive.reduce((acc, p) => {
            const isMatch = selectedYear === 'all' || p.signingDate?.startsWith(selectedYear.toString());
            return isMatch ? acc + (p.deptAmount || 0) : acc;
        }, 0),
        totalCollected: projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'collectedAmount'), 0),
        totalPlannedCollection: baseData.reduce((acc, p) => acc + calculatePlannedTotal(p), 0),
        contractTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        collectionTarget: projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        manualContractTarget: currentManual.contract,
        manualCollectionTarget: currentManual.collection,
        earlyTotal: earlyProjects.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        getPlannedTotal: calculatePlannedTotal,
        getYearlyValue,
        getChartData: (key: string, isZoomed = false) => {
            const currentChartFilters = isZoomed ? zoomedFilters : (localFilters[key] || {});
            const dataPool = key.startsWith('early') ? earlyProjects : (key.startsWith('collection') ? baseData : projectsActive);
            const filtered = applyMultiFilter(dataPool, currentChartFilters);
            
            switch(key) {
                case 'contractSource': return processPieData(aggregate(filtered, 'source', p => (selectedYear === 'all' || p.signingDate?.startsWith(selectedYear.toString())) ? (p.deptAmount || 0) : 0));
                case 'collectionSource': return processPieData(aggregate(filtered, 'source', p => getYearlyValue(p, 'collectedAmount')));
                case 'contractType': return aggregate(filtered, 'category', p => (selectedYear === 'all' || p.signingDate?.startsWith(selectedYear.toString())) ? (p.deptAmount || 0) : 0);
                case 'collectionType': return aggregate(filtered, 'category', p => getYearlyValue(p, 'collectedAmount'));
                case 'regionalContract': return processPieData(aggregate(filtered, 'region', p => (selectedYear === 'all' || p.signingDate?.startsWith(selectedYear.toString())) ? (p.deptAmount || 0) : 0));
                case 'regionalCollection': return processPieData(aggregate(filtered, 'region', p => getYearlyValue(p, 'collectedAmount')));
                case 'collectionLevel': return processPieData(aggregate(filtered.filter(p => calculatePlannedTotal(p) > 0), 'paymentLevel', calculatePlannedTotal));
                case 'collectionDept': return processPieData(aggregate(filtered.filter(p => calculatePlannedTotal(p) > 0), 'department', calculatePlannedTotal));
                case 'earlySource': return processPieData(aggregate(filtered, 'source', p => p.totalAmount || 0));
                case 'earlyProbability': return aggregate(filtered, 'remarks', p => p.totalAmount || 0);
                case 'earlyType': return processPieData(aggregate(filtered, 'category', p => p.totalAmount || 0));
                default: return [];
            }
        },
        getProjectsForCard: (key: string) => {
            if (key === 'kpi_total_contract') return projectsActive.filter(p => selectedYear === 'all' || p.signingDate?.startsWith(selectedYear.toString()));
            if (key === 'kpi_total_planned') return baseData.filter(p => calculatePlannedTotal(p) > 0);
            if (key === 'kpi_total_collected') return projectsActive.filter(p => getYearlyValue(p, 'collectedAmount') > 0);
            if (key === 'kpi_early_total') return earlyProjects;
            
            const currentChartFilters = localFilters[key] || {};
            const dataPool = key.startsWith('early') ? earlyProjects : (key.startsWith('collection') ? baseData : projectsActive);
            return applyMultiFilter(dataPool, currentChartFilters);
        }
    };
  }, [selectedYear, selectedQuarter, projects, localFilters, manualTargets, zoomedFilters]); 

  const options = useMemo(() => {
      const getUnique = (key: keyof Project) => Array.from(new Set(projects.map(p => p[key] as string).filter(Boolean))).sort();
      return { department: getUnique('department'), region: getUnique('region'), source: getUnique('source'), category: getUnique('category'), threeReviewType: getUnique('threeReviewType'), probability: getUnique('probability'), remarks: getUnique('remarks'), paymentLevel: getUnique('paymentLevel') };
  }, [projects]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
  const fieldLabels: Record<string, string> = { department: '部门', region: '地区', source: '来源', category: '类别', threeReviewType: '三审', probability: '可能性', remarks: '是否靠谱', paymentLevel: '收款等级' };

  const chartConfigs: any = {
    contractSource: { t: '合同来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionSource: { t: '收款来源分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    contractType: { t: '合同类别分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionType: { t: '收款类别分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    regionalContract: { t: '地区合同业务分布', f: ['department', 'category'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    regionalCollection: { t: '地区收款业务分布', f: ['department', 'category'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    collectionLevel: { t: '计划收款等级分布', f: ['department', 'region'], icon: <Target className="h-3.5 w-3.5"/> },
    collectionDept: { t: '项目组计划收款占比', f: ['paymentLevel', 'region'], icon: <Building className="h-3.5 w-3.5"/> },
    earlySource: { t: '前期来源分析', f: ['region', 'department'], icon: <PieIcon className="h-3.5 w-3.5"/> },
    earlyProbability: { t: '是否靠谱分析', f: ['source', 'department', 'remarks'], icon: <Target className="h-3.5 w-3.5"/> },
    earlyType: { t: '前期类型分布', f: ['department', 'region'], icon: <PieIcon className="h-3.5 w-3.5"/> },
  };

  const handleUpdateManualTarget = async (type: 'contract' | 'collection', value: number) => {
      const yearStr = selectedYear.toString();
      const newManualTargets = { ...manualTargets, [yearStr]: { ...(manualTargets[yearStr] || { contract: 0, collection: 0 }), [type]: value } };
      setManualTargets(newManualTargets);
      const dictItems = Object.entries(newManualTargets).map(([year, data]: [any, any]) => ({ label: JSON.stringify({ year: isNaN(Number(year)) ? year : Number(year), ...data }), bgColor: 'bg-primary/5', textColor: 'text-primary' }));
      await onUpdateDictionary('dashboard_targets', dictItems);
  };

  const renderChartContent = (key: string, height: number, isZoomed = false) => {
      const h = isZoomed ? (window.innerHeight * 0.6) : (height - 80);
      let data = isZoomed && zoomedChart?.key === key ? getChartData(key, true) : getChartData(key, false);
      const chartData = Array.isArray(data) ? data : [];
      
      if (chartData.length === 0 || (chartData.length === 1 && chartData[0].value === 0)) {
          return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground bg-muted/5 rounded-3xl border-2 border-dashed border-border/50 animate-in fade-in">
                <HelpCircle className="h-10 w-10 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-widest italic">暂无相关统计数据</p>
            </div>
          );
      }

      return (
          <ResponsiveContainer width="100%" height={h}>
              <PieChart>
                  <Pie data={processPieData(chartData as any)} cx="50%" cy="50%" innerRadius={0} outerRadius={isZoomed ? 180 : 85} paddingAngle={2} minAngle={15} dataKey="value" isAnimationActive={false} labelLine={true} label={({ name, value, percent, x, y, cx }) => {
                      if (percent < 0.01) return null; 
                      return (
                          <text x={x} y={y} fill="currentColor" className="text-[10px] font-black fill-foreground/70" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                              {`${name} ${formatWan(value)} (${(percent * 100).toFixed(0)}%)`}
                          </text>
                      );
                  }}>
                      { (chartData as any).map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="stroke-background stroke-2" />) }
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(v:any)=>formatWan(v)}/>
              </PieChart>
          </ResponsiveContainer>
      );
  };

  const viewingProjects = useMemo(() => viewingDataKey ? getProjectsForCard(viewingDataKey) : [], [viewingDataKey, getProjectsForCard]);
  const viewingTitle = useMemo(() => {
      if (viewingDataKey?.startsWith('kpi_')) {
          if (viewingDataKey === 'kpi_total_contract') return '年度合同额度';
          if (viewingDataKey === 'kpi_total_planned') return '年度计划收款';
          if (viewingDataKey === 'kpi_total_collected') return '年度实收回款';
          if (viewingDataKey === 'kpi_early_total') return '前期预估总额';
      }
      return chartConfigs[viewingDataKey || '']?.t || '项目明细列表';
  }, [viewingDataKey]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-[1800px] mx-auto px-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><BarChart3 className="text-primary h-7 w-7" /><h1 className="text-xl font-black tracking-tight text-gray-800 uppercase italic">经营决策实时看板</h1></div>
            <div className="flex p-1 bg-muted rounded-xl border text-[12px] font-bold shadow-sm">
                <button onClick={() => setActiveTab('financial')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'financial' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>财务经营</button>
                <button onClick={() => setActiveTab('collection')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'collection' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>年度收款计划</button>
                <button onClick={() => setActiveTab('early')} className={`px-5 py-1.5 rounded-lg transition-all ${activeTab === 'early' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}>前期跟进</button>
            </div>
        </div>

        <div className="flex flex-col gap-8">
            {activeTab === 'financial' && (
              <>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                      <CompactKPICard title="年度合同额度" value={totalContract} target={contractTarget} manualTarget={manualContractTarget} onManualTargetChange={(v: number) => handleUpdateManualTarget('contract', v)} color="indigo" formula="【当前值】: Σ (已填写签订日期且年份匹配项目的 [我所合同额])。 【系统汇总总额】: 当前筛选范围内项目的总合同额汇总。" onViewData={() => setViewingDataKey('kpi_total_contract')} />
                      <CompactKPICard title="年度实收回款" value={totalCollected} target={collectionTarget} manualTarget={manualCollectionTarget} onManualTargetChange={(v: number) => handleUpdateManualTarget('collection', v)} color="emerald" formula="【当前值】: Σ (年度数据中 [当前年份] 的已收款额)。 【系统汇总总额】: 当前筛选范围内项目的总合同额汇总。" onViewData={() => setViewingDataKey('kpi_total_collected')} />
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {chartOrder.financial?.filter(key => chartConfigs[key]).map(key => (<ChartCard key={key} title={chartConfigs[key].t} icon={chartConfigs[key].icon} fields={chartConfigs[key].f} filters={localFilters[key] || {}} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, chartConfigs[key].t, chartConfigs[key].f)} onViewData={() => setViewingDataKey(key)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 350)}</ChartCard>))}
                  </div>
              </>
            )}

            {activeTab === 'collection' && (
                <>
                    <div className="w-full">
                        <CompactKPICard title="年度计划收款" value={totalPlannedCollection} target={collectionTarget} manualTarget={0} onManualTargetChange={() => {}} color="amber" formula="【当前值】: Σ (所有项目的 [收款计划] 中对应年份的金额之和)。" onViewData={() => setViewingDataKey('kpi_total_planned')} />
                    </div>
                    <div className="flex flex-wrap gap-6">
                        {['collectionLevel', 'collectionDept'].map(key => (
                            <ChartCard key={key} title={chartConfigs[key].t} icon={chartConfigs[key].icon} fields={chartConfigs[key].f} filters={localFilters[key] || {}} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, chartConfigs[key].t, chartConfigs[key].f)} onViewData={() => setViewingDataKey(key)} size={chartSizes[key] || {w: 'calc(50% - 12px)'}} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 350)}</ChartCard>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'early' && (
              <>
                  <div className="w-full rounded-[2rem] border bg-card p-8 shadow-xl bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between border-l-8 border-l-primary mb-2 overflow-hidden relative">
                      <div className="flex items-center gap-6 relative z-10">
                          <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg"><TrendingUp className="h-8 w-8"/></div>
                          <div><p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">前期预估总额</p><h2 className="text-5xl font-black text-primary tracking-tighter">{formatWan(earlyTotal)}</h2></div>
                      </div>
                      <button onClick={() => setViewingDataKey('kpi_early_total')} className="relative z-10 px-8 py-4 bg-white/80 hover:bg-white rounded-2xl text-primary shadow-lg border border-primary/10 transition-all font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 group">
                          <List className="h-5 w-5 group-hover:rotate-12 transition-transform" /> 查看项目明细 <ArrowRight className="h-4 w-4 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                      </button>
                      <BarChart3 className="absolute -bottom-10 -right-10 h-64 w-64 text-primary opacity-5 rotate-12" />
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {chartOrder.early?.filter(key => chartConfigs[key]).map(key => (<ChartCard key={key} title={chartConfigs[key].t} icon={chartConfigs[key].icon} fields={chartConfigs[key].f} filters={localFilters[key] || {}} options={options} labels={fieldLabels} onToggle={(f:string,v:string)=>toggleFilterValue(key,f,v)} isOpen={openFilterKey===key} onOpen={()=>setOpenFilterKey(openFilterKey===key?null:key)} onZoom={()=>handleZoom(key, chartConfigs[key].t, chartConfigs[key].f)} onViewData={() => setViewingDataKey(key)} size={chartSizes[key]} onResize={(w:string, h:number) => onResize(key, w, h)} onDragStart={() => handleDragStart(key)} onDragOver={(e:any) => handleDragOver(e, key)} onDragEnd={handleDragEnd} isDragging={draggedKey === key} isDragOver={dragOverKey === key}>{renderChartContent(key, chartSizes[key]?.h || 350)}</ChartCard>))}
                  </div>
              </>
            )}
        </div>
      </div>

      {/* 放大图表面板 */}
      {zoomedChart && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={() => setZoomedChart(null)}>
              <div className="bg-background w-[95vw] h-[90vh] rounded-[3rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="p-8 border-b border-border/50 flex justify-between items-center bg-muted/30 shrink-0">
                      <div className="flex items-center gap-4"><div className="p-2 bg-primary rounded-xl text-white"><BarChart3 className="h-6 w-6" /></div><h3 className="text-2xl font-black tracking-tight uppercase italic">{zoomedChart.title} - 深度穿透分析</h3></div>
                      <button onClick={() => setZoomedChart(null)} className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90"><X className="h-8 w-8 text-muted-foreground hover:text-foreground"/></button>
                  </div>
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
                      <div className="w-full lg:w-96 border-r bg-muted/10 p-10 space-y-10 overflow-y-auto custom-scrollbar">
                          <p className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b-4 border-primary/20 pb-3 flex items-center gap-3"><Filter className="h-4 w-4"/> 局部维度筛选</p>
                          {zoomedChart.fields.map(f => (
                              <div key={f} className="space-y-4">
                                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{fieldLabels[f]}</p>
                                  <div className="flex flex-wrap gap-2.5">
                                      {(options as any)[f]?.map((v:any) => {
                                          const sel = (zoomedFilters[f] || []).includes(v);
                                          return <button key={v} onClick={() => toggleFilterValue(zoomedChart.key, f, v, true)} className={`px-4 py-2 rounded-2xl text-[11px] font-black border transition-all duration-300 ${sel ? 'bg-primary text-white border-primary shadow-xl scale-110' : 'bg-white text-muted-foreground border-border hover:border-primary/50'}`}>{v}</button>
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex-1 p-12 flex items-center justify-center relative min-h-0 bg-gradient-to-br from-transparent to-muted/20">{renderChartContent(zoomedChart.key, 0, true)}</div>
                  </div>
              </div>
          </div>
      )}

      {/* 项目数据明细面板 */}
      {viewingDataKey && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300" onClick={() => setViewingDataKey(null)}>
              <div className="bg-background w-[95vw] max-w-6xl h-[85vh] rounded-[3rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="p-8 border-b border-border/50 flex justify-between items-center bg-muted/30 shrink-0">
                      <div className="flex items-center gap-4"><div className="p-2 bg-emerald-500 rounded-xl text-white"><List className="h-6 w-6" /></div><h3 className="text-2xl font-black tracking-tight">{viewingTitle} - 项目明细 ({viewingProjects.length})</h3></div>
                      <button onClick={() => setViewingDataKey(null)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X className="h-8 w-8 text-muted-foreground"/></button>
                  </div>
                  <div className="flex-1 overflow-auto p-0 custom-scrollbar">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-xl">
                              <tr className="border-b-2 border-border/50">
                                  <th className="px-8 py-5 font-black text-muted-foreground uppercase text-[10px] tracking-widest">项目名称</th>
                                  <th className="px-8 py-5 font-black text-muted-foreground uppercase text-[10px] tracking-widest">部门</th>
                                  <th className="px-8 py-5 font-black text-muted-foreground uppercase text-[10px] tracking-widest">负责人</th>
                                  <th className="px-8 py-5 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-right">总合同额</th>
                                  <th className="px-8 py-5 font-black text-muted-foreground uppercase text-[10px] tracking-widest text-right">我所合同额</th>
                                  <th className="px-8 py-5 font-black text-emerald-600 uppercase text-[10px] tracking-widest text-right">
                                      {viewingDataKey === 'kpi_total_planned' || viewingDataKey?.startsWith('collection') ? '当前筛选计划收款' : '当前已收款汇总'}
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                              {viewingProjects.map((p: Project) => (
                                  <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                                      <td className="px-8 py-5 font-black text-foreground group-hover:text-primary transition-colors">{p.name}</td>
                                      <td className="px-8 py-5 text-muted-foreground font-bold">{p.department}</td>
                                      <td className="px-8 py-5 text-muted-foreground">{p.responsiblePerson || '-'}</td>
                                      <td className="px-8 py-5 text-right font-mono font-bold text-muted-foreground">{formatWan(p.totalAmount || 0)}</td>
                                      <td className="px-8 py-5 text-right font-mono font-black text-primary">{formatWan(p.deptAmount || 0)}</td>
                                      <td className="px-8 py-5 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">
                                          {viewingDataKey === 'kpi_total_planned' || viewingDataKey?.startsWith('collection') 
                                            ? formatWan(getPlannedTotal(p))
                                            : formatWan(getYearlyValue(p, 'collectedAmount'))
                                          }
                                      </td>
                                  </tr>
                              ))}
                              {viewingProjects.length === 0 && (
                                  <tr><td colSpan={6} className="text-center py-20 text-muted-foreground italic font-black uppercase tracking-widest opacity-20">No matching project data found.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default Dashboard;