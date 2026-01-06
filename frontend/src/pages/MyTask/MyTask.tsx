import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckSquare, Calendar, Clock, Plus, Grid3X3, List, Search, Users, AlertCircle, CheckCircle, PlayCircle, Pause, Bell, X, Trash2, Save, User as UserIcon, Edit3, Loader2, ListTodo, ChevronDown, ChevronUp, FileText, Download, Send
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi, usersApi } from '@/services/api';
import { TaskComment } from '@/types';
import './MyTask.scss';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    status: 'pending' | 'backlog' | 'in_progress' | 'completed' | 'deployed' | 'deferred' | string;
    attachments?: Array<{
        id: number;
        file_url: string;
        file_name: string;
        uploaded_at: string;

    }>;
}

//Format date to DD/MM/YYYY
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
                bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-300',
                badge: 'bg-yellow-500',
                cardClass: 'card-pending',
                label: 'PENDING',
                icon: Clock
            };
        case 'BACKLOG':
            return {
                bg: 'bg-orange-50 dark:bg-orange-900/20',
                text: 'text-orange-800 dark:text-orange-300',
                badge: 'bg-orange-500',
                cardClass: 'card-backlog',
                label: 'BACKLOG',
                icon: ListTodo
            };
        case 'IN_PROGRESS':
            return {
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                text: 'text-blue-800 dark:text-blue-300',
                badge: 'bg-blue-500',
                cardClass: 'card-in-progress',
                label: 'IN PROGRESS',
                icon: PlayCircle
            };
        case 'COMPLETED':
            return {
                bg: 'bg-green-50 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-300',
                badge: 'bg-green-500',
                cardClass: 'card-completed',
                label: 'COMPLETED',
                icon: CheckCircle
            };
        case 'DEPLOYED':
            return {
                bg: 'bg-purple-50 dark:bg-purple-900/20',
                text: 'text-purple-800 dark:text-purple-300',
                badge: 'bg-purple-500',
                cardClass: 'card-deployed',
                label: 'DEPLOYED',
                icon: CheckSquare
            };
        case 'DEFERRED':
            return {
                bg: 'bg-gray-50 dark:bg-gray-800',
                text: 'text-gray-800 dark:text-gray-300',
                badge: 'bg-gray-500',
                cardClass: 'card-deferred',
                label: 'DEFERRED',
                icon: Pause
            };
        default:
            return {
                bg: 'bg-gray-50 dark:bg-gray-800',
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

            <div
                className={`text-sm mb-4 text-gray-600 task-description-preview`}
                dangerouslySetInnerHTML={{ __html: task.description }}
                style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    maxHeight: '4.5em'
                }}
            />

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
    const { user } = useAuth();
    const [selectedStatus, setSelectedStatus] = useState<Task['status']>(task.status);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);
    const [documentsOpen, setDocumentsOpen] = useState(false);
    const [showAddDocuments, setShowAddDocuments] = useState(false);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const [showDocumentsSection, setShowDocumentsSection] = useState(false);
    const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false);
    const [newUsers, setNewUsers] = useState<number[]>([]);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [newDocuments, setNewDocuments] = useState<File[]>([]);
    const [newComment, setNewComment] = useState('');
    const [showAddUserDropdown, setShowAddUserDropdown] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: number, username: string, first_name: string, last_name: string }>>([]);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const queryClient = useQueryClient();
    const updateTaskMutation = useMutation({
        mutationFn: (updates: any) => taskApi.update(task.id, updates),
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

    // Fetch comments using React Query instead of useEffect + useState
    const { data: commentsData, isLoading: loadingComments } = useQuery({
        queryKey: ['task-comments', task.id],
        queryFn: () => taskApi.getComments(task.id),
        enabled: !!task.id,
        refetchInterval: 10000,
    });

    const comments = React.useMemo(() => {
        if (!commentsData) return [];
        if (Array.isArray(commentsData)) return commentsData;
        if (commentsData.results && Array.isArray(commentsData.results)) return commentsData.results;
        return [];
    }, [commentsData]);

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

    // Fetch available users for Add User dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await usersApi.listAll();
                setAvailableUsers(users);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    // Track unsaved changes
    useEffect(() => {
        const statusChanged = selectedStatus !== task.status;
        const usersChanged = newUsers.length > 0;
        const docsChanged = newDocuments.length > 0;
        setHasUnsavedChanges(statusChanged || usersChanged || docsChanged);
    }, [selectedStatus, task.status, newUsers.length, newDocuments.length]);


    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            if (!updateTaskMutation.isPending) {
                onClose();
            }
        }
    };

    const handleSaveStatus = async () => {
        try {
            const updates: any = {};
            if (selectedStatus !== task.status) {
                updates.status = selectedStatus;
            }
            if (newUsers.length > 0) {
                updates.assigned_to = [...task.assigned_to, ...newUsers];
            }
            if (Object.keys(updates).length === 0) {
                setIsEditingStatus(false);
                return;
            }
            updateTaskMutation.mutate(updates);
            setNewUsers([]);
            setHasUnsavedChanges(false);

        } catch (error) {
            console.error('Error saving task:', error);
            alert('Failed to save changes. Please try again.');
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
        { status: 'backlog', icon: ListTodo, label: 'Backlog' },
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewDocuments(prev => [...prev, ...files]);
        }
    };

    const handleRemoveNewDoc = (index: number) => {
        setNewDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadDocuments = async () => {
        if (newDocuments.length === 0) return;

        setUploadingDocs(true);
        try {

            console.log('Uploading documents:', newDocuments);
            await new Promise(resolve => setTimeout(resolve, 1500));

            setNewDocuments([]);
            setShowAddDocuments(false);
            alert('Documents uploaded successfully!');
        } catch (error) {
            console.error('Failed to upload documents:', error);
            alert('Failed to upload documents. Please try again.');
        } finally {
            setUploadingDocs(false);
        }
    };

    // Add mutation for creating comments
    const addCommentMutation = useMutation({
        mutationFn: (content: string) => taskApi.addComment(task.id, { content }),
        onSuccess: (newComment) => {
            queryClient.setQueryData<TaskComment[]>(['task-comments', task.id], (old) => {
                const currentComments = Array.isArray(old) ? old : [];
                return [...currentComments, newComment];
            });
            setNewComment('');
            queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
        },
        onError: (error) => {
            console.error('Failed to save comment:', error);
            alert('Failed to save comment. Please try again.');
        },
    });

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        addCommentMutation.mutate(newComment.trim());
    };

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
                            onClick={handleSaveStatus}
                            disabled={isSaving || !hasUnsavedChanges}
                            className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-md ${isSaving || !hasUnsavedChanges
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            title="Save Changes"
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
                        <div
                            className="text-sm text-gray-600 task-description-content"
                            dangerouslySetInnerHTML={{ __html: task.description }}
                        />
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

                    {/* Assigned Members & Status Grid */}
                    <section className="grid grid-cols-2 gap-6">
                        {/* Assigned Members Dropdown */}
                        <div className="space-y-3">
                            <button
                                onClick={() => setAssignedMembersOpen(!assignedMembersOpen)}
                                className="w-full text-left"
                            >
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center justify-between hover:text-purple-600 transition-colors">
                                    <div className="flex items-center">
                                        <Users className="w-5 h-5 mr-2 text-purple-600" />
                                        Assigned Members ({task.assigned_to_user_details.length + newUsers.length})
                                    </div>
                                    {assignedMembersOpen ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                </h3>
                            </button>

                            {assignedMembersOpen && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <div className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 flex flex-wrap gap-2 min-h-[50px]">
                                        {/* Existing assigned users */}
                                        {task.assigned_to_user_details.map(user => (
                                            <span
                                                key={user.id}
                                                className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md flex items-center gap-2 text-sm font-medium"
                                            >
                                                <UserIcon className="w-4 h-4" />
                                                {user.first_name} {user.last_name}
                                            </span>
                                        ))}

                                        {/* Newly added users */}
                                        {newUsers.map(userId => {
                                            const user = availableUsers.find(u => u.id === userId);
                                            if (!user) return null;
                                            return (
                                                <span
                                                    key={userId}
                                                    className="px-3 py-1.5 bg-green-100 text-green-800 rounded-md flex items-center gap-2 text-sm font-medium"
                                                >
                                                    <UserIcon className="w-4 h-4" />
                                                    {user.first_name} {user.last_name}
                                                    <button
                                                        type="button"
                                                        className="text-green-600 hover:text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNewUsers(newUsers.filter(id => id !== userId));
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Dropdown */}
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className="w-full text-left"
                            >
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center justify-between hover:text-blue-600 transition-colors">
                                    <div className="flex items-center">
                                        <ListTodo className="w-5 h-5 mr-2 text-blue-600" />
                                        Status
                                    </div>
                                    {showStatusDropdown ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                </h3>
                            </button>

                            {showStatusDropdown && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <div className="relative">
                                        <div className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 cursor-pointer">
                                            <div className="flex items-center">
                                                {React.createElement(getStatusConfig(selectedStatus).icon, {
                                                    className: `w-5 h-5 mr-3 ${getStatusConfig(selectedStatus).text}`
                                                })}
                                                <span className="text-sm font-medium text-gray-700">
                                                    {getStatusConfig(selectedStatus).label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Options Dropdown */}
                                        <div className="mt-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                            {statusOptions.map(opt => {
                                                const isSelected = selectedStatus === opt.status;
                                                const config = getStatusConfig(opt.status);

                                                return (
                                                    <div
                                                        key={opt.status}
                                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0 ${isSelected ? 'bg-blue-50' : ''
                                                            } ${updateTaskMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                        onClick={() => {
                                                            if (!updateTaskMutation.isPending) {
                                                                setSelectedStatus(opt.status);
                                                                setHasUnsavedChanges(true);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center">
                                                            {React.createElement(opt.icon, { className: `w-5 h-5 mr-3 ${config.text}` })}
                                                            <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                                        </div>
                                                        {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                    {/* Add Documents Section */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Documents
                            </h3>
                            <button
                                onClick={() => setShowDocumentsDropdown(!showDocumentsDropdown)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showDocumentsDropdown ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Documents Dropdown */}
                        {showDocumentsDropdown && (
                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                {/* Upload New Documents */}
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowAddDocuments(!showAddDocuments)}
                                        className="w-full flex items-center justify-center p-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:border-blue-400 transition-all group"
                                    >
                                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium">Upload Documents</span>
                                    </button>

                                    {/* Upload UI */}
                                    {showAddDocuments && (
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                            {/* File Input */}
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileSelect}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    accept=".pdf,image/*,.ppt,.pptx,.xml,.json,.html"
                                                    disabled={uploadingDocs}
                                                />
                                                <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                                                    <FileText className="w-5 h-5 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-600">
                                                        Click or drag files here
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Selected Files Preview */}
                                            {newDocuments.length > 0 && (
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {newDocuments.map((file, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-xs"
                                                        >
                                                            <div className="flex items-center min-w-0 flex-1">
                                                                <FileText className="w-3 h-3 text-blue-500 mr-2 flex-shrink-0" />
                                                                <span className="truncate font-medium text-gray-700">
                                                                    {file.name}
                                                                </span>
                                                                <span className="ml-2 text-gray-400 flex-shrink-0">
                                                                    {(file.size / 1024 / 1024).toFixed(1)}MB
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveNewDoc(index)}
                                                                className="ml-2 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                                                                disabled={uploadingDocs}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleUploadDocuments}
                                                    disabled={newDocuments.length === 0 || uploadingDocs}
                                                    className={`flex-1 flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${newDocuments.length === 0 || uploadingDocs
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {uploadingDocs ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-3 h-3 mr-1 rotate-180" />
                                                            Upload ({newDocuments.length})
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowAddDocuments(false);
                                                        setNewDocuments([]);
                                                    }}
                                                    disabled={uploadingDocs}
                                                    className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Documents List */}
                                {task.attachments && task.attachments.length > 0 ? (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-600 px-1">Uploaded Documents</p>
                                        {task.attachments.map(doc => (
                                            <div
                                                key={doc.id}
                                                onClick={() => {
                                                    if (doc.file_url) {
                                                        window.open(doc.file_url, '_blank');
                                                    } else {
                                                        alert("File URL is missing or expired.");
                                                    }
                                                }}
                                                className="flex items-center p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                                            >
                                                <div className="p-1.5 bg-blue-50 rounded mr-2.5 group-hover:bg-blue-100 transition-colors">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-xs text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                                        {doc?.file_name || (doc?.file_url?.split('/')?.pop()?.split('?')?.[0]) || 'Unnamed File'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Click to view document
                                                    </p>
                                                </div>
                                                <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 text-center text-gray-500 text-xs bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        No documents attached to this task
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                    {/* Comments Section */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center">
                            <Send className="w-5 h-5 mr-2 text-green-600" />
                            Comments ({comments.length})
                        </h3>

                        {/* Comments List */}
                        <div className="max-h-64 overflow-y-auto space-y-3 bg-gray-50 rounded-lg p-4">
                            {loadingComments ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                                    <span className="text-sm text-gray-600">Loading comments...</span>
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                            ) : (
                                comments.map((comment: TaskComment) => (
                                    <div key={comment.id} className="bg-white rounded-lg p-3 shadow-sm">
                                        <div className="flex items-start justify-between mb-1">
                                            <span className="font-semibold text-sm text-gray-800">
                                                {comment.user_details.first_name || comment.user_details.username}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddComment();
                                    }
                                }}
                                placeholder="Type a comment..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={addCommentMutation.isPending || !newComment.trim()}
                                className={`px-4 py-2 rounded-lg transition-colors flex items-center ${addCommentMutation.isPending || !newComment.trim()
                                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {addCommentMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Add User Button */}
                    <div className="flex justify-start pt-4 border-t">
                        <div className="relative">
                            <button
                                onClick={() => setShowAddUserDropdown(!showAddUserDropdown)}
                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add User
                            </button>

                            {showAddUserDropdown && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto z-30">
                                    <div className="p-2 border-b bg-gray-50">
                                        <p className="text-xs font-semibold text-gray-700">Select User to Add</p>
                                    </div>
                                    {availableUsers
                                        .filter(user => !task.assigned_to_user_details.some(assigned => assigned.id === user.id))
                                        .map(user => (
                                            <div
                                                key={user.id}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center border-b last:border-b-0"
                                                onClick={() => {
                                                    if (!newUsers.includes(user.id)) {
                                                        setNewUsers([...newUsers, user.id]);
                                                    }
                                                    setShowAddUserDropdown(false);
                                                    setHasUnsavedChanges(true);
                                                }}
                                            >
                                                <UserIcon className="w-4 h-4 mr-2 text-blue-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                        ))}
                                    {availableUsers.filter(user => !task.assigned_to_user_details.some(assigned => assigned.id === user.id)).length === 0 && (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                            All users already assigned
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* CONFIRMATION MODAL HERE */}
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
    const queryClient = useQueryClient();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const CREATION_ALLOWED_ROLES = ['admin', 'manager', 'annotator'];
    const isCreationAllowed = !!(user?.role && CREATION_ALLOWED_ROLES.includes(user.role));

    const pathParts = location.pathname.split('/').filter(p => p);
    const activeFilter = pathParts.length > 1 && pathParts[1].toUpperCase() !== 'CREATE' ? pathParts[1].toUpperCase() : 'ALL';

    const { data: tasksData, isLoading: loading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const data = await taskApi.list();
            return data;
        },
        enabled: !!user,
    });

    const tasks = React.useMemo(() => {
        if (!tasksData) return [];
        if (Array.isArray(tasksData)) return tasksData;
        if (Array.isArray(tasksData.tasks)) return tasksData.tasks;
        if (Array.isArray(tasksData.results)) return tasksData.results;
        return [];
    }, [tasksData]);

    // 2.handleAddNewTaskClick
    const handleAddNewTaskClick = useCallback(() => {
        navigate('/taskboard/create');
    }, [navigate]);

    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    const handleCloseTaskDetail = useCallback(() => {
        setSelectedTask(null);
    }, []);

    const handleSelectedTaskUpdate = useCallback((updatedTask: Task) => {
        queryClient.setQueryData<any>(['tasks'], (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.tasks && Array.isArray(oldData.tasks)) {
                return {
                    ...oldData,
                    tasks: oldData.tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t)
                };
            }

            if (Array.isArray(oldData)) {
                return oldData.map((t: any) => t.id === updatedTask.id ? updatedTask : t);
            }

            return oldData;
        });

        setSelectedTask(updatedTask);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }, [queryClient]);

    const handleDeleteTask = useCallback(async (id: number) => {
        try {
            await taskApi.delete(id);
            queryClient.setQueryData(['tasks'], (oldData: any) => {
                if (!oldData) return oldData;
                if (oldData.tasks && Array.isArray(oldData.tasks)) {
                    return {
                        ...oldData,
                        tasks: oldData.tasks.filter((t: any) => t.id !== id)
                    };
                }
                if (Array.isArray(oldData)) {
                    return oldData.filter((t: any) => t.id !== id);
                }

                return oldData;
            });

            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (error) {
            console.error(`Failed to delete task: ${id}`, error);
            throw error;
        }
    }, [queryClient]);

    const filteredTasks = Array.isArray(tasks) ? tasks.filter((task: Task) => {
        const matchesFilter = activeFilter === 'ALL' || task.status.toUpperCase() === activeFilter.toUpperCase();
        const matchesSearch = searchQuery.trim() === '' ||
            task.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    }) : [];

    const getTaskStats = () => {
        const taskArray = Array.isArray(tasks) ? tasks : [];
        return {
            total: taskArray.length,
            completed: taskArray.filter((t: Task) => t.status.toLowerCase() === 'completed').length,
            pending: taskArray.filter((t: Task) => t.status.toLowerCase() === 'pending').length,
            backlog: taskArray.filter((t: Task) => t.status.toLowerCase() === 'backlog').length,
            inProgress: taskArray.filter((t: Task) => t.status.toLowerCase() === 'in_progress').length,
            deployed: taskArray.filter((t: Task) => t.status.toLowerCase() === 'deployed').length,
            deferred: taskArray.filter((t: Task) => t.status.toLowerCase() === 'deferred').length,
        };
    }

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