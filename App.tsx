
import React, { useState, useEffect } from 'react';
import { Menu, Loader2, ServerCrash } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import { CURRENT_USER } from './services/mockData';
import { api } from './services/api'; // Use the new API service
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS } from './constants';
import { ProjectStage, DEPARTMENT_SLUGS, Project, OperationLog, User, DictItem, SystemDictionary } from './types';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || '/';
  });

  // App State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [dictionaries, setDictionaries] = useState<SystemDictionary>({});

  // Helper to add log (Persist to DB)
  const addLog = async (action: OperationLog['action'], targetType: OperationLog['targetType'], details: string, targetId?: string) => {
    const newLog: OperationLog = {
        id: Math.random().toString(36).substr(2, 9),
        userId: CURRENT_USER.id,
        userName: CURRENT_USER.name,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString()
    };
    
    // Optimistic Update
    setLogs(prev => [...prev, newLog]);
    
    try {
        await api.createLog(newLog);
    } catch (e) {
        console.error("Failed to persist log", e);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
      const loadData = async () => {
          setLoading(true);
          try {
              const [p, u, l, d] = await Promise.all([
                  api.fetchProjects(),
                  api.fetchUsers(),
                  api.fetchLogs(),
                  api.fetchDictionaries()
              ]);
              setProjects(p);
              setUsers(u);
              setLogs(l);
              setDictionaries(d);
              setError(null);
          } catch (err) {
              console.error(err);
              setError("无法连接到服务器或数据库。请确保后端服务(server/index.ts)已启动。");
          } finally {
              setLoading(false);
          }
      };
      loadData();
  }, []);

  // Project Handlers
  const handleAddProject = async (newProjectData: Partial<Project>) => {
      const newProject: Project = {
          id: Math.random().toString(36).substr(2, 9),
          stage: ProjectStage.EARLY, // Default
          department: CURRENT_USER.department!, // Default to current user's department if not specified
          name: '新项目',
          ...newProjectData,
      } as Project;

      // Optimistic
      setProjects(prev => [...prev, newProject]);
      
      try {
          await api.createProject(newProject);
          addLog('CREATE', 'PROJECT', `创建项目: ${newProject.name}`, newProject.id);
      } catch (e) {
          alert('创建项目失败，请重试');
          setProjects(prev => prev.filter(p => p.id !== newProject.id)); // Revert
      }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      
      try {
          await api.updateProject(updatedProject);
          addLog('UPDATE', 'PROJECT', `更新项目: ${updatedProject.name}`, updatedProject.id);
      } catch (e) {
          alert('更新失败');
          // Ideally revert here, omitted for brevity
      }
  };

  const handleDeleteProject = async (id: string) => {
      const project = projects.find(p => p.id === id);
      if (window.confirm('确认删除？')) {
        setProjects(prev => prev.filter(p => p.id !== id));
        try {
            await api.deleteProject(id);
            addLog('DELETE', 'PROJECT', `删除项目: ${project?.name || id}`, id);
        } catch (e) {
            alert('删除失败');
        }
      }
  };

  // User Handlers
  const handleUpdateUsers = async (newUsers: User[]) => {
      setUsers(newUsers);
      try {
          await api.updateUsers(newUsers);
          addLog('UPDATE', 'USER', '更新用户列表');
      } catch (e) {
          alert('更新用户列表失败');
      }
  };

  // Dictionary Handler
  const handleUpdateDictionary = async (key: string, values: DictItem[]) => {
      const newDicts = {...dictionaries, [key]: values};
      setDictionaries(newDicts);
      try {
          await api.updateDictionary(key, values, newDicts);
          addLog('UPDATE', 'SYSTEM', `更新字典: ${key}`);
      } catch (e) {
          alert('更新字典失败');
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
                />
            );
        }
    }

    switch (currentPath) {
      case '/':
        return <Dashboard />; 
      
      case '/cycle/early':
        return (
          <ProjectTable 
            title="前期项目跟进" 
            data={projects.filter(p => p.stage === ProjectStage.EARLY)}
            columns={EARLY_COLUMNS as any}
            dictionaries={dictionaries}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case '/cycle/collection':
        return (
          <ProjectTable 
            title="A2025年底收款计划" 
            data={projects.filter(p => p.stage === ProjectStage.COLLECTION)}
            columns={COLLECTION_COLUMNS as any}
            dictionaries={dictionaries}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case '/cycle/progress':
        return (
          <ProjectTable 
            title="B2025各组项目列表及进度" 
            data={projects.filter(p => p.stage === ProjectStage.GROUP_PROGRESS)}
            columns={PROGRESS_COLUMNS as any}
            dictionaries={dictionaries}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case '/cycle/completed':
        return (
          <ProjectTable 
            title="C已完成项目" 
            data={projects.filter(p => p.stage === ProjectStage.COMPLETED)}
            columns={COMPLETED_COLUMNS as any}
            dictionaries={dictionaries}
            onEditProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
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
        return <Dashboard />;
    }
  };

  if (loading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p>正在连接数据库...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 p-4 text-center">
              <ServerCrash className="h-16 w-16 text-red-500" />
              <h1 className="text-xl font-bold">连接错误</h1>
              <p className="text-muted-foreground">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                  重试
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Watermark userName={CURRENT_USER.name} />
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
            currentPath={currentPath} 
            onNavigate={handleNavigate} 
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile Header */}
            <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
                <button onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-6 w-6" />
                </button>
                <span className="font-semibold">项目管理系统</span>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                {renderContent()}
            </main>
        </div>
      </div>
    </div>
  );
};

export default App;
