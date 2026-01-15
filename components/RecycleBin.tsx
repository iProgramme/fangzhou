import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { fetchDeletedProjects, restoreProject, permanentDeleteProject } from '../services/api';
import { Trash2, RotateCcw, Search, AlertTriangle } from 'lucide-react';

interface RecycleBinProps {
    confirmCustom: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ confirmCustom }) => {
    const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadDeletedProjects();
    }, []);

    const loadDeletedProjects = async () => {
        setLoading(true);
        try {
            const data = await fetchDeletedProjects();
            // Client-side safety filter: ensure deletedAt is actually set
            setDeletedProjects(data.filter(p => p.deletedAt !== null && p.deletedAt !== undefined));
        } catch (error) {
            console.error('Failed to load deleted projects', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (project: Project) => {
        confirmCustom(
            '确认恢复',
            `确定要恢复项目 "${project.name}" 吗？它将重新出现在原来的列表中。`,
            async () => {
                try {
                    await restoreProject(project.id);
                    setDeletedProjects(prev => prev.filter(p => p.id !== project.id));
                } catch (error) {
                    console.error('Failed to restore project', error);
                }
            }
        );
    };

    const handlePermanentDelete = async (project: Project) => {
        confirmCustom(
            '永久删除',
            `警告：这将永久删除项目 "${project.name}" 及其所有数据，无法撤销！`,
            async () => {
                try {
                    await permanentDeleteProject(project.id);
                    setDeletedProjects(prev => prev.filter(p => p.id !== project.id));
                } catch (error) {
                    console.error('Failed to permanently delete project', error);
                }
            },
            true // isDestructive
        );
    };

    const filteredProjects = deletedProjects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contractNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center text-muted-foreground">加载已删除项目中...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">回收站</h2>
                        <p className="text-sm text-muted-foreground">管理已删除的项目</p>
                    </div>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="搜索已删除项目..." 
                        className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {deletedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-xl bg-card/50">
                    <Trash2 className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">回收站是空的</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">项目名称</th>
                                <th className="px-4 py-3 font-medium">合同编号</th>
                                <th className="px-4 py-3 font-medium">原部门</th>
                                <th className="px-4 py-3 font-medium">删除时间</th>
                                <th className="px-4 py-3 font-medium text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{project.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground font-mono">{project.contractNo || '-'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{project.department}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {project.deletedAt ? new Date(project.deletedAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleRestore(project)}
                                                className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                title="恢复项目"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => handlePermanentDelete(project)}
                                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                title="永久删除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-500 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>提示：这里的项目仅被标记为删除。点击“永久删除”将从数据库中彻底移除数据且无法恢复。</p>
            </div>
        </div>
    );
};

export default RecycleBin;
