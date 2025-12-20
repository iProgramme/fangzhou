import React, { useState } from 'react';
import { Project, ProjectStage, Department, SystemDictionary } from '../types';
import ProjectTable from './ProjectTable';
import { EARLY_COLUMNS, COLLECTION_COLUMNS, PROGRESS_COLUMNS, COMPLETED_COLUMNS, renderId } from '../constants';

interface GroupProjectManagerProps {
    department: Department;
    projects: Project[];
    dictionaries: SystemDictionary;
    onAddProject: (data: Partial<Project>) => void;
    onEditProject: (project: Project) => void;
    onDeleteProject: (id: string) => void;
        selectedYear: number;
        availableYears: number[];
        onSelectYear: (year: number) => void;
        selectedQuarter: string;
        confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
    }
    
    const GroupProjectManager: React.FC<GroupProjectManagerProps> = ({
        department,
        projects,
        dictionaries,
        onAddProject,
        onEditProject,
        onDeleteProject,
        selectedYear,
        availableYears,
        onSelectYear,
        confirmCustom
    }) => {    const [activeTab, setActiveTab] = useState<string>('progress'); // Default to Progress

    const getFilteredData = () => {
        switch (activeTab) {
            case 'early': return projects.filter(p => p.stage === ProjectStage.EARLY);
            case 'collection': return projects.filter(p => p.stage === ProjectStage.COLLECTION);
            case 'completed': return projects.filter(p => p.stage === ProjectStage.COMPLETED);
            case 'progress': return projects.filter(p => p.stage === ProjectStage.GROUP_PROGRESS);
            default: return projects;
        }
    };

    const getColumns = () => {
        // Group views usually include an ID/Serial Number column first
        const idCol = { key: 'id', header: '序号', render: renderId };
        
        switch (activeTab) {
            case 'early': return [idCol, ...EARLY_COLUMNS];
            case 'collection': return [idCol, ...COLLECTION_COLUMNS];
            case 'completed': return [idCol, ...COMPLETED_COLUMNS];
            case 'progress': 
            default: 
                return [idCol, ...PROGRESS_COLUMNS];
        }
    };

    const tabs = [
        { id: 'progress', label: '各组项目列表及进度' },
        { id: 'early', label: '前期项目跟进' },
        { id: 'collection', label: '年底收款计划' },
        { id: 'completed', label: '已完成项目' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">{department}</h1>
                <p className="text-muted-foreground text-sm">管理该部门下的所有项目全周期数据</p>
            </div>

            {/* Internal Tabs */}
            <div className="border-b overflow-x-auto">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors
                                ${activeTab === tab.id 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <ProjectTable 
                data={getFilteredData()} 
                columns={getColumns() as any}
                showAddButton={true} 
                dictionaries={dictionaries}
                onAddProject={(data) => onAddProject({ ...data, department })} 
                onEditProject={onEditProject}
                onDeleteProject={onDeleteProject}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onSelectYear={onSelectYear}
                confirmCustom={confirmCustom}
            />
        </div>
    );
};

export default GroupProjectManager;
