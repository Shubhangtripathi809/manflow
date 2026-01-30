import React, { useState, useCallback } from 'react';
import { CheckSquare, Plus, Grid3X3, List, Search } from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TaskDetailModal } from './TaskDetailModal';
import { AITask } from './AITask';
import { Task } from '@/types';
import { DualView } from '@/components/layout/DualView/DualView';
import { createTasksTableColumns, TaskGridCard } from '@/components/layout/DualView/taskConfig';

export const MyTask: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showAITaskModal, setShowAITaskModal] = useState(false);

    const activeFilter = location.pathname.split('/').filter(p => p)[1]?.toUpperCase() || 'ALL';

    const { data: tasksData, isLoading: loading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => taskApi.list(),
        enabled: !!user,
    });

    const tasks = React.useMemo(() => {
        if (!tasksData || !user) return [];
        const allTasks = Array.isArray(tasksData) ? tasksData : tasksData.tasks || tasksData.results || [];
        if (user.role === 'admin') {
            return allTasks;
        }
        if (user.role === 'manager') {
            return allTasks.filter((task: Task) =>
                task.assigned_by === user.id ||
                task.assigned_to.includes(user.id)
            );
        }
        return allTasks.filter((task: Task) =>
            task.assigned_to.includes(user.id)
        );
    }, [tasksData, user]);

    const handleTaskClick = useCallback((task: Task) => setSelectedTask(task), []);
    const handleCloseTaskDetail = useCallback(() => setSelectedTask(null), []);

    const handleSelectedTaskUpdate = useCallback((updatedTask: Task) => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setSelectedTask(updatedTask);
    }, [queryClient]);

    const handleDeleteTask = useCallback(async (id: number) => {
        await taskApi.delete(id);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setSelectedTask(null);
    }, [queryClient]);

    const filteredTasks = tasks.filter((task: Task) => {
        const matchesFilter = activeFilter === 'ALL' || task.status.toUpperCase() === activeFilter;
        const matchesSearch = searchQuery.trim() === '' || task.heading.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleAITaskGenerate = useCallback(async (projectId: number, description: string) => {
        console.log('Generating AI task for project:', projectId, 'with description:', description);
    }, []);

    // Create table columns configuration
    const tableColumns = createTasksTableColumns({
        onTaskClick: handleTaskClick,
        queryClient,
        user,
        navigate
    });

    return (
        <div className="w-full p-8 space-y-8">
            {location.pathname.startsWith('/taskboard') && !location.pathname.endsWith('/create') ? (
                loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-6">
                            {/* Header Section */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
                                    <p className="text-lg text-muted-foreground mt-1">Manage and track your tasks efficiently</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {['admin', 'manager', 'annotator'].includes(user?.role || '') && (
                                        <>
                                            <button
                                                onClick={() => navigate('/taskboard/create')}
                                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add New
                                            </button>

                                            <button
                                                onClick={() => setShowAITaskModal(true)}
                                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
                                            >
                                                Generate Task by AI
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Controls Section */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search tasks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    />
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-md bg-white p-1 gap-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        title="Table View"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        title="Grid View"
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Section with DualView */}
                        <div className="space-y-0">
                            <DualView
                                viewMode={viewMode}
                                isLoading={loading}
                                gridProps={{
                                    data: filteredTasks,
                                    renderCard: (task: Task) => <TaskGridCard task={task} onTaskClick={handleTaskClick} />,
                                    gridClassName: "grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                                }}
                                tableProps={{
                                    data: filteredTasks,
                                    columns: tableColumns,
                                    rowKey: (task: Task) => task.id,
                                    onRowClick: handleTaskClick,
                                }}
                            />

                            {/* Add "Create" button at bottom of table view */}
                            {viewMode === 'table' && (
                                <div
                                    className="p-3 border-t border-[#dfe1e6] bg-white cursor-pointer hover:bg-gray-50 transition-colors rounded-b-md -mt-px"
                                    onClick={() => navigate('/taskboard/create')}
                                >
                                    <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium pl-1">
                                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                        <span className="hover:text-blue-600 transition-colors">Create</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )
            ) : (
                <Outlet />
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={handleCloseTaskDetail}
                    onDelete={handleDeleteTask}
                    onTaskUpdated={handleSelectedTaskUpdate}
                />
            )}

            {showAITaskModal && (
                <AITask
                    onClose={() => setShowAITaskModal(false)}
                    onGenerate={handleAITaskGenerate}
                />
            )}
        </div>
    );
};