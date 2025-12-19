import React, { useState, useEffect } from 'react';
import { Menu, Calendar } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import Login from './components/Login'; // Import Login component
import { CURRENT_USER } from './services/mockData';
import { fetchProjects, createProject, updateProject, deleteProject, fetchUsers, fetchDictionaries, updateDictionary, fetchLogs } from './services/api';
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
    // In a real app, you'd fetch user details from an API after successful auth
    // For now, construct a mock user object based on Login.tsx logic
    const mockUser: User = {
      id: username, // Using username as ID for mock
      name: username === 'admin' ? '管理员' : username,
      role: (role || 'user') as 'admin' | 'user' | 'manager',
      department: department as any, // Cast to Department type if needed
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
      // Dictionaries are needed for almost all pages, fetch if missing
      if (Object.keys(dictionaries).length === 0) {
          try {
             const d = await fetchDictionaries();
             setDictionaries(d);
          } catch(e) { console.error('Failed to load dictionaries', e); }
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

  const handleUpdateUsers = (newUsers: User[]) => {
      setUsers(newUsers);
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
                onUpdateUsers={handleUpdateUsers}
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Watermark userName={currentUser?.name || CURRENT_USER.name} />
          
          <div className="flex h-screen overflow-hidden">
            <Sidebar 
                currentPath={currentPath} 
                onNavigate={handleNavigate} 
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                currentUser={currentUser} // Pass currentUser to Sidebar for conditional rendering
                onLogout={handleLogout} // Pass logout handler
            />

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
                    <button onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-semibold">项目管理系统</span>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-12">
                    {/* Global Year Selector - Moved to the very top */}
                    {isLoggedIn && currentPath !== '/settings' && currentPath !== '/login' && (
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
        </>
      )}
    </div>
  );
};

export default App;