import React, { useState, useEffect } from 'react';
import {
    X, Trash2, Save, Edit3, Loader2, ChevronDown, FileText, Download, Send, Maximize2, Minimize2,
    Clock, ListTodo, PlayCircle, CheckCircle, CheckSquare, Pause, Calendar, Plus
} from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { taskApi, usersApi, documentsApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Task,  getStatusConfig } from './MyTask';



const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
};


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
    const [showAddDocuments, setShowAddDocuments] = useState(false);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false);
    const [newUsers, setNewUsers] = useState<number[]>([]);
    const [newDocuments, setNewDocuments] = useState<File[]>([]);
    const [newComment, setNewComment] = useState('');
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: number, username: string, first_name: string, last_name: string, role?: string }>>([]);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showAddUsersDropdown, setShowAddUsersDropdown] = useState(false);

    const toggleMaximize = () => setIsMaximized(!isMaximized);
    const queryClient = useQueryClient();

    const updateTaskMutation = useMutation({
        mutationFn: (updates: any) => taskApi.update(task.id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onTaskUpdated(data);
            setIsEditingStatus(false);
            onClose();
        },
        onError: (error) => {
            console.error('Failed to update task status:', error);
            alert('Failed to update task status. Check console for details.');
        },
    });

    const { data: commentsData } = useQuery({
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
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    useEffect(() => {
        setSelectedStatus(task.status);
        setIsEditingStatus(false);
    }, [task.status]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const userResponse = await usersApi.list();
                const users = userResponse.results || userResponse;
                setAvailableUsers(users);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const statusChanged = selectedStatus !== task.status;
        const usersChanged = newUsers.length > 0;
        const docsChanged = newDocuments.length > 0;
        setHasUnsavedChanges(statusChanged || usersChanged || docsChanged);
    }, [selectedStatus, task.status, newUsers.length, newDocuments.length]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !updateTaskMutation.isPending) onClose();
    };

    const handleSaveStatus = async () => {
        try {
            const updates: any = {};
            if (selectedStatus !== task.status) updates.status = selectedStatus;
            if (newUsers.length > 0) updates.assigned_to = [...task.assigned_to, ...newUsers];
            if (Object.keys(updates).length === 0) return;
            updateTaskMutation.mutate(updates);
            setNewUsers([]);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (taskId: number) => onDelete(taskId),
        onSuccess: () => {
            setShowDeleteConfirm(false);
            onClose();
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        setUploadingDocs(true);

        try {
            for (const file of fileArray) {
                const projectIdNum = task.project || (task as any).project_details?.id;

                if (!projectIdNum) {
                    console.error("Project ID missing");
                    continue;
                }

                // Step 1: get-upload-url/
                const uploadUrlResponse = await documentsApi.getUploadUrl(projectIdNum, {
                    file_name: file.name,
                    file_type: file.type || 'application/octet-stream',
                });

                const { url: s3Url, fields: s3Fields, file_key } = uploadUrlResponse;

                // Step 2: (AWS S3 Upload)
                await documentsApi.uploadFileToS3(s3Url, s3Fields, file);

                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                let mappedType = 'other';
                if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) mappedType = 'image';
                else if (ext === 'pdf') mappedType = 'pdf';
                else if (ext === 'json') mappedType = 'json';
                else if (['doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) mappedType = 'document';

                // Step 3: confirm-upload/
                const confirmResponse = await documentsApi.confirmUpload(projectIdNum, {
                    file_key: file_key,
                    file_name: file.name,
                    file_type: mappedType,
                    metadata: {
                        task_id: task.id
                    }
                });

                // Step 4: get-download-url/
                if (confirmResponse && confirmResponse.id) {
                    await documentsApi.getDownloadUrl(projectIdNum, {
                        document_id: confirmResponse.id
                    });
                }
            }

            // Refresh UI state
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });

        } catch (err: any) {
            console.error('Auto-upload failed:', err);
        } finally {
            setUploadingDocs(false);
            setNewDocuments([]);
        }
    };

    // const handleUploadDocuments = async () => {
    //     if (newDocuments.length === 0) return;
    //     setUploadingDocs(true);
    //     try {
    //         await new Promise(resolve => setTimeout(resolve, 1500));
    //         setNewDocuments([]);
    //         setShowAddDocuments(false);
    //         alert('Documents uploaded successfully!');
    //     } finally {
    //         setUploadingDocs(false);
    //     }
    // };

    const addCommentMutation = useMutation({
        mutationFn: (content: string) => taskApi.addComment(task.id, { content }),
        onSuccess: (newCommentData) => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
            setNewComment('');
        },
    });

    const statusOptions: Array<{ status: Task['status'], icon: React.ElementType, label: string }> = [
        { status: 'pending', icon: Clock, label: 'Pending' },
        { status: 'backlog', icon: ListTodo, label: 'Backlog' },
        { status: 'in_progress', icon: PlayCircle, label: 'In Progress' },
        { status: 'completed', icon: CheckCircle, label: 'Completed' },
        { status: 'deployed', icon: CheckSquare, label: 'Deployed' },
        { status: 'deferred', icon: Pause, label: 'Deferred' },
    ];

    const isSaving = updateTaskMutation.isPending;

    return (
        <div
            className={`fixed inset-0 z-50 ${isMaximized ? 'bg-gray-50 flex' : 'flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'}`}
            onClick={handleBackdropClick}
        >
            {isMaximized && (
                <div className="h-screen sticky top-0">
                    <Sidebar />
                </div>
            )}

            <div className={`bg-white shadow-2xl transform transition-all overflow-hidden flex flex-col ${isMaximized ? 'flex-1 h-screen overflow-y-auto rounded-none border-l' : 'rounded-xl w-full max-w-2xl'}`} role="dialog">
                {/* Header */}
                <div className={`${isMaximized ? 'max-w-4xl mx-auto w-full px-6' : 'px-8'} py-5 border-b bg-white flex items-center justify-between sticky top-0 z-20 w-full`}>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-50 rounded-lg"><Edit3 className="w-5 h-5 text-purple-600" /></div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {task.project_details?.name || task.project_name || 'No Project'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleMaximize} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        {(user?.role === 'admin' || task.assigned_by === user?.id) && (
                            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-black rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 ${isMaximized ? 'bg-gray-50 py-6 px-6' : 'overflow-y-auto bg-gray-50/50 max-h-[85vh]'}`}>
                    <div className={`${isMaximized ? 'max-w-4xl mx-auto w-full' : 'p-4'} space-y-3`}>

                        {/* 1. Timeline Div */}
                        <div className="timeline bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-gray-700">
                                        {/* Start Date */}
                                        <span className="flex items-center group cursor-pointer relative">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] text-gray-400 uppercase leading-none mb-1">Start Date</span>
                                                <input
                                                    type="date"
                                                    defaultValue={task.start_date?.split('T')[0]}
                                                    onChange={(e) => {
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer text-gray-700"
                                                />
                                            </div>
                                        </span>

                                        {/* End Date */}
                                        <span className="flex items-center group cursor-pointer relative">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] text-gray-400 uppercase leading-none mb-1">End Date</span>
                                                <input
                                                    type="date"
                                                    defaultValue={task.end_date?.split('T')[0]}
                                                    onChange={(e) => {
                                                        setSelectedStatus(task.status);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer text-gray-700"
                                                />
                                            </div>
                                        </span>

                                        {/* Duration Time */}
                                        <span className="flex items-center group">
                                            <div className="flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 rounded-full mr-2 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                                <Clock className="w-3 h-3" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] text-gray-400 uppercase leading-none mb-1">Duration</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {(task as any).duration || '3 hours'}
                                                </span>
                                            </div>
                                        </span>
                                    </div>
                                </div>

                                {/* Status logic*/}
                                <div className="flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
                                    <label className="text-[12px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Task Status</label>
                                    <button
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                        className={`inline-flex items-center px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:shadow-sm ${getStatusConfig(selectedStatus).bg} ${getStatusConfig(selectedStatus).text}`}
                                    >
                                        {React.createElement(getStatusConfig(selectedStatus).icon, { className: "w-3.5 h-3.5 mr-2" })}
                                        {getStatusConfig(selectedStatus).label}
                                        <ChevronDown className="ml-2 w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            {showStatusDropdown && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 mt-3 border-t border-gray-50">
                                    {statusOptions.map(opt => (
                                        <div key={opt.status} onClick={() => { setSelectedStatus(opt.status); setHasUnsavedChanges(true); }} className={`flex items-center p-2.5 rounded-xl border-2 cursor-pointer ${selectedStatus === opt.status ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'}`}>
                                            {React.createElement(opt.icon, { className: `w-4 h-4 mr-2.5 ${getStatusConfig(opt.status).text}` })}
                                            <span className="text-xs font-bold text-gray-800">{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Description Div */}
                        <div className="description bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <label className="text-[14px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Description</label>
                            <div className="text-sm text-gray-600 leading-relaxed task-description-content" dangerouslySetInnerHTML={{ __html: task.description }} />
                        </div>

                        {/* 3. Project Assignees*/}
                        <div className="project-assignees bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setAssignedMembersOpen(!assignedMembersOpen)}>
                                <label className="text-[14px] font-bold uppercase tracking-widest text-gray-400">Assignees</label>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${assignedMembersOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {assignedMembersOpen && (
                                <div className="flex flex-col gap-2">
                                    {/* Current Assignees Display */}
                                    <div className="space-y-1.5">
                                        {task.assigned_to_user_details.map(u => (
                                            <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                                                        {u.first_name[0]}{u.last_name[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-900">{u.first_name} {u.last_name}</span>
                                                        <span className="text-[10px] text-gray-500">{u.role || 'Member'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/*Added Users*/}
                                        {newUsers.map(userId => {
                                            const u = availableUsers.find(au => au.id === userId);
                                            return u && (
                                                <div key={userId} className="flex items-center justify-between p-2 bg-green-50/50 rounded-lg border border-green-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">{u.first_name[0]}</div>
                                                        <span className="text-xs font-bold text-green-800">{u.first_name} (Adding...)</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNewUsers(newUsers.filter(id => id !== userId));
                                                            setHasUnsavedChanges(newUsers.filter(id => id !== userId).length > 0 || selectedStatus !== task.status);
                                                        }}
                                                        className="text-green-600 p-1 hover:bg-green-100 rounded-full"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Add Assignee Dropdown */}
                                        <div className="relative">
                                            <div
                                                className="w-full p-2 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex items-center justify-between min-h-[38px] transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowAddUsersDropdown(!showAddUsersDropdown);
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                                                    <span className="text-sm text-gray-700 font-medium">Add Assignee</span>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>

                                            {/* Dropdown List */}
                                            {showAddUsersDropdown && (
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {availableUsers
                                                        .filter(u => !task.assigned_to_user_details.some(a => a.id === u.id) && !newUsers.includes(u.id))
                                                        .map((user) => (
                                                            <div
                                                                key={user.id}
                                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm flex items-center justify-between"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setNewUsers([...newUsers, user.id]);
                                                                    setHasUnsavedChanges(true);
                                                                    setShowAddUsersDropdown(false);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                                        {user.first_name[0]}{user.last_name?.[0] || ''}
                                                                    </div>
                                                                    <span className="text-sm">{user.first_name} {user.last_name}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {availableUsers.filter(u => !task.assigned_to_user_details.some(a => a.id === u.id) && !newUsers.includes(u.id)).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No more users to add
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Documents */}
                        <div className="documents bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <label className="text-sm font-bold text-gray-700 block mb-4">Attachment</label>

                            {/* Dropzone with auto-trigger */}
                            <div className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${uploadingDocs ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50/30 border-gray-200 hover:bg-gray-50 hover:border-gray-300'} group`}>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    disabled={uploadingDocs}
                                    className={`absolute inset-0 opacity-0 ${uploadingDocs ? 'cursor-not-allowed' : 'cursor-pointer'} z-10`}
                                />
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        {uploadingDocs ? (
                                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                        ) : (
                                            <Plus className="w-5 h-5 text-gray-500" />
                                        )}
                                    </div>
                                    <p className="text-lg text-gray-600 font-medium">
                                        {uploadingDocs ? 'Uploading documents...' : (
                                            <>Drop files to attach or <span className="text-blue-600 hover:underline font-bold">Browse</span></>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Attachment Grid */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {task.attachments.map(doc => (
                                        <div key={doc.id} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group h-full">
                                            <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100 relative">
                                                <FileText className="w-10 h-10 text-gray-400" />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 bg-white/90 rounded-md shadow-sm text-gray-600 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs font-bold text-gray-900 truncate" title={doc.file_name}>{doc.file_name}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 font-medium italic">
                                                    {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Discussion */}
                        <div className="discussion bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
                            <label className="text-[14px] font-bold uppercase tracking-widest text-gray-400">Discussion ({comments.length})</label>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {comments.map((comment: { id: React.Key | null | undefined; user_details: { first_name: any[]; username: any[]; }; created_at: string | number | Date; content: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }) => (
                                    <div key={comment.id} className="flex gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                                            {comment.user_details.first_name?.[0] || comment.user_details.username[0]}
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl rounded-tl-none p-2.5 flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-900">{comment.user_details.first_name || comment.user_details.username}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(comment.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-600">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <input
                                    type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-gray-50 border-none rounded-full text-xs focus:ring-2 focus:ring-black"
                                />
                                <button
                                    onClick={() => { if (newComment.trim()) addCommentMutation.mutate(newComment.trim()); }}
                                    disabled={!newComment.trim()} className="p-2 bg-black text-white rounded-full disabled:bg-gray-200"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 6. Save Changes Button */}
                        <div className="flex justify-start pt-4 pb-6">
                            <button
                                onClick={handleSaveStatus}
                                disabled={isSaving || !hasUnsavedChanges}
                                className={`flex items-center px-8 py-3 text-sm font-bold rounded-xl transition-all shadow-md ${isSaving || !hasUnsavedChanges
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-green-200'
                                    }`}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task</h3>
                        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete <b>{task.heading}</b>?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg bg-gray-200">No</button>
                            <button onClick={() => deleteMutation.mutate(task.id)} className="px-4 py-2 rounded-lg bg-red-600 text-white">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};