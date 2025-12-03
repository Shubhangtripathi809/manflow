import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Calendar,
    // Users,
    Info,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    Briefcase,
    ListTodo,
} from 'lucide-react';
import { taskApi, usersApi, projectsApi } from '@/services/api';
// import { useAuth } from '@/hooks/useAuth'

interface UserOption {
    value: string;
    label: string;
    id: number;
}


export const CreateTask: React.FC = () => {
    const navigate = useNavigate();
    const [heading, setHeading] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [assignedToList, setAssignedToList] = useState<number[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [project, setProject] = useState<string>('');
    const [status, setStatus] = useState('pending');
    const [priority, setPriority] = useState('medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allUserOptions, setAllUserOptions] = useState<UserOption[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [success, setSuccess] = useState<string | null>(null);

    const priorityOptions = [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'deployed', label: 'Deployed' },
        { value: 'deferred', label: 'Deferred' },
    ];

    // Fetch dynamic user lists
    useEffect(() => {
        const fetchDynamicData = async () => {
            setIsDataLoading(true);
            try {
                const userData = await usersApi.listAll();
                const mappedUsers: UserOption[] = userData.map((user: any) => ({
                    value: String(user.id),
                    label: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
                    id: user.id,
                }));
                setAllUserOptions(mappedUsers);

            } catch (err) {
                console.error("Failed to load dynamic data for task creation:", err);
                setError("Failed to load required user/project lists. Please try refreshing.");
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchDynamicData();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // --- VALIDATION ---
        if (!heading || !description || !startDate || !endDate || assignedToList.length === 0 || !project.trim()) {
            setError('Please fill in all required fields (including Project).');
            setLoading(false);
            return;
        }

        // --- API CALL ---
        try {
            const payload = {
                heading,
                description,
                start_date: `${startDate}T09:00:00Z`,
                end_date: `${endDate}T18:00:00Z`,
                assigned_to: assignedToList,
                status,
                priority,
                project_name: project.trim(),
            };

            await taskApi.create(payload);

            setSuccess('Task created successfully! Redirecting to Taskboard...');
            setTimeout(() => {
                navigate('/taskboard');
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
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">

                {/* Header Section */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => navigate('/taskboard')}
                            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-bold text-white">Create New Task</h1>
                    </div>
                    <button
                        onClick={() => navigate('/taskboard')}
                        className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className={`p-3 rounded-lg bg-red-100 text-red-800 flex items-start text-sm`}>
                            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className={`p-3 rounded-lg bg-green-100 text-green-800 flex items-start text-sm`}>
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
                            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
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
                            className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            placeholder="Detail the requirements, goals, and acceptance criteria for the task."
                            required
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date - Using native date input */}
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
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none opacity-0" />
                            </div>
                        </div>

                        {/* End Date - Using native date input */}
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
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none opacity-0" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Assigned To - Custom Multi Select */}
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
                                    {allUserOptions.map((user) => {
                                        const isSelected = assignedToList.includes(user.id);

                                        return (
                                            <div
                                                key={user.id}
                                                className={`px-4 py-2 cursor-pointer hover:bg-blue-100 flex justify-between ${isSelected ? "bg-blue-50" : ""
                                                    }`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setAssignedToList(
                                                            assignedToList.filter((id) => id !== user.id)
                                                        );
                                                    } else {
                                                        setAssignedToList([...assignedToList, user.id]);
                                                    }
                                                }}
                                            >
                                                <span>{user.label}</span>
                                                {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>



                        <div>
                            <label htmlFor="project" className="block text-lg font-semibold mb-2 text-gray-800">
                                Project <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="project"
                                    value={project}
                                    onChange={(e) => setProject(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter project name..."
                                    required
                                />
                                <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="status" className="block text-lg font-semibold mb-2 text-gray-800">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 appearance-none text-gray-900 focus:ring-blue-500 focus:border-blue-500"
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
                        <div>
                            <label htmlFor="priority" className="block text-lg font-semibold mb-2 text-gray-800">
                                Priority
                            </label>
                            <div className="relative">
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 appearance-none text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {priorityOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <Info className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/taskboard')}
                            className={`px-8 py-3 rounded-lg text-lg font-medium transition-colors duration-200 bg-gray-200 text-gray-700 hover:bg-gray-300`}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-8 py-3 rounded-lg text-lg font-medium transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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