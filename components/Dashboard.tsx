import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Project, ProjectStage } from '../types';
import { MOCK_PROJECTS } from '../services/mockData';
import { Wallet, Building2, TrendingUp, Calendar, Filter, FileText } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'early'>('financial');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');

  const analytics = useMemo(() => {
    // 1. Time Filtering
    let filteredProjects = MOCK_PROJECTS.filter(p => {
        // Simple logic: if project has a signing date, check year
        if (p.signingDate) {
            return p.signingDate.startsWith(selectedYear);
        }
        // Fallback for mock data without specific dates or cross-year logic
        // In real app, date logic would be stricter.
        // For early stage, check estimated sign year
        if (p.stage === ProjectStage.EARLY && p.estimatedSignYear) {
            return p.estimatedSignYear === selectedYear;
        }
        return true; 
    });

    if (selectedQuarter !== 'all') {
        filteredProjects = filteredProjects.filter(p => {
             // Mock quarter logic
             if (!p.signingDate) return true;
             const month = parseInt(p.signingDate.split('-')[1]);
             const q = Math.ceil(month / 3);
             return q.toString() === selectedQuarter;
        });
    }

    const projectsActive = filteredProjects.filter(p => p.stage === ProjectStage.COLLECTION || p.stage === ProjectStage.GROUP_PROGRESS);
    const earlyProjects = filteredProjects.filter(p => p.stage === ProjectStage.EARLY);

    // Helpers to get yearly data safely
    const getYearlyContract = (p: Project) => p.annualData?.find(d => d.year === Number(selectedYear))?.contractAmount || 0;
    const getYearlyCollection = (p: Project) => p.annualData?.find(d => d.year === Number(selectedYear))?.collectedAmount || 0;

    // --- Section 1: Financials ---
    const financialStats = {
        contractAmountYear: projectsActive.reduce((acc, p) => acc + getYearlyContract(p), 0),
        // collectionPlanYear is a bit legacy, for now let's use contract amount as a proxy or just re-use calculation
        // But for dashboards we often compare "Plan" vs "Actual". 
        // In the new data model, we only store "Contract" and "Collected".
        // Let's assume for Dashboard "Plan" is the annual contract value for now, or total contract? 
        // Wait, requirements asked for "2025 Contract" and "2025 Collected". 
        // Let's treat "Contract Amount Year" as the target.
        collectionPlanYear: projectsActive.reduce((acc, p) => acc + getYearlyContract(p), 0), // Simplifying: Plan = Annual Contract Share
        collectedYear: projectsActive.reduce((acc, p) => acc + getYearlyCollection(p), 0),
    };

    // Helper for aggregation
    const aggregateBy = (data: Project[], key: keyof Project, metricFn?: (p: Project) => number) => {
        const map = new Map<string, number>();
        data.forEach(p => {
            const k = (p[key] as string) || '未知';
            const v = metricFn ? metricFn(p) : 1;
            map.set(k, (map.get(k) || 0) + v);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    };

    const collectionSource = aggregateBy(projectsActive, 'source', getYearlyContract);
    const contractSource = aggregateBy(projectsActive, 'source', getYearlyContract);
    const collectionByType = aggregateBy(projectsActive, 'type', getYearlyContract);
    const contractByType = aggregateBy(projectsActive, 'type', getYearlyContract);

    const clientTypeContract = aggregateBy(projectsActive, 'clientType', getYearlyContract);
    const clientTypeCollection = aggregateBy(projectsActive, 'clientType', getYearlyCollection);

    // --- Section 2: Early Stage ---
    const earlyTotalEstimate = earlyProjects.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const earlySource = aggregateBy(earlyProjects, 'source');
    const earlyYear = aggregateBy(earlyProjects, 'estimatedSignYear', (p) => p.totalAmount || 0);
    const earlyProbability = aggregateBy(earlyProjects, 'probability');
    const earlyType = aggregateBy(earlyProjects, 'category');

    return {
        financialStats,
        collectionSource,
        contractSource,
        collectionByType,
        contractByType,
        clientTypeContract,
        clientTypeCollection,
        earlyTotalEstimate,
        earlySource,
        earlyYear: earlyYear.sort((a,b) => Number(a.name) - Number(b.name)),
        earlyProbability,
        earlyType
    };
  }, [selectedYear, selectedQuarter]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
  const formatWan = (val: number) => `¥${(val / 10000).toFixed(0)}万`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">管理驾驶舱</h1>
            <p className="text-muted-foreground">全院项目经营数据实时分析</p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 bg-card p-2 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r">
                <Calendar className="h-4 w-4 text-muted-foreground"/>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none"
                >
                    <option value="2024">2024年</option>
                    <option value="2025">2025年</option>
                    <option value="2026">2026年</option>
                </select>
            </div>
            <div className="flex items-center gap-2 px-2">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                 <select 
                    value={selectedQuarter} 
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none"
                >
                    <option value="all">全年</option>
                    <option value="1">第一季度</option>
                    <option value="2">第二季度</option>
                    <option value="3">第三季度</option>
                    <option value="4">第四季度</option>
                </select>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('financial')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${activeTab === 'financial' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'}
              `}
            >
              <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> 财务概览</span>
            </button>
            <button
               onClick={() => setActiveTab('early')}
               className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${activeTab === 'early' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'}
              `}
            >
               <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 前期项目跟进</span>
            </button>
          </nav>
      </div>

      {activeTab === 'financial' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
             {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card p-6 shadow-sm border-l-4 border-l-blue-500">
                    <h3 className="text-sm font-medium text-muted-foreground">{selectedYear}年 合同额</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatWan(analytics.financialStats.contractAmountYear)}</span>
                    </div>
                </div>
                {/* Note: Collection Plan vs Contract logic might need refinement based on exact biz rules, assuming equal for now based on data map */}
                <div className="rounded-xl border bg-card p-6 shadow-sm border-l-4 border-l-purple-500">
                    <h3 className="text-sm font-medium text-muted-foreground">{selectedYear}年 计划额(暂同合同)</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatWan(analytics.financialStats.collectionPlanYear)}</span>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm border-l-4 border-l-green-500">
                    <h3 className="text-sm font-medium text-muted-foreground">{selectedYear}年 已收款额</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatWan(analytics.financialStats.collectedYear)}</span>
                    </div>
                    <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-green-500 h-full" 
                            style={{ width: `${Math.min(100, (analytics.financialStats.collectedYear / (analytics.financialStats.collectionPlanYear || 1)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">合同来源分析 (按金额)</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics.contractSource} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {analytics.contractSource.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatWan(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">收款来源分析 (按金额)</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics.collectionSource} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#82ca9d" dataKey="value" label>
                                    {analytics.collectionSource.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatWan(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">镇街与企业分析 - 合同额</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.clientTypeContract}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `¥${val/10000}w`} />
                                <Tooltip formatter={(value: number) => formatWan(value)} />
                                <Bar dataKey="value" fill="#8884d8" name="合同额" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">镇街与企业分析 - 已收款</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.clientTypeCollection}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `¥${val/10000}w`} />
                                <Tooltip formatter={(value: number) => formatWan(value)} />
                                <Bar dataKey="value" fill="#82ca9d" name="已收款" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'early' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
             {/* Summary */}
             <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-full">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium">前期跟进合同总额预估</h3>
                        <p className="text-3xl font-bold text-primary mt-1">{formatWan(analytics.earlyTotalEstimate)}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                 <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold mb-4 text-sm">跟进项目类型分析</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={analytics.earlyType} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#FF8042" radius={[0, 4, 4, 0]} barSize={15} name="项目数量" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                     <h3 className="font-semibold mb-4 text-sm">项目可能性分布</h3>
                     <div className="flex justify-around items-center h-[300px]">
                         {analytics.earlyProbability.map((item, index) => (
                             <div key={index} className="flex flex-col items-center">
                                 <div 
                                    className={`w-24 h-24 rounded-full flex items-center justify-center border-4 text-xl font-bold
                                        ${item.name === '高' ? 'border-green-500 text-green-600 bg-green-50' : 
                                          item.name === '中' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' : 
                                          'border-gray-400 text-gray-600 bg-gray-50'}`}
                                 >
                                     {item.value}个
                                 </div>
                                 <span className="mt-2 text-sm font-medium">{item.name}可能性</span>
                             </div>
                         ))}
                     </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm col-span-2">
                    <h3 className="font-semibold mb-4 text-sm">预计签约年份金额分析</h3>
                     <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.earlyYear}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `¥${val/10000}w`} />
                                <Tooltip formatter={(value: number) => formatWan(value)} />
                                <Bar dataKey="value" fill="#8884d8" name="预估合同额" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;