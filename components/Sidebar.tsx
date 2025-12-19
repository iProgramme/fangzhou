import React, { useState } from 'react';
import { LayoutDashboard, Users, Settings, ChevronDown, ChevronRight, X, Briefcase, LogOut } from 'lucide-react';
import { User, Department, DEPARTMENT_SLUGS } from '../types'; // Import User, Department and DEPARTMENT_SLUGS

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentUser: User | null;
  onLogout: () => void;
}

type MenuItem = {
  name: string;
  icon?: React.ElementType;
  path?: string;
  children?: { name: string; path: string; icon?: React.ElementType }[];
};

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, isOpen, setIsOpen, currentUser, onLogout }) => {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '项目周期': true,
    '各项目组': true
  });

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const menuStructure: MenuItem[] = [
    { name: '仪表盘', icon: LayoutDashboard, path: '/' },
    {
      name: '项目周期',
      icon: Briefcase,
      children: [
        { name: '前期项目跟进', path: '/cycle/early' },
        { name: '年度收款计划', path: '/cycle/collection' },
        { name: '各组项目列表及进度', path: '/cycle/progress' },
        { name: '已完成项目', path: '/cycle/completed' },
      ]
    },
    {
      name: '各项目组',
      icon: Users,
      children: [
        { name: '综合组（汤、黄）', path: '/groups/comprehensive' },
        { name: '市政组（大汤）', path: '/groups/municipal' },
        { name: '交通组（任）', path: '/groups/traffic' },
        { name: '规划一组（邝）', path: '/groups/planning-1' },
        { name: '规划二组（润新）', path: '/groups/planning-2' },
        { name: '规划三组（胡）', path: '/groups/planning-3' },
        { name: '规划四组（秀明）', path: '/groups/planning-4' },
        { name: '前期和城市设计组（林）', path: '/groups/design' },
        { name: '城市更新组（利）', path: '/groups/renewal' },
      ]
    },
    { name: '系统设置', icon: Settings, path: '/settings' },
  ];

  const filteredMenuStructure = menuStructure.filter(item => {
    // 1. Dashboard is visible to everyone
    if (item.path === '/') return true;

    // 2. Project Cycle is visible to everyone
    if (item.name === '项目周期') return true;

    // 3. System Settings only for admin
    if (item.path === '/settings') {
      return currentUser?.role === 'admin';
    }

    // 4. Group filtering
    if (item.name === '各项目组') {
      if (currentUser?.role === 'admin') return true;
      
      // Filter children for non-admins
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          const dept = DEPARTMENT_SLUGS[child.path.split('/groups/')[1]];
          return currentUser?.department === dept;
        });
        
        if (filteredChildren.length > 0) {
          item.children = filteredChildren;
          return true;
        }
      }
      return false;
    }

    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-72 transform bg-card border-r border-border transition-transform duration-200 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-border shrink-0">
          <span className="text-xl font-bold text-primary">项目管理系统</span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {filteredMenuStructure.map((item) => {
            if (item.children) {
              const isExpanded = expandedMenus[item.name];
              const isActiveParent = item.children.some(child => child.path === currentPath);
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`
                      flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors
                      ${isActiveParent ? 'text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon && <item.icon className="h-5 w-5" />}
                      {item.name}
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 pl-4 border-l border-border space-y-1">
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          onClick={() => {
                            onNavigate(child.path);
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={`
                            flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                            ${currentPath === child.path 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                          `}
                        >
                          <span className="truncate">{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.path) onNavigate(item.path);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`
                  flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors
                  ${currentPath === item.path 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.name}
              </button>
            );
          })}
        </nav>
      
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-xs">
                 {currentUser?.name?.charAt(0) || 'U'}
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-medium">{currentUser?.name || '未知用户'}</span>
                 <span className="text-xs text-muted-foreground">
                    {currentUser?.role === 'admin' ? '管理员' : currentUser?.role === 'manager' ? '经理' : '普通用户'}
                 </span>
               </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
