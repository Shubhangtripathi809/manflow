import React, { useState, useCallback } from 'react';
import {
    CheckSquare, Calendar, Clock, Plus, Eye, Grid3X3, List, Search, Users, AlertCircle, CheckCircle, PlayCircle, Pause, Bell, ListTodo, X
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { taskApi, projectsApi } from '@/services/api';
import './MyTask.scss';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TaskDetailModal } from './TaskDetailModal';
import { AITask } from './AITask';
import { Task } from '@/types';
import { formatRelativeTime } from '@/lib/utils';


const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateString;
    }
};

export const getStatusConfig = (status: Task['status']) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
        case 'PENDING':
            return { bg: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-50 text-yellow-600 border border-yellow-200', cardClass: 'card-pending', label: 'PENDING', icon: Clock, color: '#f59e0b' };
        case 'BACKLOG':
            return { bg: 'bg-orange-50', text: 'text-orange-800', badge: 'bg-orange-50 text-orange-600 border border-orange-200', cardClass: 'card-backlog', label: 'BACKLOG', icon: ListTodo, color: '#f97316' };
        case 'IN_PROGRESS':
            return { bg: 'bg-blue-50', text: 'text-blue-800', badge: 'bg-blue-50 text-blue-600 border border-blue-200', cardClass: 'card-in-progress', label: 'IN PROGRESS', icon: PlayCircle, color: '#3b82f6' };
        case 'COMPLETED':
            return { bg: 'bg-green-50', text: 'text-green-800', badge: 'bg-green-50 text-green-600 border border-green-200', cardClass: 'card-completed', label: 'COMPLETED', icon: CheckCircle, color: '#22c55e' };
        case 'DEPLOYED':
            return { bg: 'bg-purple-50', text: 'text-purple-800', badge: 'bg-purple-50 text-purple-600 border border-purple-200', cardClass: 'card-deployed', label: 'DEPLOYED', icon: CheckSquare, color: '#8b5cf6' };
        case 'DEFERRED':
            return { bg: 'bg-gray-50', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-600 border border-gray-200', cardClass: 'card-deferred', label: 'DEFERRED', icon: Pause, color: '#6b7280' };
        case 'REVIEW':
            return { bg: 'bg-indigo-50', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-600 border border-indigo-200', cardClass: 'card-review', label: 'REVIEW', icon: Eye, color: '#6366f1' };
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-600 border border-gray-200', cardClass: 'card-gray', label: normalizedStatus, icon: AlertCircle, color: '#9ca3af' };
    }
};

export const TaskCard: React.FC<{ task: Task; onTaskClick: (task: Task) => void }> = ({ task, onTaskClick }) => {
    const statusConfig = getStatusConfig(task.status);
    return (
        <div
            onClick={() => onTaskClick(task)}
            className={`${statusConfig.cardClass} rounded-xl p-4 transition-all duration-300 cursor-pointer text-gray-800 hover:shadow-lg hover:-translate-y-0.5 border border-[#d0d5dd] relative hover:z-50`}
        >
            <div className="flex justify-between items-start gap-2 mb-3">
                <div className="pr-2 flex flex-col">
                    <span className="text-sm font-bold text-gray-900 line-clamp-1 mb-0.5">
                        {task.project_details?.name || task.project_name || 'No Project'}
                    </span>
                    <span className="text-xs font-medium text-gray-600 line-clamp-2">
                        {task.heading || 'No Task'}
                    </span>
                </div>
                {task.updated_at && (
                    <div className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                        {formatRelativeTime(task.updated_at)}
                    </div>
                )}
            </div>

            {/* Task Details */}
            <div className="space-y-1 text-xs text-gray-500 mb-2">
                <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /><span className="font-medium">Due:</span><span className="ml-1">{formatDate(task.end_date)}</span></div>

                {/* Assigned */}
                <div
                    className="flex items-center relative group cursor-pointer hover:text-blue-600 transition-colors w-max"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Users className="w-3 h-3 mr-1" />
                    <span className="font-medium">Assigned:</span>
                    <span className="ml-1 font-bold">{task.assigned_to.length}</span>

                    {/* Hover/Click Dropdown */}
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-50 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                            {task.assigned_to_user_details && task.assigned_to_user_details.length > 0 ? (
                                task.assigned_to_user_details.map((u) => (
                                    <div key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                                            {u.first_name[0]}{u.last_name?.[0]}
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-700 truncate">
                                            {u.first_name} {u.last_name}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-[11px] text-gray-400 px-1 italic">No users assigned</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="absolute bottom-3 right-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${statusConfig.badge}`}>
                    {statusConfig.label}
                </span>
            </div>
        </div>
    );
};

interface TaskListViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, onTaskClick }) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeSubtaskRow, setActiveSubtaskRow] = useState<number | null>(null);
    const [subtaskTitle, setSubtaskTitle] = useState('');
    const [activeStatusDropdown, setActiveStatusDropdown] = useState<number | null>(null);
    const priorityOptions = [
        { value: 'high', label: 'High', color: 'text-red-600', dotColor: 'bg-red-500', icon: '🔴' },
        { value: 'medium', label: 'Medium', color: 'text-orange-600', dotColor: 'bg-orange-200', icon: '🟡' },
        { value: 'low', label: 'Low', color: 'text-green-600', dotColor: 'bg-green-500', icon: '🟢' },
    ];

    const [activePriorityId, setActivePriorityId] = useState<number | null>(null);
    const [activeLabelDropdown, setActiveLabelDropdown] = useState<number | null>(null);
    const [projectLabelsMap, setProjectLabelsMap] = useState<Record<string, any[]>>({});

    const [loadingLabels, setLoadingLabels] = useState(false);
    const [showProjectSearch, setShowProjectSearch] = useState(false);
    const [projectFilter, setProjectFilter] = useState('');
    const [showTitleSearch, setShowTitleSearch] = useState(false);
    const [titleFilter, setTitleFilter] = useState('');
    const [showPrioritySearch, setShowPrioritySearch] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState('');

    const filteredTasks = React.useMemo(() => {
        return tasks.filter(task => {
            const projectName = (task.project_details?.name || task.project_name || '').toLowerCase();
            const taskTitle = (task.heading || '').toLowerCase();
            const taskPriority = (task.priority || '').toLowerCase();

            // Check Project Filter
            if (projectFilter && !projectName.startsWith(projectFilter.toLowerCase())) {
                return false;
            }
            // Check Title Filter
            if (titleFilter && !taskTitle.startsWith(titleFilter.toLowerCase())) {
                return false;
            }
            // Check Priority Filter
            if (priorityFilter && !taskPriority.startsWith(priorityFilter.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [tasks, projectFilter, titleFilter, priorityFilter]);

    // Close label dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.jira-td-labels')) {
                setActiveLabelDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLabelDropdownOpen = async (taskId: number, projectId: string | null) => {
        if (activeLabelDropdown === taskId) {
            setActiveLabelDropdown(null);
            return;
        }

        setActiveLabelDropdown(taskId);

        // Fetch labels 
        if (projectId && !projectLabelsMap[projectId]) {
            setLoadingLabels(true);
            try {
                const data = await projectsApi.getLabels(Number(projectId));
                setProjectLabelsMap(prev => ({ ...prev, [projectId]: data.results || [] }));
            } catch (error) {
                console.error("Failed to fetch labels", error);
            } finally {
                setLoadingLabels(false);
            }
        }
    };

    const handleToggleLabel = async (task: Task, label: any) => {
        const currentLabelIds = task.labels?.map(l => l.id) || [];
        const isSelected = currentLabelIds.includes(label.id);

        // Toggle ID in the array
        const newLabelIds = isSelected
            ? currentLabelIds.filter(id => id !== label.id)
            : [...currentLabelIds, label.id];

        try {
            await taskApi.update(task.id, { labels: newLabelIds } as any);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (error) {
            console.error("Failed to update labels", error);
        }
    };

    const handlePriorityChange = async (taskId: number, newPriority: string) => {
        try {
            await taskApi.update(taskId, { priority: newPriority } as any);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setActivePriorityId(null);
        } catch (error) {
            console.error('Failed to update priority:', error);
        }
    };

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        try {
            await taskApi.update(taskId, { status: newStatus } as any);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setActiveStatusDropdown(null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const statusOptions = [
        { value: 'pending', label: 'PENDING', icon: Clock },
        { value: 'backlog', label: 'BACKLOG', icon: ListTodo },
        { value: 'in_progress', label: 'IN PROGRESS', icon: PlayCircle },
        { value: 'completed', label: 'COMPLETED', icon: CheckCircle },
        { value: 'deployed', label: 'DEPLOYED', icon: CheckSquare },
        { value: 'deferred', label: 'DEFERRED', icon: Pause },
        { value: 'review', label: 'REVIEW', icon: Eye },

    ];

    const handleDateChange = async (taskId: number, field: 'start_date' | 'end_date', value: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.type === 'blur') {
            e.stopPropagation();
        }

        if (!value) return;

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
                        <th className="jira-th jira-th-type border-r border-[#dfe1e6]">Type</th>

                        {/* Project Column */}
                        <th className="jira-th jira-th-project border-r border-[#dfe1e6]">
                            <div className="flex items-center justify-between gap-1">
                                <span>Project</span>
                                <Search
                                    className="w-3 h-3 cursor-pointer text-gray-400 hover:text-blue-600"
                                    onClick={(e) => { e.stopPropagation(); setShowProjectSearch(!showProjectSearch); }}
                                />
                            </div>
                            {showProjectSearch && (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Filter project..."
                                    className="mt-1 w-full text-[11px] border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-normal bg-white text-gray-700"
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.key === 'Enter' && setShowProjectSearch(false)}
                                />
                            )}
                        </th>

                        {/* Task Title*/}
                        <th className="jira-th jira-th-title border-r border-[#dfe1e6]">
                            <div className="flex items-center justify-between gap-1">
                                <span>Task Title</span>
                                <Search
                                    className="w-3 h-3 cursor-pointer text-gray-400 hover:text-blue-600"
                                    onClick={(e) => { e.stopPropagation(); setShowTitleSearch(!showTitleSearch); }}
                                />
                            </div>
                            {showTitleSearch && (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Filter title..."
                                    className="mt-1 w-full text-[11px] border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-normal bg-white text-gray-700"
                                    value={titleFilter}
                                    onChange={(e) => setTitleFilter(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.key === 'Enter' && setShowTitleSearch(false)}
                                />
                            )}
                        </th>

                        <th className="jira-th jira-th-status border-r border-[#dfe1e6]">Status</th>
                        <th className="jira-th jira-th-assignee border-r border-[#dfe1e6]">Assignee</th>

                        {/* Priority Column with Search */}
                        <th className="jira-th jira-th-priority border-r border-[#dfe1e6]">
                            <div className="flex items-center justify-between gap-1">
                                <span>Priority</span>
                                <Search
                                    className="w-3 h-3 cursor-pointer text-gray-400 hover:text-blue-600"
                                    onClick={(e) => { e.stopPropagation(); setShowPrioritySearch(!showPrioritySearch); }}
                                />
                            </div>
                            {showPrioritySearch && (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Filter priority..."
                                    className="mt-1 w-full text-[11px] border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-normal bg-white text-gray-700"
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.key === 'Enter' && setShowPrioritySearch(false)}
                                />
                            )}
                        </th>

                        <th className="jira-th jira-th-labels border-r border-[#dfe1e6]">Labels</th>
                        <th className="jira-th jira-th-date border-r border-[#dfe1e6]">Due Date</th>
                        <th className="jira-th jira-th-duration">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTasks.map((task) => {
                        const statusConfig = getStatusConfig(task.status);
                        const priorityOption = priorityOptions.find(opt => opt.value === task.priority);

                        return (
                            <React.Fragment key={task.id}>
                                <tr className="jira-table-row group hover:bg-[#f4f5f7]" onClick={() => onTaskClick(task)}>
                                    {/* Type Column */}
                                    <td className="jira-td jira-td-type border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5">
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                            <button
                                                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent p-0 flex items-center justify-center"
                                                title="Add subtask"
                                                onClick={() => setActiveSubtaskRow(activeSubtaskRow === task.id ? null : task.id)}
                                            >
                                                <Plus className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Project Column */}
                                    <td className="jira-td jira-td-project border-r border-[#f4f5f7]">
                                        <span className="text-[12px] text-gray-700 font-medium">
                                            {task.project_details?.name || task.project_name || 'No Project'}
                                        </span>
                                    </td>

                                    {/* Task Title Column */}
                                    <td className="jira-td jira-td-title border-r border-[#f4f5f7]">
                                        <span className="jira-summary truncate block max-w-[300px] font-medium">
                                            {task.heading}
                                        </span>
                                    </td>

                                    {/* Status Column */}
                                    <td className="jira-td jira-td-status border-r border-[#f4f5f7] relative" onClick={e => e.stopPropagation()}>
                                        <div
                                            className={`jira-status-badge ${statusConfig.bg} ${statusConfig.text} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
                                            onClick={() => setActiveStatusDropdown(activeStatusDropdown === task.id ? null : task.id)}
                                        >
                                            <span>{statusConfig.label}</span>
                                        </div>

                                        {activeStatusDropdown === task.id && (
                                            <div
                                                className="absolute z-50 mt-1 left-0 min-w-[140px] max-h-[200px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                                                onWheel={(e) => e.stopPropagation()}
                                            >
                                                {statusOptions.map((option) => {
                                                    const optionConfig = getStatusConfig(option.value);
                                                    const textColor = optionConfig.badge.split(' ').find(cls => cls.startsWith('text-')) || optionConfig.text;

                                                    return (
                                                        <div
                                                            key={option.value}
                                                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-[12px] flex items-center gap-2"
                                                            onClick={() => handleStatusChange(task.id, option.value)}
                                                        >
                                                            {React.createElement(option.icon, { className: `w-3.5 h-3.5 ${textColor}` })}
                                                            <span className={`${task.status === option.value ? "font-bold" : "font-medium"} ${textColor}`}>
                                                                {option.label}
                                                            </span>
                                                            {task.status === option.value && (
                                                                <svg className={`w-3.5 h-3.5 ml-auto ${textColor}`} fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </td>

                                    {/* Assignee Column */}
                                    <td className="jira-td jira-td-assignee border-r border-[#f4f5f7]">
                                        <div className="flex -space-x-1.5">
                                            {task.assigned_to_user_details.slice(0, 3).map((u) => (
                                                <div key={u.id} className="jira-avatar ring-1 ring-white" title={`${u.first_name} ${u.last_name}`}>
                                                    {u.first_name[0]}{u.last_name[0]}
                                                </div>
                                            ))}
                                            {task.assigned_to_user_details.length > 3 && (
                                                <div className="jira-avatar ring-1 ring-white bg-gray-400" title={`+${task.assigned_to_user_details.length - 3} more`}>
                                                    +{task.assigned_to_user_details.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Priority Column */}
                                    <td className="jira-td jira-td-priority border-r border-[#f4f5f7] relative" onClick={e => e.stopPropagation()}>
                                        <div
                                            className="flex items-center gap-1.5 text-gray-600 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                            onClick={() => setActivePriorityId(activePriorityId === task.id ? null : task.id)}
                                        >
                                            <div className={`h-1 w-3 rounded-full ${priorityOption?.dotColor || 'bg-gray-400'}`} />
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

                                    {/* Labels Column */}
                                    <td className="jira-td jira-td-labels border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                        <div className="flex flex-wrap gap-1.5 items-center h-full min-h-[24px]">
                                            {task.labels && task.labels.length > 0 ? (
                                                task.labels.map((label) => (
                                                    <span
                                                        key={label.id}
                                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                                                        style={{ backgroundColor: label.color || '#3b82f6' }}
                                                    >
                                                        {label.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-300 text-[11px] pl-1">—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Due Date Column */}
                                    <td className="jira-td jira-td-date border-r border-[#f4f5f7]" onClick={e => e.stopPropagation()}>
                                        <div className="jira-date-display border rounded px-1.5 py-1 bg-white hover:border-blue-400">
                                            {user?.role === 'admin' || user?.role === 'manager' ? (
                                                <input
                                                    type="date"
                                                    value={task.end_date?.split('T')[0] || ''}
                                                    onChange={(e) => handleDateChange(task.id, 'end_date', e.target.value, e as any)}
                                                    className="jira-date-input"
                                                />
                                            ) : (
                                                <span className="text-[11px] text-[#172b4d] font-medium py-0.5">
                                                    {formatDate(task.end_date)}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Duration Column */}
                                    <td className="jira-td jira-td-duration" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            defaultValue={(task as any).duration_time || (task as any).duration || ''}
                                            placeholder="—"
                                            onBlur={async (e) => {
                                                const val = e.target.value;
                                                try {
                                                    await taskApi.update(task.id, { duration_time: val } as any);
                                                    queryClient.invalidateQueries({ queryKey: ['tasks'] });
                                                } catch (err) {
                                                    console.error('Failed to update duration:', err);
                                                }
                                            }}
                                            className="w-full bg-transparent border-none text-[12px] focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 placeholder-gray-300"
                                        />
                                    </td>
                                </tr>

                                {/* Subtask Row */}
                                {activeSubtaskRow === task.id && (
                                    <tr className="jira-subtask-row bg-blue-50/30 border-l-4 border-blue-400">
                                        <td colSpan={9} className="p-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-3 ml-8">
                                                <CheckSquare className="w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Add subtask title..."
                                                    value={subtaskTitle}
                                                    onChange={(e) => setSubtaskTitle(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && subtaskTitle.trim()) {
                                                            // Handle subtask creation here
                                                            console.log('Creating subtask:', subtaskTitle, 'for task:', task.id);
                                                            setSubtaskTitle('');
                                                            setActiveSubtaskRow(null);
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setSubtaskTitle('');
                                                            setActiveSubtaskRow(null);
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2 text-[13px] border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setSubtaskTitle('');
                                                        setActiveSubtaskRow(null);
                                                    }}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
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

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
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

    const stats = {
        total: tasks.length,
        completed: tasks.filter((t: Task) => t.status.toLowerCase() === 'completed').length,
        pending: tasks.filter((t: Task) => t.status.toLowerCase() === 'pending').length,
        backlog: tasks.filter((t: Task) => t.status.toLowerCase() === 'backlog').length,
        inProgress: tasks.filter((t: Task) => t.status.toLowerCase() === 'in_progress').length,
        deployed: tasks.filter((t: Task) => t.status.toLowerCase() === 'deployed').length,
        deferred: tasks.filter((t: Task) => t.status.toLowerCase() === 'deferred').length,
        review: tasks.filter((t: Task) => t.status.toLowerCase() === 'review').length,

    };

    const handleAITaskGenerate = useCallback(async (projectId: number, description: string) => {
        console.log('Generating AI task for project:', projectId, 'with description:', description);
    }, [queryClient]);

    return (
        <div className="w-full p-8 space-y-8">
            {location.pathname.startsWith('/taskboard') && !location.pathname.endsWith('/create') ? (
                loading ? (
                    <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600" /></div>
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
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        title="List View"
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

                        {/* Content Section - Full Width & Height */}
                        <div className="flex-1 min-h-0">
                            {viewMode === 'grid' ? (
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredTasks.map((t: Task) => <TaskCard key={t.id} task={t} onTaskClick={handleTaskClick} />)}
                                </div>
                            ) : (
                                <TaskListView tasks={filteredTasks} onTaskClick={handleTaskClick} />
                            )}
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

            {showAITaskModal && (
                <AITask
                    onClose={() => setShowAITaskModal(false)}
                    onGenerate={handleAITaskGenerate}
                />
            )}
        </div>
    );
};