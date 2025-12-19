import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import { CURRENT_USER } from './services/mockData';
import { fetchProjects, createProject, updateProject, deleteProject, fetchUsers, fetchDictionaries, updateDictionary, fetchLogs } from './services/api';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS } from './constants';
import { ProjectStage, DEPARTMENT_SLUGS, Project, OperationLog, User, DictItem } from './types';

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
  }, [currentPath]);

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
            <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
                <button onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-6 w-6" />
                </button>
                <span className="font-semibold">项目管理系统</span>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                {renderContent()}
            </main>
        </div>
      </div>
    </div>
  );
};

export default App;