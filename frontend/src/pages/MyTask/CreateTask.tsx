import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Calendar,
    Info,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    Briefcase,
    ListTodo,
    Plus,
} from 'lucide-react';
import { taskApi, usersApi, projectsApi } from '@/services/api';
import { ProjectMinimal } from '@/types';

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
    const [heading, setHeading] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [assignedToList, setAssignedToList] = useState<number[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
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
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'backlog', label: 'Backlog' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'deployed', label: 'Deployed' },
        { value: 'deferred', label: 'Deferred' },
    ];

    // Fetch dynamic user and project lists
    useEffect(() => {
        const fetchDynamicData = async () => {
            setIsDataLoading(true);
            try {
                // 1. Fetch Users
                const userData = await usersApi.listAll();
                const mappedUsers: UserOption[] = userData.map((user: any) => ({
                    value: String(user.id),
                    label: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
                    id: user.id,
                }));
                setAllUserOptions(mappedUsers);

                // 2. Fetch Projects
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

    // Handle fixed project logic for Content Creation Dashboard
    useEffect(() => {
        if (fixedProjectId && allProjectOptions.length > 0) {
            const currentProject = allProjectOptions.find(p => p.id === fixedProjectId);
            if (currentProject) {
                setAllProjectOptions([currentProject]);
                setSelectedProjects([fixedProjectId]);
            }
        }
    }, [fixedProjectId, allProjectOptions.length]);

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

        // --- VALIDATION ---
        if (!heading || !description || !startDate || !endDate || assignedToList.length === 0 || selectedProjects.length === 0) {
            setError('Please fill in all required fields (Task Heading, Description, Dates, Assigned To, and Project).');
            setLoading(false);
            return;
        }
        const projectId = selectedProjects[0];

        try {
            const payload = {
                heading,
                description,
                start_date: `${startDate}T09:00:00Z`,
                end_date: `${endDate}T18:00:00Z`,
                assigned_to: assignedToList,
                status,
                priority,
                project: projectId,
            };

            await taskApi.create(payload);

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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
                <p className="ml-3 text-gray-600">Loading resources...</p>
            </div>
        );
    }

    return (
        <div className={isModal ? "" : "min-h-screen bg-gray-50 p-8 flex justify-center"}>
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {!isModal && (
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full text-black hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <h1 className="text-3xl font-bold text-black">Create New Task</h1>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-100 text-red-800 flex items-start text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-100 text-green-800 flex items-start text-sm">
                            <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Task Heading */}
                    <div>
                        <label htmlFor="heading" className="block text-lg font-semibold mb-2 text-gray-800">
                            Task Heading <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="heading"
                            value={heading}
                            onChange={(e) => setHeading(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black transition-shadow"
                            placeholder="e.g., Implement dark mode toggle"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-lg font-semibold mb-2 text-gray-800">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black transition-shadow"
                            placeholder="Detail the requirements, goals, and acceptance criteria for the task."
                            required
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date */}
                        <div>
                            <label htmlFor="startDate" className="block text-lg font-semibold mb-2 text-gray-800">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black"
                                    required
                                />
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none opacity-0" />
                            </div>
                        </div>

                        {/* End Date */}
                        <div>
                            <label htmlFor="endDate" className="block text-lg font-semibold mb-2 text-gray-800">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black"
                                    required
                                />
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none opacity-0" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Assigned To */}
                        <div className="relative">
                            <label className="block text-lg font-semibold mb-2 text-gray-800">
                                Assigned To <span className="text-red-500">*</span>
                            </label>

                            {/* Tag Input Box */}
                            <div
                                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 cursor-pointer flex flex-wrap gap-2 min-h-[50px]"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                {assignedToList.length === 0 && (
                                    <span className="text-gray-500">Select users...</span>
                                )}

                                {/* Selected User Tags */}
                                {assignedToList.map((userId) => {
                                    const user = allUserOptions.find(u => u.id === userId);
                                    if (!user) return null;

                                    return (
                                        <span
                                            key={userId}
                                            className="px-2 py-1 bg-gray-200 text-gray-800 rounded-md flex items-center gap-1"
                                        >
                                            {user.label}
                                            <button
                                                type="button"
                                                className="text-gray-600 hover:text-red-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAssignedToList(
                                                        assignedToList.filter(id => id !== userId)
                                                    );
                                                }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Dropdown List */}
                            {dropdownOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                    {allUserOptions
                                        .filter((user) => !assignedToList.includes(user.id))
                                        .map((user) => (
                                            <div
                                                key={user.id}
                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between"
                                                onClick={() => {
                                                    setAssignedToList([...assignedToList, user.id]);
                                                    setDropdownOpen(false);
                                                }}
                                            >
                                                <span>{user.label}</span>
                                            </div>
                                        ))}
                                    {allUserOptions.filter((user) => !assignedToList.includes(user.id)).length === 0 && (
                                        <div className="px-4 py-2 text-gray-500 text-sm italic">All users assigned</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Project Multi-Select Dropdown */}
                        <div className="relative">
                            <label className="block text-lg font-semibold mb-2 text-gray-800">
                                Project <span className="text-red-500">*</span>
                            </label>

                            {/* Project Tag Input Box */}
                            <div
                                className={`w-full p-3 rounded-lg border border-gray-300 bg-gray-50 flex flex-wrap gap-2 min-h-[50px] ${fixedProjectId ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                onClick={() => !fixedProjectId && setProjectDropdownOpen(!projectDropdownOpen)}
                            >
                                {selectedProjects.length === 0 && (
                                    <span className="text-gray-500">Select projects...</span>
                                )}

                                {/* Selected Project Tags */}
                                {selectedProjects.map((projectId) => {
                                    const project = allProjectOptions.find(p => p.id === projectId);
                                    if (!project) return null;

                                    return (
                                        <span
                                            key={projectId}
                                            className="px-2 py-1 bg-gray-200 text-gray-800 rounded-md flex items-center gap-1"
                                        >
                                            {project.name}
                                            {!fixedProjectId && (
                                                <button
                                                    type="button"
                                                    className="text-gray-600 hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProjects(
                                                            selectedProjects.filter(id => id !== projectId)
                                                        );
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </span>
                                    );
                                })}
                                <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Project Dropdown List */}
                            {projectDropdownOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                    {allProjectOptions.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">No projects available.</div>
                                    ) : (
                                        allProjectOptions.map((project) => {
                                            const isSelected = selectedProjects.includes(project.id);

                                            return (
                                                <div
                                                    key={project.id}
                                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-100 flex justify-between ${isSelected ? "bg-blue-50" : ""
                                                        }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedProjects([]);
                                                        } else {
                                                            setSelectedProjects([project.id]);
                                                            setProjectDropdownOpen(false);
                                                        }
                                                    }}
                                                >
                                                    <span>{project.name}</span>
                                                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status */}
                        <div>
                            <label htmlFor="status" className="block text-lg font-semibold mb-2 text-gray-800">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 appearance-none text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ListTodo className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label htmlFor="priority" className="block text-lg font-semibold mb-2 text-gray-800">
                                Priority
                            </label>
                            <div className="relative">
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 appearance-none text-gray-900 focus:ring-black focus:border-black focus:ring-black focus:border-black"
                                >
                                    {priorityOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <Info className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-2">
                        <label className="block text-lg font-semibold text-gray-800">
                            Attachments
                        </label>
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex flex-col items-center justify-center transition-colors hover:bg-gray-100 cursor-pointer relative"
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
                                <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-black">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    PDF, Images, PPT, XML, JSON, HTML (Max 10MB)
                                </p>
                            </div>
                        </div>

                        {/* File Preview List */}
                        {attachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className="p-2 bg-blue-50 rounded">
                                                <Briefcase className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-8 py-3 rounded-lg text-sm font-medium transition-colors duration-200 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-8 py-3 rounded-lg text-sm font-medium transition-colors duration-200 bg-black text-white hover:bg-black/90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Creating Task...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};