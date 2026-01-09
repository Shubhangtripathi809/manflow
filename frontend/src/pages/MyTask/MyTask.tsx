import React, { useState, useCallback } from 'react';
import {
    CheckSquare, Calendar, Clock, Plus, Grid3X3, List, Search, Users, AlertCircle, CheckCircle, PlayCircle, Pause, Bell, ListTodo,
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi } from '@/services/api';
import './MyTask.scss';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { TaskDetailModal } from './TaskDetailModal';
import { AITask } from './AITask';

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

interface TaskListViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ tasks, onTaskClick }) => {
    const navigate = useNavigate();
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
    const [commentText, setCommentText] = useState('');
    const queryClient = useQueryClient();

    // Reusing mutation logic from TaskDetailModal.tsx
    const addCommentMutation = useMutation({
        mutationFn: ({ taskId, content }: { taskId: number; content: string }) =>
            taskApi.addComment(taskId, { content }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setCommentText('');
            setActiveCommentId(null);
        },
    });

    const handleCommentSubmit = (taskId: number) => {
        if (commentText.trim()) {
            addCommentMutation.mutate({ taskId, content: commentText.trim() });
        } else {
            setActiveCommentId(null);
        }
    };

    const toggleSelectAll = () => {
        if (selectedTasks.size === tasks.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(tasks.map(t => t.id)));
        }
    };

    const toggleSelectTask = (taskId: number, e: React.ChangeEvent) => {
        e.stopPropagation();
        const newSelection = new Set(selectedTasks);
        if (newSelection.has(taskId)) {
            newSelection.delete(taskId);
        } else {
            newSelection.add(taskId);
        }
        setSelectedTasks(newSelection);
    };
    const priorityOptions = [
        { value: 'high', label: 'High', color: 'text-red-600', dotColor: 'bg-red-500', icon: '🔴' },
        { value: 'medium', label: 'Medium', color: 'text-orange-600', dotColor: 'bg-orange-200', icon: '🟡' },
        { value: 'low', label: 'Low', color: 'text-green-600', dotColor: 'bg-green-500', icon: '🟢' },
    ];

    const [activePriorityId, setActivePriorityId] = useState<number | null>(null);

    const handlePriorityChange = async (taskId: number, newPriority: string) => {
        try {
            await taskApi.update(taskId, { priority: newPriority } as any);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setActivePriorityId(null);
        } catch (error) {
            console.error('Failed to update priority:', error);
        }
    };

    const handleDateChange = async (taskId: number, field: 'start_date' | 'end_date', value: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        try {
            await taskApi.update(taskId, { [field]: `${value}T12:00:00Z` });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (error) {
            console.error('Failed to update date:', error);
        }
    };

    return (
        <div className="jira-list-container bg-white border border-[#dfe1e6] rounded-md overflow-x-auto shadow-sm">
            <table className="jira-list-table w-full border-collapse">
                <thead>
                    <tr className="bg-[#fafbfc]">
                        <th className="jira-th jira-th-checkbox border-r border-[#dfe1e6]">
                            <input type="checkbox" checked={selectedTasks.size === tasks.length && tasks.length > 0} onChange={toggleSelectAll} className="jira-checkbox" />
                        </th>
                        <th className="jira-th jira-th-type border-r border-[#dfe1e6]">Type</th>
                        <th className="jira-th jira-th-summary border-r border-[#dfe1e6]">Summary</th>
                        <th className="jira-th jira-th-status border-r border-[#dfe1e6]">Status</th>
                        <th className="jira-th jira-th-assignee border-r border-[#dfe1e6]">Assignee</th>
                        <th className="jira-th jira-th-date border-r border-[#dfe1e6]">Due date</th>
                        <th className="jira-th jira-th-duration border-r border-[#dfe1e6]">Duration Tim</th>
                        <th className="jira-th jira-th-priority border-r border-[#dfe1e6]">Priority</th>
                        <th className="jira-th jira-th-comments border-r border-[#dfe1e6]">Comments</th>
                        <th className="jira-th jira-th-labels border-r border-[#dfe1e6]">Labels</th>
                        <th className="jira-th jira-th-created border-r border-[#dfe1e6]">Created</th>
                        <th className="jira-th jira-th-updated">Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => {
                        const isSelected = selectedTasks.has(task.id);
                        const statusConfig = getStatusConfig(task.status);

                        return (
                            <tr key={task.id} className={`jira-table-row group ${isSelected ? 'jira-row-selected' : ''}`} onClick={() => onTaskClick(task)}>
                                <td className="jira-td jira-td-checkbox border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelectTask(task.id, e)} className="jira-checkbox" />
                                    </div>
                                </td>
                                <td className="jira-td jira-td-type border-r border-[#f4f5f7]">
                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                        <CheckSquare className="w-4 h-4 text-blue-600" />
                                        <button
                                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent p-0 flex items-center justify-center"
                                            title="Create subtask"
                                        >
                                            <Plus className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                        </button>
                                    </div>
                                </td>
                                <td className="jira-td jira-td-summary border-r border-[#f4f5f7]">
                                    <span className="jira-summary truncate block max-w-[300px]">{task.heading}</span>
                                </td>
                                <td className="jira-td jira-td-status border-r border-[#f4f5f7]">
                                    <span className={`jira-status-badge ${statusConfig.bg} ${statusConfig.text}`}>
                                        {statusConfig.label}
                                    </span>
                                </td>
                                <td className="jira-td jira-td-assignee border-r border-[#f4f5f7]">
                                    <div className="flex -space-x-1.5">
                                        {task.assigned_to_user_details.slice(0, 3).map((u) => (
                                            <div key={u.id} className="jira-avatar ring-1 ring-white" title={`${u.first_name} ${u.last_name}`}>
                                                {u.first_name[0]}{u.last_name[0]}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="jira-td jira-td-date border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    <div className="jira-date-display border rounded px-1.5 py-1 bg-white hover:border-blue-400">
                                        <input
                                            type="date"
                                            defaultValue={task.end_date?.split('T')[0] || ''}
                                            onBlur={(e) => handleDateChange(task.id, 'end_date', e.target.value, e as any)}
                                            className="jira-date-input"
                                        />
                                    </div>
                                </td>
                                <td className="jira-td jira-td-duration border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        defaultValue={(task as any).duration || ''}
                                        placeholder="—"
                                        onBlur={async (e) => {
                                            const val = e.target.value;
                                            try {
                                                await taskApi.update(task.id, { duration: val } as any);
                                                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                                            } catch (err) {
                                                console.error('Failed to update duration:', err);
                                            }
                                        }}
                                        className="w-full bg-transparent border-none text-[12px] focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 placeholder-gray-300"
                                    />
                                </td>
                                <td className="jira-td jira-td-priority border-r border-[#f4f5f7] relative" onClick={e => e.stopPropagation()}>
                                    <div
                                        className="flex items-center gap-1.5 text-gray-600 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                        onClick={() => setActivePriorityId(activePriorityId === task.id ? null : task.id)}
                                    >
                                        <div className={`h-1 w-3 rounded-full ${priorityOptions.find(opt => opt.value === task.priority)?.dotColor || 'bg-gray-400'}`} />
                                        <span className="capitalize text-[12px]">{task.priority}</span>
                                    </div>

                                    {activePriorityId === task.id && (
                                        <div className="absolute z-50 mt-1 left-0 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                            {priorityOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-[12px] flex items-center gap-2"
                                                    onClick={() => handlePriorityChange(task.id, option.value)}
                                                >
                                                    <span>{option.icon}</span>
                                                    <span className={task.priority === option.value ? "font-bold text-blue-600" : ""}>
                                                        {option.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="jira-td jira-td-comments border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    {activeCommentId === task.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCommentSubmit(task.id);
                                                    if (e.key === 'Escape') setActiveCommentId(null);
                                                }}
                                                onBlur={() => !commentText && setActiveCommentId(null)}
                                                placeholder="Press Enter to save..."
                                                className="w-full px-2 py-1 text-[12px] border border-blue-500 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="jira-comment-btn flex items-center gap-1.5 cursor-pointer opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-all"
                                            onClick={() => setActiveCommentId(task.id)}
                                        >
                                            <ListTodo className="w-3.5 h-3.5 text-gray-500" />
                                            <span className="text-[11px] text-gray-600">Add comment</span>
                                        </div>
                                    )}
                                </td>
                                <td className="jira-td jira-td-labels border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    <input type="text" placeholder="" className="bg-transparent border-none text-[12px] focus:ring-0 w-full p-0" />
                                </td>
                                <td className="jira-td jira-td-created border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                    <div className="jira-date-display border rounded px-1.5 py-1 bg-white hover:border-blue-400 flex items-center gap-1">
                                        <span className="text-[11px] text-[#172b4d] font-medium py-0.5">
                                            {formatDate(task.start_date)}
                                        </span>
                                    </div>
                                </td>
                                <td className="jira-td jira-td-updated" onClick={e => e.stopPropagation()}>
                                    <div className="jira-date-display border rounded px-1.5 py-1 bg-white hover:border-blue-400 flex items-center gap-1">
                                        <input
                                            type="date"
                                            defaultValue={task.end_date?.split('T')[0] || ''}
                                            onBlur={(e) => handleDateChange(task.id, 'end_date', e.target.value, e as any)}
                                            className="jira-date-input"
                                        />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div
                className="p-3 border-t border-[#dfe1e6] bg-white group cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/taskboard/create')} //
            >
                <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium pl-1">
                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    <span className="group-hover:text-blue-600 transition-colors">Create</span>
                </div>
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
    const [showAITaskModal, setShowAITaskModal] = useState(false);

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

    const handleAITaskGenerate = useCallback(async (projectId: number, description: string) => {
        console.log('Generating AI task for project:', projectId, 'with description:', description);
    }, [queryClient]);

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
                                        <>
                                            <button
                                                onClick={() => navigate('/taskboard/create')}
                                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add New
                                            </button>

                                            <button
                                                onClick={() => setShowAITaskModal(true)}
                                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg"
                                            >
                                                Generate Task by AI
                                            </button>
                                        </>
                                    )}

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
                                    <div key={s.label} className="p-4 rounded-lg bg-white shadow-sm text-center stat-card border border-[#d0d5dd]">
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
                        {viewMode === 'grid' ? (
                            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredTasks.map((t: Task) => <TaskCard key={t.id} task={t} onTaskClick={handleTaskClick} />)}
                            </div>
                        ) : (
                            <TaskListView tasks={filteredTasks} onTaskClick={handleTaskClick} />
                        )}
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

            {showAITaskModal && (
                <AITask
                    onClose={() => setShowAITaskModal(false)}
                    onGenerate={handleAITaskGenerate}
                />
            )}
        </div>
    );
};