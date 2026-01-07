import React, { useState, useCallback } from 'react';
import {
    CheckSquare, Calendar, Clock, Plus, Grid3X3, List, Search, Users, AlertCircle, CheckCircle, PlayCircle, Pause, Bell, ListTodo
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi } from '@/services/api';
import './MyTask.scss';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TaskDetailModal } from './TaskDetailModal';

interface Task {
    id: number;
    heading: string;
    description: string;
    start_date: string;
    end_date: string;
    priority: string;
    project: number | null;
    project_name: string | null;
    assigned_to: number[];
    assigned_to_user_details: Array<{
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
    }>;
    status: 'pending' | 'backlog' | 'in_progress' | 'completed' | 'deployed' | 'deferred' | string;
    attachments?: Array<{
        id: number;
        file_url: string;
        file_name: string;
        uploaded_at: string;
    }>;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
};

const getStatusConfig = (status: Task['status']) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
        case 'PENDING': return { bg: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-500', cardClass: 'card-pending', label: 'PENDING', icon: Clock };
        case 'BACKLOG': return { bg: 'bg-orange-50', text: 'text-orange-800', badge: 'bg-orange-500', cardClass: 'card-backlog', label: 'BACKLOG', icon: ListTodo };
        case 'IN_PROGRESS': return { bg: 'bg-blue-50', text: 'text-blue-800', badge: 'bg-blue-500', cardClass: 'card-in-progress', label: 'IN PROGRESS', icon: PlayCircle };
        case 'COMPLETED': return { bg: 'bg-green-50', text: 'text-green-800', badge: 'bg-green-500', cardClass: 'card-completed', label: 'COMPLETED', icon: CheckCircle };
        case 'DEPLOYED': return { bg: 'bg-purple-50', text: 'text-purple-800', badge: 'bg-purple-500', cardClass: 'card-deployed', label: 'DEPLOYED', icon: CheckSquare };
        case 'DEFERRED': return { bg: 'bg-gray-50', text: 'text-gray-800', badge: 'bg-gray-500', cardClass: 'card-deferred', label: 'DEFERRED', icon: Pause };
        default: return { bg: 'bg-gray-50', text: 'text-gray-800', badge: 'bg-gray-500', cardClass: 'card-gray', label: normalizedStatus, icon: AlertCircle };
    }
};

export const TaskCard: React.FC<{ task: Task; onTaskClick: (task: Task) => void }> = ({ task, onTaskClick }) => {
    const statusConfig = getStatusConfig(task.status);
    return (
        <div onClick={() => onTaskClick(task)} className={`${statusConfig.cardClass} rounded-xl p-4 transition-all duration-300 cursor-pointer text-gray-800 hover:shadow-lg hover:-translate-y-0.5 border border-[#d0d5dd]
`}>
            <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.badge} text-white`}>{statusConfig.label}</span>
            </div>
            <h3 className="text-md font-bold mt-2 mb-1">{task.heading}</h3>
            <div className="text-sm mb-4 text-gray-600 task-description-preview" dangerouslySetInnerHTML={{ __html: task.description }} style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', maxHeight: '4.5em' }} />
            <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /><span className="font-medium">Start:</span><span className="ml-1">{formatDate(task.start_date)}</span></div>
                <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /><span className="font-medium">End:</span><span className="ml-1">{formatDate(task.end_date)}</span></div>
                <div className="flex items-center"><Users className="w-3 h-3 mr-1" /><span className="font-medium">Assigned:</span><span className="ml-1">{task.assigned_to.length}</span></div>
            </div>
        </div>
    );
};

export const MyTask: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const activeFilter = location.pathname.split('/').filter(p => p)[1]?.toUpperCase() || 'ALL';

    const { data: tasksData, isLoading: loading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => taskApi.list(),
        enabled: !!user,
    });

    const tasks = React.useMemo(() => {
        if (!tasksData) return [];
        return Array.isArray(tasksData) ? tasksData : tasksData.tasks || tasksData.results || [];
    }, [tasksData]);

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

    const stats = {
        total: tasks.length,
        completed: tasks.filter((t: Task) => t.status.toLowerCase() === 'completed').length,
        pending: tasks.filter((t: Task) => t.status.toLowerCase() === 'pending').length,
        inProgress: tasks.filter((t: Task) => t.status.toLowerCase() === 'in_progress').length,
        deployed: tasks.filter((t: Task) => t.status.toLowerCase() === 'deployed').length,
        deferred: tasks.filter((t: Task) => t.status.toLowerCase() === 'deferred').length,
    };

    return (
        <div className="task-main-content-area w-full">
            {location.pathname.startsWith('/taskboard') && !location.pathname.endsWith('/create') ? (
                loading ? (
                    <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600" /></div>
                ) : (
                    <>
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
                                    <p className="text-lg text-gray-600">Manage and track your tasks efficiently</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {['admin', 'manager', 'annotator'].includes(user?.role || '') && (
                                        <button onClick={() => navigate('/taskboard/create')} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"><Plus className="w-4 h-4 mr-2" /> Add New</button>
                                    )}
                                    <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">{activeFilter} Tasks ({filteredTasks.length})</div>
                                </div>
                            </div>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-6 gap-4 mb-6 stat-cards-container">
                                {[
                                    { label: 'Total', val: stats.total, color: 'text-gray-900' },
                                    { label: 'Completed', val: stats.completed, color: 'text-green-600' },
                                    { label: 'Pending', val: stats.pending, color: 'text-yellow-600' },
                                    { label: 'In Progress', val: stats.inProgress, color: 'text-blue-600' },
                                    { label: 'Deployed', val: stats.deployed, color: 'text-purple-600' },
                                    { label: 'Deferred', val: stats.deferred, color: 'text-gray-600' }
                                ].map(s => (
                                    <div key={s.label} className="p-4 rounded-lg bg-white shadow-sm text-center stat-card">
                                        <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                                        <div className="text-sm text-gray-600">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300" />
                                </div>
                                <div className="flex rounded-lg border overflow-hidden">
                                    <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white'}`}><Grid3X3 className="w-5 h-5" /></button>
                                    <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white'}`}><List className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                            {filteredTasks.map((t: Task) => <TaskCard key={t.id} task={t} onTaskClick={handleTaskClick} />)}
                        </div>
                    </>
                )
            ) : <Outlet />}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    onClose={handleCloseTaskDetail} 
                    onDelete={handleDeleteTask} 
                    onTaskUpdated={handleSelectedTaskUpdate} 
                />
            )}
        </div>
    );
};