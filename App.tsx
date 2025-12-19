import React, { useState, useEffect } from 'react';
import { Menu, Calendar, Lock, X as XIcon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import Login from './components/Login'; // Import Login component
import { CURRENT_USER } from './services/mockData';
import { fetchProjects, createProject, updateProject, deleteProject, fetchUsers, fetchDictionaries, updateDictionary, fetchLogs, updateUser } from './services/api';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS } from './constants';
import { ProjectStage, DEPARTMENT_SLUGS, Project, OperationLog, User, DictItem } from './types'; // Import User type

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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Global year state

  // Password Modification State
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // Check localStorage for a token or user info
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Derive availableYears from dictionaries
  const availableYears = React.useMemo(() => {
    return dictionaries?.['系统年份']?.map((d: DictItem) => Number(d.label)) || [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2];
  }, [dictionaries]);

  // Function to handle login
  const handleLogin = (username: string, department?: string, role?: string) => {
    // Determine display name based on role
    const displayName = role === 'admin' ? '超级管理员' : username;

    const mockUser: User = {
      id: username, // Using username as ID for legacy compatibility in state
      name: displayName,
      role: (role || 'user') as 'admin' | 'user' | 'manager',
      department: department as any,
      status: 'active',
    };

    setIsLoggedIn(true);
    setCurrentUser(mockUser);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    // Redirect to home or previous path after login if needed
    if (currentPath === '/login' || currentPath === '/') { // If on login page or root, navigate to dashboard
      setCurrentPath('/'); 
      window.location.hash = '/';
    }
  };

  const handleUpdatePassword = async () => {
      if (!newPassword.trim()) return;
      if (!currentUser) return;

      try {
          // Find user by ID or Name (handling the 'Super Admin' display name mapping)
          const fullUser = users.find(u => 
            u.id === currentUser.id || 
            u.name === currentUser.name || 
            (currentUser.role === 'admin' && u.name === 'admin')
          );

          if (fullUser) {
              await updateUser({ ...fullUser, password: newPassword });
              alert('密码修改成功，请使用新密码重新登录');
              handleLogout();
          } else if (currentUser.role === 'admin' && currentUser.name === '超级管理员') {
              // Fallback for hardcoded admin if not in DB list yet
              alert('当前超级管理员账号尚未在数据库中注册，请先在“系统设置”中添加 admin 账号。');
          } else {
              alert('未找到用户记录，请联系系统维护员。');
          }
      } catch (e) {
          alert('修改失败');
      }
      setIsPwdModalOpen(false);
      setNewPassword('');
  };

  // Function to handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    // Redirect to login page
    setCurrentPath('/login');
    window.location.hash = '/login';
  };

  // Data Fetching based on Route
  useEffect(() => {
    const loadData = async () => {
      // Fetch dictionaries on initial load
      if (Object.keys(dictionaries).length === 0) {
          try {
             const d = await fetchDictionaries();
             setDictionaries(d);
          } catch(e) { console.error('Failed to load initial data', e); }
      }

      // Route-specific fetching
      if (currentPath === '/settings') {
          // Settings needs Users and Logs
          setLoading(true);
          try {
              const [u, l] = await Promise.all([
                  fetchUsers(),
                  fetchLogs()
              ]);
              setUsers(u);
              setLogs(l);
          } catch (e) {
              console.error('Failed to load settings data', e);
          } finally {
              setLoading(false);
          }
      } else {
          // Check for project routes
          let filters: any = null;
          
          if (currentPath === '/cycle/early') {
              filters = { stage: 'early' };
          } else if (currentPath === '/cycle/collection') {
              filters = { stage: 'collection' };
          } else if (currentPath === '/cycle/progress') {
              filters = { stage: 'progress' };
          } else if (currentPath === '/cycle/completed') {
              filters = { stage: 'completed' };
          } else if (currentPath.startsWith('/groups/')) {
              const slug = currentPath.split('/groups/')[1];
              if (slug) filters = { department: slug };
          }

          if (filters) {
              setLoading(true);
              try {
                  const p = await fetchProjects(filters);
                  setProjects(p);
              } catch (e) {
                  console.error('Failed to load projects', e);
              } finally {
                  setLoading(false);
              }
          } else {
             // Dashboard or unknown route
             setLoading(false);
          }
      }
    };
    
    loadData();
  }, [currentPath, dictionaries]); // Added dictionaries to dependency array for availableYears

  // Helper to refresh logs
  const refreshLogs = async () => {
      const l = await fetchLogs();
      setLogs(l);
  };

  // Project Handlers
  const handleAddProject = async (newProjectData: Partial<Project>) => {
      const newProject = {
          stage: ProjectStage.EARLY, 
          department: CURRENT_USER.department!,
          name: '新项目',
          ...newProjectData,
      };

      try {
        const created = await createProject(newProject);
        setProjects(prev => [created, ...prev]);
        refreshLogs();
      } catch (e) {
          alert('创建失败');
      }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
      try {
          const updated = await updateProject(updatedProject);
          setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
          refreshLogs();
      } catch (e) {
          alert('更新失败');
      }
  };

  const handleDeleteProject = async (id: string) => {
      try {
          await deleteProject(id);
          setProjects(prev => prev.filter(p => p.id !== id));
          refreshLogs();
      } catch (e) {
          alert('删除失败');
      }
  };

  const refreshUsers = async () => {
      const u = await fetchUsers();
      setUsers(u);
  };

  // Dictionary Handler
  const handleUpdateDictionary = async (key: string, values: DictItem[]) => {
      try {
        const updated = await updateDictionary(key, values);
        setDictionaries((prev: any) => ({...prev, [key]: updated.items}));
        refreshLogs();
      } catch (e) {
          alert('字典更新失败');
      }
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

    const isAdmin = currentUser?.role === 'admin';

    // Handle dynamic group routes: /groups/:slug
    if (currentPath.startsWith('/groups/')) {
        const slug = currentPath.split('/groups/')[1];
        const department = DEPARTMENT_SLUGS[slug];
        
        if (department) {
            return (
                <GroupProjectManager 
                    department={department}
                    projects={projects.filter(p => p.department === department)}
                    dictionaries={dictionaries}
                    onAddProject={handleAddProject}
                    onEditProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    selectedYear={selectedYear}
                    availableYears={availableYears}
                    onSelectYear={setSelectedYear}
                />
            );
        }
    }

    // Protection and Defaults for Non-Admins
    if (!isAdmin && (currentPath === '/' || currentPath.startsWith('/cycle/'))) {
        // Find the user's department slug to show their group page instead
        const userDept = currentUser?.department;
        const deptSlug = Object.keys(DEPARTMENT_SLUGS).find(key => DEPARTMENT_SLUGS[key] === userDept);
        
        if (deptSlug) {
            // Implicitly render their department's group manager instead of Dashboard/Cycle
            return (
                <GroupProjectManager 
                    department={userDept!}
                    projects={projects.filter(p => p.department === userDept)}
                    dictionaries={dictionaries}
                    onAddProject={handleAddProject}
                    onEditProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    selectedYear={selectedYear}
                    availableYears={availableYears}
                    onSelectYear={setSelectedYear}
                />
            );
        }
        return <div className="p-10 text-center text-muted-foreground">您没有分配部门，请联系管理员</div>;
    }

    switch (currentPath) {
      case '/':
        return <Dashboard 
                  selectedYear={selectedYear} 
                  availableYears={availableYears} 
                  onSelectYear={setSelectedYear} 
                />; 
      
      case '/cycle/early':
        return (
          <ProjectTable 
            title="前期项目跟进" 
            data={projects.filter(p => p.stage === ProjectStage.EARLY)}
            columns={EARLY_COLUMNS as any}
            dictionaries={dictionaries}
            onAddProject={handleAddProject}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            selectedYear={selectedYear} 
            availableYears={availableYears} 
            onSelectYear={setSelectedYear} 
          />
        );
      case '/cycle/collection':
        return (
          <ProjectTable 
            title="年度收款计划" // Removed "A2025"
            data={projects.filter(p => p.stage === ProjectStage.COLLECTION)}
            columns={COLLECTION_COLUMNS as any}
            dictionaries={dictionaries}
            onAddProject={handleAddProject}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            selectedYear={selectedYear} 
            availableYears={availableYears} 
            onSelectYear={setSelectedYear} 
          />
        );
      case '/cycle/progress':
        return (
          <ProjectTable 
            title="各组项目列表及进度" // Removed "B2025"
            data={projects.filter(p => p.stage === ProjectStage.GROUP_PROGRESS)}
            columns={PROGRESS_COLUMNS as any}
            dictionaries={dictionaries}
            onAddProject={handleAddProject}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            selectedYear={selectedYear} 
            availableYears={availableYears} 
            onSelectYear={setSelectedYear} 
          />
        );
      case '/cycle/completed':
        return (
          <ProjectTable 
            title="已完成项目" 
            data={projects.filter(p => p.stage === ProjectStage.COMPLETED)}
            columns={COMPLETED_COLUMNS as any}
            dictionaries={dictionaries}
            onAddProject={handleAddProject}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            selectedYear={selectedYear} 
            availableYears={availableYears} 
            onSelectYear={setSelectedYear} 
          />
        );

      case '/settings':
        return (
            <Settings 
                users={users} 
                onRefreshUsers={refreshUsers}
                logs={logs}
                dictionaries={dictionaries}
                onUpdateDictionary={handleUpdateDictionary}
            />
        );
      default:
        return <Dashboard 
                  selectedYear={selectedYear} 
                  availableYears={availableYears} 
                  onSelectYear={setSelectedYear} 
                />;
    }
  };

  const renderMainContent = () => {
    if (!isLoggedIn) return <Login onLogin={handleLogin} />;

    return (
      <>
        <Watermark userName={currentUser?.name || CURRENT_USER.name} />
        
        <div className="flex h-screen overflow-hidden">
          <Sidebar 
              currentPath={currentPath} 
              onNavigate={handleNavigate} 
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
              currentUser={currentUser}
              onLogout={handleLogout}
              onChangePassword={() => setIsPwdModalOpen(true)}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
                  <button onClick={() => setSidebarOpen(true)}>
                      <Menu className="h-6 w-6" />
                  </button>
                  <span className="font-semibold">项目管理系统</span>
              </header>

              <main className="flex-1 overflow-y-auto p-6 md:p-12">
                  {/* Global Year Selector */}
                  {currentPath !== '/settings' && currentPath !== '/login' && (
                      <div className="flex items-center justify-between mb-8 border-b pb-4">
                          <div>
                              <h2 className="text-xl font-semibold">
                                  {currentPath === '/' ? '数据总览' : 
                                   currentPath.startsWith('/groups/') ? '项目组管理' : '项目周期'}
                              </h2>
                              <p className="text-sm text-muted-foreground">当前查看年份：{selectedYear}年</p>
                          </div>
                          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border shadow-sm">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">切换年份:</span>
                              <select 
                                  value={selectedYear} 
                                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                                  className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
                              >
                                  {availableYears.map(year => (
                                      <option key={year} value={year}>{year}</option>
                                  ))}
                              </select>
                          </div>
                      </div>
                  )}

                  {(() => {
                      if (loading) return <div className="p-10 flex justify-center text-muted-foreground">加载数据中...</div>;

                      // Access Control Logic
                      if (currentPath === '/settings' && currentUser?.role !== 'admin') {
                          return <div className="p-10 text-center text-red-500">您没有权限访问此页面</div>;
                      }
                      
                      if (currentPath.startsWith('/groups/')) {
                          const slug = currentPath.split('/groups/')[1];
                          const department = DEPARTMENT_SLUGS[slug];
                          if (currentUser?.role !== 'admin' && currentUser?.department !== department) {
                              return <div className="p-10 text-center text-red-500">您没有权限访问其他部门的项目</div>;
                          }
                      }

                      return renderContent();
                  })()}
              </main>
          </div>
        </div>

        {/* Global Change Password Modal */}
        {isPwdModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-background w-full max-w-sm rounded-xl shadow-xl border p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" /> 修改密码
                        </h3>
                        <button onClick={() => setIsPwdModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                            <XIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">新登录密码</label>
                            <input 
                              type="password" 
                              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="请输入新密码"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground italic">* 修改成功后系统将自动退出，请使用新密码重新登录。</p>
                        <div className="pt-2 flex justify-end gap-2">
                            <button onClick={() => setIsPwdModalOpen(false)} className="px-4 py-2 rounded-md border hover:bg-muted text-sm font-medium">取消</button>
                            <button 
                              onClick={handleUpdatePassword} 
                              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium"
                              disabled={!newPassword.trim()}
                            >
                              确认修改
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
        {renderMainContent()}
    </div>
  );
};

export default App;