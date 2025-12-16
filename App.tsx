import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectTable from './components/ProjectTable';
import GroupProjectManager from './components/GroupProjectManager';
import Settings from './components/Settings';
import Watermark from './components/Watermark';
import { MOCK_PROJECTS, CURRENT_USER, MOCK_USERS, INITIAL_DICTIONARIES, INITIAL_LOGS } from './services/mockData';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS } from './constants';
import { ProjectStage, DEPARTMENT_SLUGS, Project, OperationLog, User, DictItem } from './types';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || '/';
  });

  // Global State Lifting for Data Consistency
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [logs, setLogs] = useState<OperationLog[]>(INITIAL_LOGS);
  const [dictionaries, setDictionaries] = useState(INITIAL_DICTIONARIES);

  // Helper to add log
  const addLog = (action: OperationLog['action'], targetType: OperationLog['targetType'], details: string, targetId?: string) => {
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
    setLogs(prev => [...prev, newLog]);
  };

  // Project Handlers
  const handleAddProject = (newProjectData: Partial<Project>) => {
      const newProject: Project = {
          id: Math.random().toString(36).substr(2, 9),
          stage: ProjectStage.EARLY, // Default
          department: CURRENT_USER.department!, // Default to current user's department if not specified
          name: '新项目',
          ...newProjectData,
      } as Project;

      setProjects(prev => [...prev, newProject]);
      addLog('CREATE', 'PROJECT', `创建项目: ${newProject.name}`, newProject.id);
  };

  const handleUpdateProject = (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      addLog('UPDATE', 'PROJECT', `更新项目: ${updatedProject.name}`, updatedProject.id);
  };

  const handleDeleteProject = (id: string) => {
      const project = projects.find(p => p.id === id);
      setProjects(prev => prev.filter(p => p.id !== id));
      addLog('DELETE', 'PROJECT', `删除项目: ${project?.name || id}`, id);
  };

  // User Handlers
  const handleUpdateUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      addLog('UPDATE', 'USER', '更新用户列表');
  };

  // Dictionary Handler
  const handleUpdateDictionary = (key: string, values: DictItem[]) => {
      setDictionaries(prev => ({...prev, [key]: values}));
      addLog('UPDATE', 'SYSTEM', `更新字典: ${key}`);
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
      
      // Project Cycle Routes - All these views share the same global 'projects' state
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