import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckSquare,
    Calendar,
    Clock,
    Plus,
    Grid3X3,
    List,
    Search,
    Users,
    AlertCircle,
    CheckCircle,
    PlayCircle,
    Pause,
    ArrowLeft,
    Bell,
    X,
    Trash2,
    Save,
    User as UserIcon,
    Edit3,
    Loader2,
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi } from '@/services/api';
import './MyTask.scss';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Task {
    id: number;
    heading: string;
    description: string;
    start_date: string;
    end_date: string;
    priority: string;
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
    status: 'pending' | 'in_progress' | 'completed' | 'deployed' | 'deferred' | string;
}

// Utility to format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
};

// Utility to get status colors
const getStatusConfig = (status: Task['status']) => {
    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
        case 'PENDING':
            return {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-300',
                badge: 'bg-yellow-500',
                cardClass: 'card-yellow',
                label: 'PENDING',
                icon: Clock
            };
        case 'IN_PROGRESS':
            return {
                bg: 'bg-blue-100 dark:bg-blue-900/20',
                text: 'text-blue-800 dark:text-blue-300',
                badge: 'bg-blue-500',
                cardClass: 'card-blue',
                label: 'IN PROGRESS',
                icon: PlayCircle
            };
        case 'COMPLETED':
            return {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-300',
                badge: 'bg-green-500',
                cardClass: 'card-green',
                label: 'COMPLETED',
                icon: CheckCircle
            };
        case 'DEPLOYED':
            return {
                bg: 'bg-purple-100 dark:bg-purple-900/20',
                text: 'text-purple-800 dark:text-purple-300',
                badge: 'bg-purple-500',
                cardClass: 'card-purple',
                label: 'DEPLOYED',
                icon: CheckSquare
            };
        case 'DEFERRED':
            return {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-800 dark:text-gray-300',
                badge: 'bg-gray-500',
                cardClass: 'card-light-green',
                label: 'DEFERRED',
                icon: Pause
            };
        default:
            return {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-800 dark:text-gray-300',
                badge: 'bg-gray-500',
                cardClass: 'card-gray',
                label: normalizedStatus,
                icon: AlertCircle
            };
    }
};

interface TaskCardProps {
    task: Task;
    onTaskClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick }) => {
    const statusConfig = getStatusConfig(task.status);

    return (
        <div
            onClick={() => onTaskClick(task)}
            className={`
        ${statusConfig.cardClass} rounded-xl p-4 transition-all duration-300 cursor-pointer text-gray-800
        hover:shadow-lg hover:-translate-y-0.5 border border-gray-100
      `}
        >
            <div className="flex items-start justify-between mb-2">
                {/* Status Badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.badge} text-white`}>
                    {statusConfig.label}
                </span>
            </div>

            <h3 className={`text-md font-bold mt-2 mb-1`}>
                {task.heading}
            </h3>

            <p className={`text-sm mb-4 text-gray-600`}>
                {task.description}
            </p>

            <div className="space-y-1 text-xs">
                <div className={`flex items-center text-gray-500`}>
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="font-medium">Start Date:</span>
                    <span className="ml-1">{formatDate(task.start_date)}</span>
                </div>
                <div className={`flex items-center text-gray-500`}>
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="font-medium">End Date:</span>
                    <span className="ml-1">{formatDate(task.end_date)}</span>
                </div>
                <div className={`flex items-center text-gray-500`}>
                    <Users className="w-3 h-3 mr-1" />
                    <span className="font-medium">Assigned to:</span>
                    <span className="ml-1">{task.assigned_to.length} member(s)</span>
                </div>
            </div>
        </div>
    );
};

// --- Task Detail Modal Component ---
interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onDelete: (id: number) => Promise<void>;
    onTaskUpdated: (updatedTask: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onDelete, onTaskUpdated }) => {
    const [selectedStatus, setSelectedStatus] = useState<Task['status']>(task.status);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const queryClient = useQueryClient();
    const updateTaskMutation = useMutation({
        mutationFn: (newStatus: Task['status']) => taskApi.update(task.id, { status: newStatus }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onTaskUpdated(data);
            setIsEditingStatus(false);
            window.location.href = "/taskboard";
        },

        onError: (error) => {
            console.error('Failed to update task status:', error);
            alert('Failed to update task status. Check console for details.');
        },
    });
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        setSelectedStatus(task.status);
        setIsEditingStatus(false);
    }, [task.status]);


    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            if (!updateTaskMutation.isPending) {
                onClose();
            }
        }
    };

    const handleSaveStatus = () => {
        if (selectedStatus !== task.status) {
            updateTaskMutation.mutate(selectedStatus);
        } else {
            setIsEditingStatus(false);
        }
    };

    const handleCancelEdit = () => {
        setSelectedStatus(task.status);
        setIsEditingStatus(false);
    };

    const StatusOption = ({ status, icon: Icon, label }: { status: Task['status'], icon: React.ElementType, label: string }) => {
        const isSelected = selectedStatus === status;
        const config = getStatusConfig(status);

        return (
            <div
                className={`
                    flex items-center p-3 rounded-lg border cursor-pointer transition-all
                    ${isSelected
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50'
                    }
                    ${updateTaskMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                onClick={() => !updateTaskMutation.isPending && setSelectedStatus(status)}
            >
                {/* Dynamically apply icon color based on status config or selection */}
                <Icon className={`w-5 h-5 mr-3 ${config.text}`} />
                <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
                {isSelected && <CheckSquare className="w-4 h-4 text-purple-600" />}
            </div>
        );
    };

    const statusOptions: Array<{ status: Task['status'], icon: React.ElementType, label: string }> = [
        { status: 'pending', icon: Clock, label: 'Pending' },
        { status: 'in_progress', icon: PlayCircle, label: 'In Progress' },
        { status: 'completed', icon: CheckCircle, label: 'Completed' },
        { status: 'deployed', icon: CheckSquare, label: 'Deployed' },
        { status: 'deferred', icon: Pause, label: 'Deferred' },
    ];

    const deleteMutation = useMutation({
        mutationFn: (taskId: number) => onDelete(taskId),
        onSuccess: () => {
            setShowDeleteConfirm(false);
        },
        onError: (error) => {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task.');
        }
    });


    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };


    const currentStatusConfig = getStatusConfig(task.status);
    const isSaving = updateTaskMutation.isPending;
    const isStatusChanged = selectedStatus !== task.status;


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all overflow-hidden"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="flex items-center">
                        <Edit3 className="w-6 h-6 mr-3 text-purple-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            {task.heading}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete Task"
                            disabled={isSaving}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                            title="Close"
                            disabled={isSaving}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
                    {/* Description Section */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-2">Description</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
                    </section>

                    {/* Dates Section */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg flex items-center shadow-sm">
                            <Calendar className="w-5 h-5 mr-3 text-green-500" />
                            <div>
                                <p className="text-xs font-medium text-gray-500">Start Date</p>
                                <p className="font-semibold text-sm">{formatDate(task.start_date)}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg flex items-center shadow-sm">
                            <Calendar className="w-5 h-5 mr-3 text-red-500" />
                            <div>
                                <p className="text-xs font-medium text-gray-500">End Date</p>
                                <p className="font-semibold text-sm">{formatDate(task.end_date)}</p>
                            </div>
                        </div>
                    </section>

                    {/* Assigned Members Section */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-purple-600" />
                            Assigned Members ({task.assigned_to_user_details.length})
                        </h3>
                        <div className="space-y-2">
                            {task.assigned_to_user_details.map(user => (
                                <div key={user.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <UserIcon className="w-6 h-6 mr-3 text-blue-500 bg-blue-50 p-1 rounded-full" />
                                    <span className="font-medium text-sm text-gray-800">
                                        @{user.username}
                                    </span>
                                    <span className="ml-auto text-xs text-gray-500">
                                        {user.first_name} {user.last_name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Status Update Section */}
                    <section className="space-y-4">
                        <div className='flex items-center justify-between border-b pb-2'>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Status
                            </h3>
                            {!isEditingStatus ? (
                                <button
                                    onClick={() => setIsEditingStatus(true)}
                                    className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    <Edit3 className="w-4 h-4 mr-2" /> Edit
                                </button>
                            ) : (
                                <div className='flex gap-2'>
                                    <button
                                        onClick={handleSaveStatus}
                                        disabled={isSaving || !isStatusChanged}
                                        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-md 
                                            ${(isSaving || !isStatusChanged)
                                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" /> Save
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-md"
                                    >
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {!isEditingStatus ? (
                            <div className="p-2">
                                <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold status-badge ${currentStatusConfig.badge} text-white shadow-md`}>
                                    {React.createElement(currentStatusConfig.icon, { className: 'w-4 h-4 mr-2' })}
                                    {currentStatusConfig.label}
                                </span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {statusOptions.map(opt => (
                                    <StatusOption key={opt.status} {...opt} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
            {/* ✅ PASTE CONFIRMATION MODAL HERE */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Delete Task
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <b>{task.heading}</b>?
                            This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
                            >
                                No
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(task.id)}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


interface MyTaskProps { }

export const MyTask: React.FC<MyTaskProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const CREATION_ALLOWED_ROLES = ['admin', 'manager', 'annotator'];
    const isCreationAllowed = !!(user?.role && CREATION_ALLOWED_ROLES.includes(user.role));
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const pathParts = location.pathname.split('/').filter(p => p);
    const pathFilter = pathParts.length > 1 && pathParts[1].toUpperCase() !== 'CREATE' ? pathParts[1].toUpperCase() : 'ALL';
    const activeFilter = pathFilter; 

    // Function to fetch tasks data
    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await taskApi.list();
            if (data && Array.isArray(data.tasks)) {
                setTasks(data.tasks);
            } else if (data && Array.isArray(data.results)) {
                setTasks(data.results);
            } else {
                console.error("API response for tasks was unexpected:", data);
                setTasks([]);
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // useEffect to fetch tasks data on component mount or user change
    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user, fetchTasks]);


    // Handler to open the modal
    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    // Handler to close the modal
    const handleCloseTaskDetail = useCallback(() => {
        setSelectedTask(null);
    }, []);

    // Handler to update the selected task locally after a successful API call and keep the modal open
    const handleSelectedTaskUpdate = useCallback((updatedTask: Task) => {
        setTasks(prevTasks =>
            prevTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
        );
        setSelectedTask(updatedTask);
        setTimeout(() => fetchTasks(), 100);
    }, [fetchTasks]);


    // Handler to delete a task (Placeholder)
    const handleDeleteTask = useCallback(async (id: number) => {
        try {
            await taskApi.delete(id);
            setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
            setSelectedTask(null);
            console.log(`Task ${id} deleted successfully`);
        } catch (error) {
            console.error(`Failed to delete task with ID: ${id}`, error);
            throw error;
        }
    }, []);



    const handleAddNewTaskClick = () => {
        navigate('/taskboard/create');
    };


    const filteredTasks = tasks.filter(task => {
        const matchesFilter = activeFilter === 'ALL' || task.status.toUpperCase() === activeFilter.toUpperCase();
        const matchesSearch = searchQuery.trim() === '' || task.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getTaskStats = () => {
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
            pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
            inProgress: tasks.filter(t => t.status.toLowerCase() === 'in_progress').length,
            deployed: tasks.filter(t => t.status.toLowerCase() === 'deployed').length,
            deferred: tasks.filter(t => t.status.toLowerCase() === 'deferred').length,
        };
        return stats;
    };

    const stats = getTaskStats();

    return (
        <div className="task-main-content-area w-full"> 
            {/* Main Content Area */}
            {location.pathname.startsWith('/taskboard') && !location.pathname.endsWith('/create') ? (
                    loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            <p className="ml-3 text-gray-600">Loading tasks...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900">
                                            Task Board
                                        </h1>
                                        <p className="text-lg text-gray-600 mt-2">
                                            Manage and track your tasks efficiently
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* ADD: Add New Task button to the main Task Board view */}
                                        {isCreationAllowed && (
                                            <button
                                                onClick={handleAddNewTaskClick}
                                                className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add New
                                            </button>
                                        )}
                                        <button
                                            className="p-2 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                                        >
                                            <Bell className="w-5 h-5" />
                                        </button>
                                        <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            {activeFilter.charAt(0) + activeFilter.slice(1).toLowerCase()} Tasks ({filteredTasks.length})
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-6 gap-4 mb-6 stat-cards-container">
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                                        <div className="text-sm text-gray-600">Total</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                        <div className="text-sm text-gray-600">Completed</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                        <div className="text-sm text-gray-600">Pending</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                                        <div className="text-sm text-gray-600">In Progress</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-purple-600">{stats.deployed}</div>
                                        <div className="text-sm text-gray-600">Deployed</div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white shadow-sm flex flex-col justify-center items-center stat-card">
                                        <div className="text-2xl font-bold text-gray-600">{stats.deferred}</div>
                                        <div className="text-sm text-gray-600">Deferred</div>
                                    </div>
                                </div>

                               {/* Search and Controls */}
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                                        <input
                                            type="text"
                                            placeholder="Search tasks..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2 rounded-lg border bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center rounded-lg border border-gray-300 overflow-hidden`}>
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                <Grid3X3 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                <List className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Task Grid/List */}
                            {filteredTasks.length === 0 ? (
                                <div className="text-center py-16 text-gray-500">
                                    <List className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-medium mb-2">No tasks found</h3>
                                    <p>Try adjusting your filters or <span onClick={handleAddNewTaskClick} className="text-blue-600 cursor-pointer">create a new task</span>.</p>
                                </div>
                            ) : (
                                <div className={`grid gap-6 ${viewMode === 'grid'
                                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                    : 'grid-cols-1'
                                    }`}>
                                    {filteredTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onTaskClick={handleTaskClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <Outlet />
                )}

            {/* Task Detail Modal */}
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