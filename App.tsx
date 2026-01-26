import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Calendar, Lock, X as XIcon, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import Login from './components/Login';
import RecycleBin from './components/RecycleBin';
import AIChat from './components/AIChat';
import { CURRENT_USER } from './services/mockData';
import { fetchProjects, createProject, updateProject, deleteProject, fetchUsers, fetchDictionaries, updateDictionary, fetchLogs, updateUser } from './services/api';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS } from './constants';
import { ProjectStage, DEPARTMENT_SLUGS, Project, OperationLog, User, DictItem } from './types';

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

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || '/';
  });

  // Global State
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [dictionaries, setDictionaries] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Persisted Filter State
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('dashboard_year');
    return saved && saved !== 'all' ? Number(saved) : saved === 'all' ? 'all' : new Date().getFullYear();
  });
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    return localStorage.getItem('dashboard_quarter') || 'all';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_year', selectedYear.toString());
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('dashboard_quarter', selectedQuarter);
  }, [selectedQuarter]);

  // Password Modification State
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Theme & Appearance State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('appearance_dark_mode') === 'true';
  });
  const [currentThemeCode, setCurrentThemeCode] = useState<string>(() => {
    return localStorage.getItem('appearance_theme_code') || '';
  });

  // Dialog State
  const [dialog, setDialog] = useState<{ 
      isOpen: boolean; 
      title: string; 
      message: string; 
      onConfirm?: () => void; 
      isDestructive?: boolean;
      type: 'alert' | 'confirm' 
  } | null>(null);

  const confirmCustom = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
      setDialog({ isOpen: true, title, message, onConfirm, isDestructive, type: 'confirm' });
  };

  const alertCustom = (title: string, message: string) => {
      setDialog({ isOpen: true, title, message, type: 'alert' });
  };

  // Apply Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('appearance_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  // Apply Theme Code
  useEffect(() => {
    let styleTag = document.getElementById('dynamic-theme-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-theme-style';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = currentThemeCode;
    document.head.appendChild(styleTag);
    localStorage.setItem('appearance_theme_code', currentThemeCode);
  }, [currentThemeCode]);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // --- Computed Logic ---
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    projects.forEach(p => {
        const annualData = safeParseJSON(p.annualData);
        annualData?.forEach((d: any) => years.add(d.year));
        const collectionPlan = safeParseJSON(p.collectionPlan);
        collectionPlan?.forEach((d: any) => years.add(d.year));
    });
    if (years.size === 0) return [2024, 2025, 2026];
    return Array.from(years).sort((a, b) => b - a);
  }, [projects]);

  // Function to handle login
  const handleLogin = (username: string, department?: string, role?: string) => {
    const displayName = role === 'admin' ? '超级管理员' : username;
    const mockUser: User = {
      id: username, 
      name: displayName,
      role: (role || 'user') as 'admin' | 'user' | 'manager',
      department: department as any,
      status: 'active',
    };
    setIsLoggedIn(true);
    setCurrentUser(mockUser);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    if (currentPath === '/login' || currentPath === '/') {
      setCurrentPath('/'); 
      window.location.hash = '/';
    }
  };

  const handleUpdatePassword = async () => {
      if (!newPassword.trim()) return;
      if (!currentUser) return;
      try {
          const fullUser = users.find(u => u.id === currentUser.id || u.name === currentUser.name || (currentUser.role === 'admin' && u.name === 'admin'));
          if (fullUser) {
              await updateUser({ ...fullUser, password: newPassword });
              alertCustom('修改成功', '密码修改成功，请使用新密码重新登录');
              handleLogout();
          } else {
              alertCustom('更新失败', '未找到用户记录，请联系超级管理员');
          }
      } catch (e) {
          alertCustom('错误', '修改密码失败');
      }
      setIsPwdModalOpen(false);
      setNewPassword('');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    setCurrentPath('/login');
    window.location.hash = '/login';
  };

  useEffect(() => {
    const loadData = async () => {
      if (Object.keys(dictionaries).length === 0) {
          try {
             const d = await fetchDictionaries();
             setDictionaries(d);
          } catch(e) { console.error('Failed to load dictionaries', e); }
      }
      if (!isLoggedIn) {
          setLoading(false);
          return;
      }

      // Load global dependency data
      if (users.length === 0) {
          fetchUsers().then(u => setUsers(u)).catch(e => console.error('Failed to load users', e));
      }

      if (currentPath === '/settings') {
          setLoading(true);
          try {
              const l = await fetchLogs();
              setLogs(l);
          } catch (e) {
              console.error('Failed to load settings data', e);
          } finally {
              setLoading(false);
          }
      } else {
          let filters: any = null;
          if (currentPath === '/cycle/early') filters = { stage: 'early' };
          else if (currentPath === '/cycle/collection') filters = {};
          else if (currentPath === '/cycle/progress') filters = { stage: 'progress' };
          else if (currentPath === '/cycle/completed') filters = { stage: 'completed' };
          else if (currentPath.startsWith('/groups/')) {
              const slug = currentPath.split('/groups/')[1];
              if (slug) filters = { department: slug };
          }
          if (filters || currentPath === '/') {
              setLoading(true);
              try {
                  const p = await fetchProjects(filters || {});
                  setProjects(p);
              } catch (e) {
                  console.error('Failed to load projects', e);
              } finally {
                  setLoading(false);
              }
          } else {
             setLoading(false);
          }
      }
    };
    loadData();
  }, [currentPath, dictionaries, isLoggedIn]);

  const refreshLogs = async () => {
      const l = await fetchLogs();
      setLogs(l);
  };

  const handleAddProject = async (newProjectData: Partial<Project>) => {
      const newProject = { stage: ProjectStage.EARLY, department: CURRENT_USER.department!, name: '新项目', ...newProjectData };
      try {
        const created = await createProject(newProject);
        setProjects(prev => [created, ...prev]);
        refreshLogs();
        return true;
      } catch (e) { 
        alertCustom('失败', '创建项目失败'); 
        return false;
      }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
      try {
          const updated = await updateProject(updatedProject);
          setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
          refreshLogs();
          return true;
      } catch (e) { 
          alertCustom('失败', '更新项目失败'); 
          return false;
      }
  };

  const handleDeleteProject = async (id: string) => {
      try {
          await deleteProject(id);
          setProjects(prev => prev.filter(p => p.id !== id));
          refreshLogs();
      } catch (e) { alertCustom('失败', '删除项目失败'); }
  };

  const refreshUsers = async () => {
      const u = await fetchUsers();
      setUsers(u);
  };

  const handleUpdateDictionary = async (key: string, values: DictItem[]) => {
      try {
        const updated = await updateDictionary(key, values);
        setDictionaries((prev: any) => ({...prev, [key]: updated.items}));
        fetchLogs().then(l => setLogs(l));
      } catch (e) { alertCustom('失败', '字典更新失败'); }
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentPath(hash || '/');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 flex justify-center text-muted-foreground">加载数据中...</div>;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    
    const safeProjects = projects.map(p => ({
        ...p,
        timeline: safeParseJSON(p.timeline),
        nextPlan: safeParseJSON(p.nextPlan),
        annualData: safeParseJSON(p.annualData),
        collectionPlan: safeParseJSON(p.collectionPlan)
    }));

    const filteredSafeProjects = safeProjects.filter(p => {
      if (selectedYear !== 'all') {
          const hasNoYearInfo = !p.annualData?.length && !p.signingDate && !p.estimatedSignYear;
          const hasYearlyData = p.annualData?.some((d: any) => d.year === selectedYear);
          const isEarlyThisYear = p.stage === ProjectStage.EARLY && p.estimatedSignYear === selectedYear.toString();
          const signedThisYear = p.signingDate?.startsWith(selectedYear.toString());
          if (!(hasNoYearInfo || hasYearlyData || isEarlyThisYear || signedThisYear)) return false;
      }
      if (selectedQuarter !== 'all') {
        const q = Number(selectedQuarter);
        let matchesQuarter = false;
        if (p.signingDate) {
          const month = parseInt(p.signingDate.split('-')[1]);
          if (Math.ceil(month / 3) === q) matchesQuarter = true;
        }
        if (selectedYear !== 'all') {
            const yearlyRecord = p.annualData?.find((d: any) => d.year === selectedYear);
            if (yearlyRecord?.collectionDate) {
                const month = parseInt(yearlyRecord.collectionDate.split('-')[1]);
                if (Math.ceil(month / 3) === q) matchesQuarter = true;
            }
        } else {
            const hasQuarterData = p.annualData?.some((d: any) => {
                if (!d.collectionDate) return false;
                const month = parseInt(d.collectionDate.split('-')[1]);
                return Math.ceil(month / 3) === q;
            });
            if (hasQuarterData) matchesQuarter = true;
        }
        if (!matchesQuarter) return false;
      }
      return true;
    });

    if (currentPath.startsWith('/groups/')) {
        const slug = currentPath.split('/groups/')[1];
        const department = DEPARTMENT_SLUGS[slug];
        if (department) {
            return (
                <GroupProjectManager 
                    department={department}
                    projects={ filteredSafeProjects.filter(p => p.department === department) }
                    dictionaries={dictionaries}
                    users={users}
                    onAddProject={handleAddProject}
                    onEditProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    selectedYear={selectedYear as any}
                    availableYears={availableYears}
                    onSelectYear={(y) => setSelectedYear(y)}
                    confirmCustom={confirmCustom}
                />
            );
        }
    }
    
    if (!isAdmin && (currentPath === '/' || currentPath.startsWith('/cycle/'))) {
        const userDept = currentUser?.department;
        const deptSlug = Object.keys(DEPARTMENT_SLUGS).find(key => DEPARTMENT_SLUGS[key] === userDept);
        if (deptSlug) {
            return <GroupProjectManager department={userDept!} projects={filteredSafeProjects.filter(p => p.department === userDept)} dictionaries={dictionaries} users={users} onAddProject={handleAddProject} onEditProject={handleUpdateProject} onDeleteProject={handleDeleteProject} selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} confirmCustom={confirmCustom} />;
        }
        return <div className="p-10 text-center text-muted-foreground">您没有分配部门，请联系超级管理员</div>;
    }

    switch (currentPath) {
      case '/': return <Dashboard selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} selectedQuarter={selectedQuarter} projects={filteredSafeProjects} />;
      case '/cycle/early': return <ProjectTable title="前期项目跟进" data={filteredSafeProjects.filter(p => p.stage === ProjectStage.EARLY)} columns={EARLY_COLUMNS as any} dictionaries={dictionaries} users={users} onAddProject={handleAddProject} onEditProject={handleUpdateProject} onDeleteProject={handleDeleteProject} showAddButton={true} selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} confirmCustom={confirmCustom} defaultStage={ProjectStage.EARLY} />;
      
      case '/cycle/collection': {
          const collectionData = filteredSafeProjects.filter(p => {
              if (p.stage === ProjectStage.COLLECTION) return true;
              const plan = p.collectionPlan as any[];
              const hasCompletedTask = Array.isArray(plan) && plan.some((task: any) => {
                  if (!task.completed) return false;
                  const yearMatches = selectedYear === 'all' || task.year === selectedYear;
                  if (!yearMatches) return false;
                  if (selectedQuarter !== 'all') {
                      const q = Number(selectedQuarter);
                      const taskQuarter = Math.ceil((task.month || 1) / 3);
                      return taskQuarter === q;
                  }
                  return true;
              });
              return hasCompletedTask;
          });
          return <ProjectTable title="年度收款计划" data={collectionData} columns={COLLECTION_COLUMNS as any} dictionaries={dictionaries} users={users} onAddProject={handleAddProject} onEditProject={handleUpdateProject} onDeleteProject={handleDeleteProject} showAddButton={true} selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} confirmCustom={confirmCustom} defaultStage={ProjectStage.COLLECTION} />;
      }

      case '/cycle/progress': return <ProjectTable title="各组项目列表及进度" data={filteredSafeProjects.filter(p => p.stage === ProjectStage.GROUP_PROGRESS)} columns={PROGRESS_COLUMNS as any} dictionaries={dictionaries} users={users} onAddProject={handleAddProject} onEditProject={handleUpdateProject} onDeleteProject={handleDeleteProject} showAddButton={true} selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} confirmCustom={confirmCustom} defaultStage={ProjectStage.GROUP_PROGRESS} />;
      
      case '/cycle/completed': 
      case '/cycle/completed/contract':
      case '/cycle/completed/no-contract': {
          let filtered = filteredSafeProjects.filter(p => p.stage === ProjectStage.COMPLETED);
          let title = "已完成项目汇总";
          if ((currentPath || '').endsWith('/contract')) {
              title = "已完成项目 (有合同)";
              filtered = filtered.filter(p => p.contractNo && p.contractNo.trim() !== ''); 
          } else if ((currentPath || '').endsWith('/no-contract')) {
              title = "已完成项目 (无合同)";
              filtered = filtered.filter(p => !p.contractNo || p.contractNo.trim() === '');
          }
          return <ProjectTable title={title} data={filtered} columns={COMPLETED_COLUMNS as any} dictionaries={dictionaries} users={users} onAddProject={handleAddProject} onEditProject={handleUpdateProject} onDeleteProject={handleDeleteProject} showAddButton={true} selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} confirmCustom={confirmCustom} defaultStage={ProjectStage.COMPLETED} />;
      }

      case '/settings': return <Settings users={users} currentUser={currentUser} onRefreshUsers={refreshUsers} logs={logs} dictionaries={dictionaries} onUpdateDictionary={handleUpdateDictionary} currentThemeCode={currentThemeCode} onUpdateThemeCode={setCurrentThemeCode} confirmCustom={confirmCustom} />;
      case '/recycle-bin': return currentUser?.role === 'admin' ? <RecycleBin confirmCustom={confirmCustom} /> : <div className="p-10 text-center text-red-500">权限不足</div>;
      default: return <Dashboard selectedYear={selectedYear as any} availableYears={availableYears} onSelectYear={(y) => setSelectedYear(y)} selectedQuarter={selectedQuarter} projects={filteredSafeProjects} />;
    }
  };

  const renderMainContent = () => {
    if (!isLoggedIn) return <Login onLogin={handleLogin} />;
    return (
      <>
        <Watermark userName={currentUser?.name || 'User'} />
        <AIChat />
        <div className="flex h-screen overflow-hidden">
          <Sidebar currentPath={currentPath} onNavigate={handleNavigate} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} currentUser={currentUser} onLogout={handleLogout} onChangePassword={() => setIsPwdModalOpen(true)} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} confirmCustom={confirmCustom} />
          <div className="flex flex-1 flex-col overflow-hidden bg-background">
              <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
                  <button onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6" /></button>
                  <span className="font-semibold">项目管理系统</span>
              </header>
              <main className="flex-1 overflow-y-auto p-6 md:p-12 bg-background">
                  {currentPath !== '/settings' && currentPath !== '/login' && (
                      <div className="flex items-center justify-between mb-8 border-b pb-4">
                          <div>
                              <h2 className="text-xl font-semibold">
                                  {currentPath === '/' ? '数据总览' : 
                                   (currentPath || '').startsWith('/groups/') ? '项目组管理' : 
                                   (currentPath || '').includes('/completed') ? '项目周期 - 已完成' :
                                   '项目周期'}
                              </h2>
                              <p className="text-sm text-muted-foreground">当前查看年份：{selectedYear === 'all' ? '全部年份' : `${selectedYear}年`}</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border shadow-sm">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">年份:</span>
                                  <select value={selectedYear} onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedYear(val === 'all' ? 'all' : Number(val));
                                  }} className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer">
                                      {/* <option value="all">全部年份</option> */}
                                      {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
                                  </select>
                              </div>
                              <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border shadow-sm">
                                  <span className="text-sm font-medium text-muted-foreground">|</span>
                                  <span className="text-sm font-medium ml-2">季度:</span>
                                  <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"><option value="all">全年</option><option value="1">第一季度</option><option value="2">第二季度</option><option value="3">第三季度</option><option value="4">第四季度</option></select>
                              </div>
                          </div>
                      </div>
                  )}
                  {(() => {
                      if (loading) return <div className="p-10 flex justify-center text-muted-foreground">加载数据中...</div>;
                      if (currentPath === '/settings') return renderContent();
                      if (currentPath.startsWith('/groups/')) {
                          const slug = currentPath.split('/groups/')[1];
                          const department = DEPARTMENT_SLUGS[slug];
                          if (currentUser?.role !== 'admin' && currentUser?.department !== department) { return <div className="p-10 text-center text-red-500">您没有权限访问其他部门的项目</div>; }
                      }
                      return renderContent();
                  })()}
              </main>
          </div>
        </div>

        {/* Global Dialog Component */}
        {dialog?.isOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setDialog(null)}>
                <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl border p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-full ${dialog.isDestructive ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                            {dialog.type === 'alert' ? <AlertCircle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                        </div>
                        <h3 className="text-lg font-bold">{dialog.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">{dialog.message}</p>
                    <div className="flex justify-end gap-2">
                        {dialog.type === 'confirm' && (
                            <button onClick={() => setDialog(null)} className="px-4 py-2 rounded-xl border hover:bg-muted text-sm font-bold transition-colors">取消</button>
                        )}
                        <button 
                            onClick={() => { 
                                if (dialog.onConfirm) dialog.onConfirm();
                                setDialog(null);
                            }} 
                            className={`px-6 py-2 rounded-xl text-white text-sm font-bold shadow-lg transition-all ${dialog.isDestructive ? 'bg-red-600 shadow-red-200 hover:bg-red-700' : 'bg-primary shadow-primary/20 hover:opacity-90'}`}
                        >
                            {dialog.type === 'alert' ? '知道了' : '确认执行'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Password Modal */}
        {isPwdModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsPwdModalOpen(false)}>
                <div className="bg-background w-full max-w-sm rounded-xl shadow-xl border p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> 修改密码</h3>
                        <button onClick={() => setIsPwdModalOpen(false)}><XIcon className="h-5 w-5 text-muted-foreground"/></button>
                    </div>
                    <div className="space-y-4">
                        <input type="password" className="w-full h-10 px-3 rounded-md border text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新密码" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsPwdModalOpen(false)} className="px-4 py-2 rounded-md border text-sm">取消</button>
                            <button onClick={handleUpdatePassword} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-bold" disabled={!newPassword.trim()}>确认修改</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </>
    );
  };

  return <div className="min-h-screen bg-background text-foreground font-sans font-medium">{renderMainContent()}</div>;
};

export default App;