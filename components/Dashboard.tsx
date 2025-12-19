import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { Project, ProjectStage, AnnualData } from '../types';
import { Wallet, TrendingUp, FileText, Target, PieChart as PieIcon, BarChart3, Building, Calendar } from 'lucide-react';

interface DashboardProps {
    selectedYear: number;
    availableYears: number[];
    onSelectYear: (year: number) => void;
    selectedQuarter: string;
    projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ selectedYear, selectedQuarter, projects }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'early'>('financial');
  
  // Local Filter States for each chart
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(() => {
      const saved = localStorage.getItem('dashboard_local_filters');
      return saved ? JSON.parse(saved) : {
          contractSource: 'all',
          collectionSource: 'all',
          contractType: 'all',
          collectionType: 'all',
          regional: 'all',
          earlySource: 'all',
          earlyProbability: 'all',
          earlyYear: 'all',
          earlyType: 'all'
      };
  });

  React.useEffect(() => {
      localStorage.setItem('dashboard_local_filters', JSON.stringify(localFilters));
  }, [localFilters]);

  const updateLocalFilter = (key: string, val: string) => {
      setLocalFilters(prev => ({ ...prev, [key]: val }));
  };

  const analytics = useMemo(() => {
    // 1. Basic Year Filtering
    const yearProjects = projects.filter(p => {
        const hasAnnualData = p.annualData?.some(d => d.year === selectedYear);
        const isEarlyForYear = p.stage === ProjectStage.EARLY && p.estimatedSignYear === selectedYear.toString();
        const isSignedThisYear = p.signingDate?.startsWith(selectedYear.toString());
        return hasAnnualData || isEarlyForYear || isSignedThisYear;
    });

    // 2. Quarter Filtering Logic
    const filterByQuarter = (data: Project[]) => {
        if (selectedQuarter === 'all') return data;
        return data.filter(p => {
            const date = p.signingDate;
            if (!date) return false;
            const month = parseInt(date.split('-')[1]);
            const q = Math.ceil(month / 3).toString();
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

    // Advanced Local Filtering Helper
    const applyLocalFilter = (data: Project[], filterVal: string, field: keyof Project) => {
        if (!filterVal || filterVal === 'all') return data;
        return data.filter(p => p[field] === filterVal);
    };

    // --- Aggregation ---
    const aggregate = (data: Project[], key: keyof Project, valFn: (p: Project) => number) => {
        const map = new Map<string, number>();
        data.forEach(p => {
            const k = (p[key] as string) || '其他/未分类';
            map.set(k, (map.get(k) || 0) + valFn(p));
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    };

    // --- Calculate Final Chart Data with Local Filters ---
    const dataContractSource = aggregate(applyLocalFilter(projectsActive, localFilters.contractSource, 'department'), 'source', p => getYearlyValue(p, 'contractAmount'));
    const dataCollectionSource = aggregate(applyLocalFilter(projectsActive, localFilters.collectionSource, 'department'), 'source', p => getYearlyValue(p, 'collectedAmount'));
    
    const dataContractByType = aggregate(applyLocalFilter(projectsActive, localFilters.contractType, 'region'), 'category', p => getYearlyValue(p, 'contractAmount'));
    const dataCollectionByType = aggregate(applyLocalFilter(projectsActive, localFilters.collectionType, 'region'), 'category', p => getYearlyValue(p, 'collectedAmount'));
    
    const dataRegionalContract = aggregate(applyLocalFilter(projectsActive, localFilters.regional, 'department'), 'region', p => getYearlyValue(p, 'contractAmount'));
    const dataRegionalCollection = aggregate(applyLocalFilter(projectsActive, localFilters.regional, 'department'), 'region', p => getYearlyValue(p, 'collectedAmount'));

    const dataEarlySource = aggregate(applyLocalFilter(earlyProjects, localFilters.earlySource, 'region'), 'source', p => 1);
    const dataEarlyProb = aggregate(applyLocalFilter(earlyProjects, localFilters.earlyProbability, 'source'), 'probability', p => 1);
    const dataEarlyYear = aggregate(applyLocalFilter(earlyProjects, localFilters.earlyYear, 'department'), 'estimatedSignYear', p => p.totalAmount || 0);
    const dataEarlyType = aggregate(applyLocalFilter(earlyProjects, localFilters.earlyType, 'department'), 'category', p => 1);

    const totalContract = projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'contractAmount'), 0);
    const totalCollected = projectsActive.reduce((acc, p) => acc + getYearlyValue(p, 'collectedAmount'), 0);
    const contractTarget = projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0) * 0.8; 
    const collectionTarget = projectsActive.reduce((acc, p) => acc + (p.totalAmount || 0), 0) * 0.6;

    const earlyTotalEstimate = earlyProjects.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return {
        totalContract, totalCollected, contractTarget, collectionTarget,
        dataContractSource, dataCollectionSource, dataContractByType, dataCollectionByType,
        dataRegionalContract, dataRegionalCollection,
        earlyTotalEstimate, dataEarlySource, dataEarlyProb, dataEarlyYear, dataEarlyType
    };
  }, [selectedYear, selectedQuarter, projects, localFilters]);

  // Derived options for filters from current project data
  const options = useMemo(() => {
      const getUnique = (data: Project[], key: keyof Project) => 
          Array.from(new Set(data.map(p => p[key] as string).filter(Boolean))).sort();
      
      return {
          departments: getUnique(projects, 'department'),
          regions: getUnique(projects, 'region'),
          sources: getUnique(projects, 'source')
      };
  }, [projects]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
  const formatWan = (val: number) => `¥${(val / 10000).toFixed(0)}w`;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            经营管理大屏
          </h1>
          <p className="text-muted-foreground">数据统计范围：{selectedYear}年 {selectedQuarter === 'all' ? '全年' : `第${selectedQuarter}季度`}</p>
      </div>

      <div className="flex p-1 bg-muted/50 rounded-xl w-fit border shadow-sm">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'financial' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Wallet className="h-4 w-4" /> 经营财务分析
          </button>
          <button
            onClick={() => setActiveTab('early')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'early' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <TrendingUp className="h-4 w-4" /> 前期跟进分析
          </button>
      </div>

      {activeTab === 'financial' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KPICard title="年度合同总额" value={analytics.totalContract} target={analytics.contractTarget} icon={<FileText className="text-blue-500"/>} color="blue" />
                <KPICard title="年度收款总额" value={analytics.totalCollected} target={analytics.collectionTarget} icon={<Target className="text-emerald-500"/>} color="emerald" />
                <div className="col-span-2 rounded-2xl border bg-card p-6 shadow-sm flex items-center justify-between bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">回款进度 (实际/目标)</p>
                        <h3 className="text-3xl font-bold mt-1">{(analytics.totalCollected / (analytics.collectionTarget || 1) * 100).toFixed(1)}%</h3>
                    </div>
                    <div className="w-1/2 bg-muted h-4 rounded-full overflow-hidden border">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (analytics.totalCollected / (analytics.collectionTarget || 1) * 100))}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <ChartBox 
                    title="合同来源分布 (金额)" 
                    icon={<PieIcon className="h-4 w-4"/>}
                    filterValue={localFilters.contractSource}
                    onFilterChange={(v: string) => updateLocalFilter('contractSource', v)}
                    filterOptions={options.departments}
                    filterLabel="按部门"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={analytics.dataContractSource} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {analytics.dataContractSource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatWan(v)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="收款来源分布 (金额)" 
                    icon={<PieIcon className="h-4 w-4"/>}
                    filterValue={localFilters.collectionSource}
                    onFilterChange={(v: string) => updateLocalFilter('collectionSource', v)}
                    filterOptions={options.departments}
                    filterLabel="按部门"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={analytics.dataCollectionSource} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {analytics.dataCollectionSource.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatWan(v)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="项目类型合同额分析" 
                    icon={<BarChart3 className="h-4 w-4"/>}
                    filterValue={localFilters.contractType}
                    onFilterChange={(v: string) => updateLocalFilter('contractType', v)}
                    filterOptions={options.regions}
                    filterLabel="按地区"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.dataContractByType} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `${v/10000}w`} />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                            <Tooltip formatter={(v: number) => formatWan(v)} />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="项目类型收款额分析" 
                    icon={<BarChart3 className="h-4 w-4"/>}
                    filterValue={localFilters.collectionType}
                    onFilterChange={(v: string) => updateLocalFilter('collectionType', v)}
                    filterOptions={options.regions}
                    filterLabel="按地区"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.dataCollectionByType} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `${v/10000}w`} />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                            <Tooltip formatter={(v: number) => formatWan(v)} />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartBox>
            </div>

            <ChartBox 
                title="各地区项目情况 (合同 vs 收款)" 
                icon={<Building className="h-4 w-4"/>}
                filterValue={localFilters.regional}
                onFilterChange={(v: string) => updateLocalFilter('regional', v)}
                filterOptions={options.departments}
                filterLabel="按部门"
            >
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analytics.dataRegionalContract}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 11}} />
                        <YAxis tickFormatter={(v) => `${v/10000}w`} />
                        <Tooltip formatter={(v: number) => formatWan(v)} />
                        <Legend />
                        <Bar dataKey="value" name="合同金额" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar data={analytics.dataRegionalCollection} dataKey="value" name="已收金额" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartBox>
        </div>
      )}

      {activeTab === 'early' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border bg-gradient-to-r from-primary/10 to-purple-500/10 p-8 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-2xl">
                        <TrendingUp className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">前期跟进合同总额预估</h3>
                        <p className="text-sm text-muted-foreground mt-1">基于当前所有前期项目的预估合同额累计</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-5xl font-black text-primary">{formatWan(analytics.earlyTotalEstimate)}</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <ChartBox 
                    title="前期项目来源分析" 
                    icon={<PieIcon className="h-4 w-4"/>}
                    filterValue={localFilters.earlySource}
                    onFilterChange={(v: string) => updateLocalFilter('earlySource', v)}
                    filterOptions={options.regions}
                    filterLabel="按地区"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={analytics.dataEarlySource} cx="50%" cy="50%" outerRadius={80} label dataKey="value">
                                {analytics.dataEarlySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="项目可能性分布" 
                    icon={<Target className="h-4 w-4"/>}
                    filterValue={localFilters.earlyProbability}
                    onFilterChange={(v: string) => updateLocalFilter('earlyProbability', v)}
                    filterOptions={options.sources}
                    filterLabel="按来源"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.dataEarlyProb}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="预计签约年份金额分析" 
                    icon={<Calendar className="h-4 w-4"/>}
                    filterValue={localFilters.earlyYear}
                    onFilterChange={(v: string) => updateLocalFilter('earlyYear', v)}
                    filterOptions={options.departments}
                    filterLabel="按部门"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={analytics.dataEarlyYear}>
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => `${v/10000}w`} />
                            <Tooltip formatter={(v: number) => formatWan(v)} />
                            <Area type="monotone" dataKey="value" fill="#8884d8" stroke="#8884d8" fillOpacity={0.1} />
                            <Bar dataKey="value" fill="#6366f1" barSize={30} radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartBox>

                <ChartBox 
                    title="前期项目类型分布" 
                    icon={<PieIcon className="h-4 w-4"/>}
                    filterValue={localFilters.earlyType}
                    onFilterChange={(v: string) => updateLocalFilter('earlyType', v)}
                    filterOptions={options.departments}
                    filterLabel="按部门"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={analytics.dataEarlyType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label>
                                {analytics.dataEarlyType.map((_, i) => <Cell key={i} fill={COLORS[(i+4) % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartBox>
            </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, target, icon, color }: any) => (
    <div className={`rounded-2xl border bg-card p-6 shadow-sm border-l-4 ${color === 'blue' ? 'border-l-blue-500' : 'border-l-emerald-500'} hover:shadow-md transition-shadow`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold mt-2">¥{(value / 10000).toFixed(0)}w</h3>
            </div>
            <div className="p-2 bg-muted rounded-lg">{icon}</div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">目标: ¥{(target / 10000).toFixed(0)}w</span>
            <span className={value >= target ? 'text-emerald-600 font-bold' : 'text-orange-600 font-bold'}>
                {((value / (target || 1)) * 100).toFixed(0)}%
            </span>
        </div>
    </div>
);

const ChartBox = ({ title, icon, children, filterValue, onFilterChange, filterOptions, filterLabel }: any) => (
    <div className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary">{icon}</div>
                <h3 className="font-bold text-sm tracking-tight">{title}</h3>
            </div>
            
            {/* Local Filter UI */}
            <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-lg border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{filterLabel}:</span>
                <select 
                    value={filterValue} 
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer max-w-[100px] truncate"
                >
                    <option value="all">全部</option>
                    {filterOptions?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
        {children}
    </div>
);

export default Dashboard;
