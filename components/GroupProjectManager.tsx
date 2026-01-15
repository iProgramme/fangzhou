import React, { useState } from 'react';
import { Project, ProjectStage, Department, SystemDictionary } from '../types';
import ProjectTable from './ProjectTable';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS, renderId } from '../constants';

interface GroupProjectManagerProps {
    department: Department;
    projects: Project[];
    dictionaries: SystemDictionary;
    users?: any[];
    onAddProject: (data: Partial<Project>) => void;
    onEditProject: (project: Project) => void;
    onDeleteProject: (id: string) => void;
    selectedYear: number;
    availableYears: number[];
    onSelectYear: (year: number) => void;
    confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const GroupProjectManager: React.FC<GroupProjectManagerProps> = ({
    department, projects, dictionaries, users, onAddProject, onEditProject, onDeleteProject,
    selectedYear, availableYears, onSelectYear, confirmCustom
}) => {
    const [activeTab, setActiveTab] = useState<string>('progress');

    const getFilteredData = () => {
        const stage = activeTab === 'early' ? ProjectStage.EARLY : activeTab === 'completed' ? ProjectStage.COMPLETED : ProjectStage.GROUP_PROGRESS;
        return projects.filter(p => p.stage === stage);
    };

    const getColumns = () => {
        const idCol = { key: 'id', header: '序号', render: renderId };
        if (activeTab === 'early') return [idCol, ...EARLY_COLUMNS];
        if (activeTab === 'completed') return [idCol, ...COMPLETED_COLUMNS];
        return [idCol, ...PROGRESS_COLUMNS];
    };

    const tabs = [
        { id: 'progress', label: '进行中' },
        { id: 'early', label: '前期' },
        { id: 'completed', label: '已完成' },
    ];

    const getStage = () => {
        if (activeTab === 'early') return ProjectStage.EARLY;
        if (activeTab === 'completed') return ProjectStage.COMPLETED;
        return ProjectStage.GROUP_PROGRESS;
    };

    return (
        <div className="space-y-4">
            <div className="border-b overflow-x-auto custom-scrollbar flex items-center justify-between gap-4">
                <nav className="-mb-px flex space-x-4">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-bold transition-all ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <span className="text-[11px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase hidden md:inline-block">{department}</span>
            </div>

            <ProjectTable 
                data={getFilteredData()} 
                columns={getColumns() as any}
                showAddButton={true} 
                dictionaries={dictionaries}
                users={users}
                onAddProject={(data) => onAddProject({ ...data, department, stage: getStage() })} 
                onEditProject={onEditProject}
                onDeleteProject={onDeleteProject}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onSelectYear={onSelectYear}
                confirmCustom={confirmCustom}
                defaultStage={getStage()}
            />
        </div>
    );
};

export default GroupProjectManager;