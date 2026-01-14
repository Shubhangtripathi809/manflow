import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    X,
    Calendar,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    Briefcase,
    User,
    Flag,
    Paperclip,
    Type,
    Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { taskApi, usersApi, projectsApi } from '@/services/api';
import { ProjectMinimal } from '@/types';
import { AITaskSuggestionResponse } from '@/types';
import { AITask } from './AITask';

interface UserOption {
    value: string;
    label: string;
    id: number;
}

interface ProjectOption {
    id: number;
    name: string;
}

interface CreateTaskProps {
    onClose?: () => void;
    onSuccess?: () => void;
    isModal?: boolean;
    fixedProjectId?: number;
}

export const CreateTask: React.FC<CreateTaskProps> = ({
    onClose,
    onSuccess,
    isModal = false,
    fixedProjectId
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [heading, setHeading] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [assignedToList, setAssignedToList] = useState<number[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [allProjectOptions, setAllProjectOptions] = useState<ProjectOption[]>([]);
    const [status, setStatus] = useState('pending');
    const [priority, setPriority] = useState('medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allUserOptions, setAllUserOptions] = useState<UserOption[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [labels, setLabels] = useState('');
    const [showAIModal, setShowAIModal] = useState(false);
    const [duration, setDuration] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleEditorInput = () => {
        if (editorRef.current) {
            setDescription(editorRef.current.innerHTML);
        }
    };

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto;" />`;
                document.execCommand('insertHTML', false, img);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        const isDeleting = (e.nativeEvent as any).inputType === 'deleteContentBackward';
        if (isDeleting) {
            setDuration(val);
            return;
        }
        val = val.replace(/[^0-9:]/g, '');

        // Auto-format logic for additions:
        // 1. If user types 2 digits (e.g., "24"), append a colon: "24:"
        if (/^\d{2}$/.test(val)) {
            val = val + ':';
        }
        // 2. If user types a digit after the colon (e.g., "24:1"), append a zero: "24:10"
        else if (/^\d{2}:\d$/.test(val)) {
            val = val + '0';
        }

        setDuration(val);
    };

    const insertTable = () => {
        const table = `
        <table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Cell 1</td>
                <td style="padding: 8px; border: 1px solid #ddd;">Cell 2</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Cell 3</td>
                <td style="padding: 8px; border: 1px solid #ddd;">Cell 4</td>
            </tr>
        </table>
    `;
        document.execCommand('insertHTML', false, table);
        editorRef.current?.focus();
    };

    const insertList = (ordered: boolean) => {
        execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    };

    const insertLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const toggleAlignment = (align: string) => {
        execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const priorityOptions = [
        { value: 'high', label: 'High', color: 'text-red-600', icon: '🔴' },
        { value: 'medium', label: 'Medium', color: 'text-orange-600', icon: '🟡' },
        { value: 'low', label: 'Low', color: 'text-green-600', icon: '🟢' },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'backlog', label: 'Backlog', color: 'bg-gray-100 text-gray-800' },
        { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
        { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
        { value: 'deployed', label: 'Deployed', color: 'bg-purple-100 text-purple-800' },
        { value: 'deferred', label: 'Deferred', color: 'bg-gray-100 text-gray-600' },
    ];

    useEffect(() => {
        const fetchDynamicData = async () => {
            setIsDataLoading(true);
            try {
                const userResponse = await usersApi.list();
                const userData = userResponse.results || userResponse;
                const mappedUsers: UserOption[] = userData.map((user: any) => ({
                    value: String(user.id),
                    label: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
                    id: user.id,
                }));
                setAllUserOptions(mappedUsers);

                const projectData = await projectsApi.list();
                const mappedProjects: ProjectOption[] = projectData.results.map((project: ProjectMinimal) => ({
                    id: project.id,
                    name: project.name,
                }));
                setAllProjectOptions(mappedProjects);

            } catch (err) {
                console.error("Failed to load dynamic data for task creation:", err);
                setError("Failed to load required user/project lists. Please try refreshing.");
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchDynamicData();
    }, []);

    useEffect(() => {
        if (fixedProjectId && allProjectOptions.length > 0) {
            const currentProject = allProjectOptions.find(p => p.id === fixedProjectId);
            if (currentProject) {
                setAllProjectOptions([currentProject]);
                setSelectedProjects([fixedProjectId]);
            }
        }
    }, [fixedProjectId, allProjectOptions.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.relative')) {
                setStatusDropdownOpen(false);
                setPriorityDropdownOpen(false);
                setDropdownOpen(false);
                setProjectDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const aiGeneratedTask = location.state?.aiGeneratedTask as AITaskSuggestionResponse;
        if (aiGeneratedTask) {
            console.log('🤖 AI Task Data Received:', aiGeneratedTask);

            // Set all form fields
            setHeading(aiGeneratedTask.heading || '');
            setStartDate(aiGeneratedTask.start_date || '');
            setEndDate(aiGeneratedTask.end_date || '');
            setStatus(aiGeneratedTask.status || 'pending');
            setPriority(aiGeneratedTask.priority || 'medium');
            setAssignedToList(aiGeneratedTask.assigned_to || []);

            if (aiGeneratedTask.project) {
                setSelectedProjects([aiGeneratedTask.project]);
            }

            // Handle description for contentEditable div
            if (aiGeneratedTask.description) {
                const desc = aiGeneratedTask.description;
                console.log('📝 Setting description:', desc);
                setDescription(desc);
                const updateEditor = (attempt = 0) => {
                    if (editorRef.current) {
                        console.log('✅ Editor ref found, updating content');
                        editorRef.current.innerHTML = desc;
                        editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                    } else if (attempt < 5) {
                        console.log(`⏳ Editor ref not ready, retry ${attempt + 1}/5`);
                        setTimeout(() => updateEditor(attempt + 1), 100);
                    } else {
                        console.error('❌ Failed to update editor after 5 attempts');
                    }
                };

                updateEditor();
            }

            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        if (editorRef.current && description && editorRef.current.innerHTML !== description) {
            editorRef.current.innerHTML = description;
        }
    }, [description]);

    const handleClose = () => {
        if (isModal && onClose) {
            onClose();
        } else {
            navigate('/taskboard');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!heading || !description || !startDate || !endDate || assignedToList.length === 0 || selectedProjects.length === 0) {
            setError('Please fill in all required fields.');
            setLoading(false);
            return;
        }
        const projectId = selectedProjects[0];

        try {
            const formData = new FormData();
            formData.append('heading', heading);
            formData.append('description', description);
            formData.append('start_date', `${startDate}T09:00:00Z`);
            formData.append('end_date', `${endDate}T18:00:00Z`);
            formData.append('duration_time', duration);
            formData.append('status', status);
            formData.append('priority', priority);
            formData.append('project', String(projectId));
            assignedToList.forEach(id => {
                formData.append('assigned_to', String(id));
            });
            attachments.forEach((file) => {
                formData.append('uploaded_files', file);
            });

            await taskApi.create(formData);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSuccess('Task created successfully!');

            setTimeout(() => {
                if (isModal && onSuccess) {
                    onSuccess();
                } else {
                    navigate('/taskboard');
                }
            }, 1500);

        } catch (err: any) {
            console.error('Error creating task:', err);
            setError(err.response?.data?.message || 'Failed to create task. Please check your inputs.');
            setLoading(false);
        }
    };

    if (isDataLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                <p className="ml-3 text-gray-600">Loading resources...</p>
            </div>
        );
    }

    return (
        <div className={isModal ? "" : "min-h-screen bg-gray-50 py-4 px-6"}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {!isModal && (
                            <button
                                onClick={handleClose}
                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Create task</h1>
                            <p className="text-sm text-gray-500 mt-1">Fill in the details below to create a new task</p>
                        </div>
                    </div>
                    {isModal && (
                        <button onClick={handleClose} className="p-2 rounded hover:bg-gray-100">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Alerts */}
                        {error && (
                            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">Error</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        )}
                        {success && (
                            <div className="p-4 bg-green-50 border-b border-green-100 flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800">{success}</p>
                                </div>
                            </div>
                        )}

                        <div className="p-5 space-y-4">
                            {/* Project Selection */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Briefcase className="w-4 h-4" />
                                    Project <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        className={`w-full p-2.5 rounded border border-gray-300 bg-white flex flex-wrap gap-2 min-h-[42px] ${fixedProjectId ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-gray-400'} transition-colors`}
                                        onClick={() => !fixedProjectId && setProjectDropdownOpen(!projectDropdownOpen)}
                                    >
                                        {selectedProjects.length === 0 ? (
                                            <span className="text-gray-400 text-sm">Select a project</span>
                                        ) : (
                                            selectedProjects.map((projectId) => {
                                                const project = allProjectOptions.find(p => p.id === projectId);
                                                if (!project) return null;
                                                return (
                                                    <span key={projectId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium flex items-center gap-1">
                                                        {project.name}
                                                        {!fixedProjectId && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedProjects([]);
                                                                }}
                                                                className="hover:text-red-600"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </span>
                                                );
                                            })
                                        )}
                                    </div>
                                    {projectDropdownOpen && (
                                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                            {allProjectOptions.map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                                                    onClick={() => {
                                                        setSelectedProjects([project.id]);
                                                        setProjectDropdownOpen(false);
                                                    }}
                                                >
                                                    {project.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Task Title */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Type className="w-4 h-4" />
                                    Task title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={heading}
                                    onChange={(e) => setHeading(e.target.value)}
                                    className="w-full p-2.5 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Enter a concise task title"
                                    required
                                />
                            </div>

                            {/*  Description Section */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-white">
                                        {/* Bold */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('bold')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Bold"
                                        >
                                            <strong className="text-sm font-semibold">B</strong>
                                        </button>

                                        {/* Italic */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('italic')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Italic"
                                        >
                                            <em className="text-sm">I</em>
                                        </button>

                                        {/* Underline */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('underline')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Underline"
                                        >
                                            <span className="text-sm underline">U</span>
                                        </button>

                                        {/* Strikethrough */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('strikeThrough')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Strikethrough"
                                        >
                                            <span className="text-sm line-through">S</span>
                                        </button>

                                        {/* Link */}
                                        <button
                                            type="button"
                                            onClick={insertLink}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Insert Link"
                                        >
                                            <span className="text-sm">🔗</span>
                                        </button>

                                        <div className="w-px h-4 bg-gray-300 mx-1" />

                                        {/* Bulleted List */}
                                        <button
                                            type="button"
                                            onClick={() => insertList(false)}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Bulleted List"
                                        >
                                            <span className="text-sm">☰</span>
                                        </button>

                                        {/* Numbered List */}
                                        <button
                                            type="button"
                                            onClick={() => insertList(true)}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Numbered List"
                                        >
                                            <span className="text-sm">≡</span>
                                        </button>

                                        <div className="w-px h-4 bg-gray-300 mx-1" />

                                        {/* Align Left */}
                                        <button
                                            type="button"
                                            onClick={() => toggleAlignment('left')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Align Left"
                                        >
                                            <span className="text-sm">⊣</span>
                                        </button>

                                        {/* Align Center */}
                                        <button
                                            type="button"
                                            onClick={() => toggleAlignment('center')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Align Center"
                                        >
                                            <span className="text-sm">≡</span>
                                        </button>

                                        {/* Align Right */}
                                        <button
                                            type="button"
                                            onClick={() => toggleAlignment('right')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Align Right"
                                        >
                                            <span className="text-sm">⊢</span>
                                        </button>

                                        <div className="w-px h-4 bg-gray-300 mx-1" />

                                        {/* Code Block */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('formatBlock', '<pre>')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors font-mono text-xs"
                                            title="Code Block"
                                        >
                                            {'</>'}
                                        </button>

                                        <div className="w-px h-4 bg-gray-300 mx-1" />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageFile}
                                            className="hidden"
                                        />

                                        {/* Table */}
                                        <button
                                            type="button"
                                            onClick={insertTable}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                            title="Insert Table"
                                        >
                                            <span className="text-sm">⊞</span>
                                        </button>

                                        {/* Undo/Redo placeholder */}
                                        <button
                                            type="button"
                                            onClick={() => execCommand('undo')}
                                            className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
                                            title="Undo"
                                        >
                                            <span className="text-sm">↶</span>
                                        </button>
                                    </div>

                                    {/* ContentEditable Editor */}
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        onInput={handleEditorInput}
                                        className="w-full p-3 text-sm text-gray-700 outline-none min-h-[120px] bg-[#fdfdfd]"
                                        data-placeholder="Type @ to mention a teammate and notify them about this work item."
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word'
                                        }}
                                    />
                                </div>
                                <style>{`
                                        div[contenteditable]:empty:before {
                                        content: attr(data-placeholder);
                                        color: #9ca3af;
                                        pointer-events: none;
                                        }
                               `}</style>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Status */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Status
                                        </label>
                                        <div className="relative">
                                            <div
                                                className="w-full p-2.5 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex items-center justify-between min-h-[42px] transition-colors"
                                                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                            >
                                                <span className="text-sm text-gray-700">
                                                    {statusOptions.find(opt => opt.value === status)?.label || 'Select status'}
                                                </span>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {statusDropdownOpen && (
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                                    {statusOptions.map((option) => (
                                                        <div
                                                            key={option.value}
                                                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm flex items-center justify-between"
                                                            onClick={() => {
                                                                setStatus(option.value);
                                                                setStatusDropdownOpen(false);
                                                            }}
                                                        >
                                                            <span>{option.label}</span>
                                                            {status === option.value && (
                                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                            <Flag className="w-4 h-4" />
                                            Priority
                                        </label>
                                        <div className="relative">
                                            <div
                                                className="w-full p-2.5 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex items-center justify-between min-h-[42px] transition-colors"
                                                onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                                            >
                                                <span className="text-sm text-gray-700">
                                                    {priorityOptions.find(opt => opt.value === priority)?.icon}{' '}
                                                    {priorityOptions.find(opt => opt.value === priority)?.label || 'Select priority'}
                                                </span>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {priorityDropdownOpen && (
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                                    {priorityOptions.map((option) => (
                                                        <div
                                                            key={option.value}
                                                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm flex items-center justify-between"
                                                            onClick={() => {
                                                                setPriority(option.value);
                                                                setPriorityDropdownOpen(false);
                                                            }}
                                                        >
                                                            <span>
                                                                {option.icon} {option.label}
                                                            </span>
                                                            {priority === option.value && (
                                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Combined Date & Duration Section */}
                                    <div className="col-span-1 md:col-span-2">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 shadow-sm">
                                            {/* Start Date */}
                                            <div className="">
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Start date <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full p-2.5 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                    required
                                                />
                                            </div>

                                            {/* End Date */}
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Due Date <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full p-2.5 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                    required
                                                />
                                            </div>

                                            {/* Duration Time */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                                    <span className="flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-[10px]">⏱</span>
                                                    Duration
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={duration}
                                                        onChange={handleDurationChange}
                                                        placeholder="HH:MM:SS"
                                                        className="w-full p-2.5 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assignees and Labels Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Assignees */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <User className="w-4 h-4" />
                                        Assignees <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="w-full p-2.5 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex flex-wrap gap-2 min-h-[42px] transition-colors"
                                            onClick={() => setDropdownOpen(!dropdownOpen)}
                                        >
                                            {assignedToList.length === 0 ? (
                                                <span className="text-gray-400 text-sm">Assign to team members</span>
                                            ) : (
                                                assignedToList.map((userId) => {
                                                    const user = allUserOptions.find(u => u.id === userId);
                                                    if (!user) return null;
                                                    return (
                                                        <span key={userId} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium flex items-center gap-1">
                                                            {user.label}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAssignedToList(assignedToList.filter(id => id !== userId));
                                                                }}
                                                                className="hover:text-red-600"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {dropdownOpen && (
                                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                                {allUserOptions.filter((user) => !assignedToList.includes(user.id)).map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                                                        onClick={() => {
                                                            setAssignedToList([...assignedToList, user.id]);
                                                            setDropdownOpen(false);
                                                        }}
                                                    >
                                                        {user.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Labels*/}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        <Flag className="w-4 h-4 text-gray-400" />
                                        Labels
                                    </label>
                                    <input
                                        type="text"
                                        value={labels}
                                        onChange={(e) => setLabels(e.target.value)}
                                        placeholder="e.g. frontend, bug, enhancement"
                                        className="w-full p-2.5 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Separate labels with commas</p>
                                </div>
                            </div>

                            {/* Attachments */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Paperclip className="w-4 h-4" />
                                    Attachments
                                </label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors cursor-pointer relative bg-gray-50"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files) {
                                            const droppedFiles = Array.from(e.dataTransfer.files);
                                            setAttachments(prev => [...prev, ...droppedFiles]);
                                        }
                                    }}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept=".pdf,image/*,.ppt,.pptx,.xml,.json,.html"
                                    />
                                    <div className="text-center">
                                        <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">PDF, Images, Documents (Max 10MB each)</p>
                                    </div>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(index)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600 flex-shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAIModal(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate Task By AI
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create task'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            {showAIModal && (
                <AITask onClose={() => setShowAIModal(false)} />
            )}
        </div>
    );
};