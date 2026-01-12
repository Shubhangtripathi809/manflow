import React, { useState, useMemo, useCallback} from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Users,
    Grid3X3,
    List,
} from 'lucide-react'; 
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { TaskDetailModal } from '../MyTask/TaskDetailModal';
import { Task, getStatusConfig } from '../MyTask/MyTask';
import './Calendar.scss';

type ViewMode = 'month' | 'week';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];


const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'high':
            return '#ef4444';
        case 'medium':
            return '#f59e0b';
        case 'low':
            return '#22c55e';
        default:
            return '#6b7280';
    }
};

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    tasks: Task[];
}

interface TaskEventProps {
    task: Task;
    onClick: (task: Task) => void;
    compact?: boolean;
}

const TaskEvent: React.FC<TaskEventProps> = ({ task, onClick, compact = false }) => {
    const statusConfig = getStatusConfig(task.status);
    const StatusIcon = statusConfig.icon;

    return (
        <div
            className={`task-event ${statusConfig.bg} ${compact ? 'compact' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick(task);
            }}
            title={task.heading}
        >
            <div className="task-event-indicator" style={{ backgroundColor: statusConfig.color }} />
            <div className="task-event-content">
                <StatusIcon className="task-event-icon" size={compact ? 10 : 12} />
                <span className="task-event-title">{task.heading}</span>
            </div>
            {!compact && task.priority && (
                <div
                    className="task-event-priority"
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                />
            )}
        </div>
    );
};

interface DayCellProps {
    day: CalendarDay;
    onTaskClick: (task: Task) => void;
    onDateClick: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = ({ day, onTaskClick, onDateClick }) => {
    const maxVisibleTasks = 3;
    const visibleTasks = day.tasks.slice(0, maxVisibleTasks);
    const remainingCount = day.tasks.length - maxVisibleTasks;

    return (
        <div
            className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}`}
            onClick={() => onDateClick(day.date)}
        >
            <div className="day-header">
                <span className={`day-number ${day.isToday ? 'today-badge' : ''}`}>
                    {day.date.getDate()}
                </span>
                {day.tasks.length > 0 && (
                    <span className="task-count">{day.tasks.length}</span>
                )}
            </div>
            <div className="day-tasks">
                {visibleTasks.map((task) => (
                    <TaskEvent
                        key={task.id}
                        task={task}
                        onClick={onTaskClick}
                        compact={day.tasks.length > 2}
                    />
                ))}
                {remainingCount > 0 && (
                    <div className="more-tasks">+{remainingCount} more</div>
                )}
            </div>
        </div>
    );
};

interface WeekViewProps {
    currentDate: Date;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ currentDate, tasks, onTaskClick }) => {
    const getWeekDays = () => {
        const days: Date[] = [];
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const weekDays = getWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getTasksForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return tasks.filter((task) => {
            const startDate = task.start_date?.split('T')[0];
            const endDate = task.end_date?.split('T')[0];
            return (startDate && startDate <= dateStr && endDate && endDate >= dateStr) ||
                startDate === dateStr ||
                endDate === dateStr;
        });
    };

    return (
        <div className="week-view">
            <div className="week-header">
                {weekDays.map((day, index) => {
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                        <div key={index} className={`week-header-cell ${isToday ? 'today' : ''}`}>
                            <span className="week-day-name">{DAYS_OF_WEEK[index]}</span>
                            <span className={`week-day-number ${isToday ? 'today-badge' : ''}`}>
                                {day.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="week-body">
                {weekDays.map((day, index) => {
                    const dayTasks = getTasksForDate(day);
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                        <div key={index} className={`week-day-column ${isToday ? 'today' : ''}`}>
                            {dayTasks.map((task) => (
                                <TaskEvent key={task.id} task={task} onClick={onTaskClick} />
                            ))}
                            {dayTasks.length === 0 && (
                                <div className="no-tasks-indicator">No tasks</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface TaskListSidebarProps {
    tasks: Task[];
    selectedDate: Date | null;
    onTaskClick: (task: Task) => void;
    onClose: () => void;
}

const TaskListSidebar: React.FC<TaskListSidebarProps> = ({
    tasks,
    selectedDate,
    onTaskClick,
    onClose,
}) => {
    if (!selectedDate) return null;

    const formatDateLong = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="task-list-sidebar">
            <div className="sidebar-header">
                <h3>{formatDateLong(selectedDate)}</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="sidebar-content">
                {tasks.length === 0 ? (
                    <div className="no-tasks-message">
                        <CalendarIcon size={48} className="no-tasks-icon" />
                        <p>No tasks scheduled for this day</p>
                    </div>
                ) : (
                    <div className="task-list">
                        {tasks.map((task) => {
                            const statusConfig = getStatusConfig(task.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                                <div
                                    key={task.id}
                                    className="task-list-item"
                                    onClick={() => onTaskClick(task)}
                                >
                                    <div className="task-status-badge" style={{ backgroundColor: statusConfig.color }}>
                                        <StatusIcon size={14} />
                                    </div>
                                    <div className="task-info">
                                        <h4>{task.heading}</h4>
                                        <div className="task-meta">
                                            <span className="task-priority" style={{ color: getPriorityColor(task.priority) }}>
                                                {task.priority || 'Normal'}
                                            </span>
                                            {task.assigned_to_user_details?.length > 0 && (
                                                <span className="task-assignees">
                                                    <Users size={12} />
                                                    {task.assigned_to_user_details.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const Calendar: React.FC = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => taskApi.list(),
        enabled: !!user,
    });

    const tasks = useMemo(() => {
        if (!tasksData || !user) return [];
        const allTasks = Array.isArray(tasksData) ? tasksData : tasksData.tasks || tasksData.results || [];

        if (user.role === 'admin') {
            return allTasks;
        }

        if (user.role === 'manager') {
            return allTasks.filter((task: Task) =>
                task.assigned_by === user.id || task.assigned_to.includes(user.id)
            );
        }

        return allTasks.filter((task: Task) => task.assigned_to.includes(user.id));
    }, [tasksData, user]);

    const getCalendarDays = useCallback((): CalendarDay[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

        const endDate = new Date(lastDayOfMonth);
        const daysToAdd = 6 - lastDayOfMonth.getDay();
        endDate.setDate(endDate.getDate() + daysToAdd);

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDateIter = new Date(startDate);
        while (currentDateIter <= endDate) {
            const dateStr = currentDateIter.toISOString().split('T')[0];
            const dayTasks = tasks.filter((task: Task) => {
                const startDateStr = task.start_date?.split('T')[0];
                const endDateStr = task.end_date?.split('T')[0];

                // Task appears on calendar if:
                // 1. Current date is between start and end dates (inclusive)
                // 2. Or if only start_date matches
                // 3. Or if only end_date matches
                if (startDateStr && endDateStr) {
                    return dateStr >= startDateStr && dateStr <= endDateStr;
                }
                return startDateStr === dateStr || endDateStr === dateStr;
            });

            days.push({
                date: new Date(currentDateIter),
                isCurrentMonth: currentDateIter.getMonth() === month,
                isToday: currentDateIter.toDateString() === today.toDateString(),
                tasks: dayTasks,
            });

            currentDateIter.setDate(currentDateIter.getDate() + 1);
        }

        return days;
    }, [currentDate, tasks]);

    const calendarDays = useMemo(() => getCalendarDays(), [getCalendarDays]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            if (viewMode === 'month') {
                newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            } else {
                newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
            }
            return newDate;
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    const handleDateClick = useCallback((date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayTasks = tasks.filter((task: Task) => {
            const startDateStr = task.start_date?.split('T')[0];
            const endDateStr = task.end_date?.split('T')[0];
            if (startDateStr && endDateStr) {
                return dateStr >= startDateStr && dateStr <= endDateStr;
            }
            return startDateStr === dateStr || endDateStr === dateStr;
        });

        if (dayTasks.length > 0) {
            setSelectedDate(date);
        }
    }, [tasks]);

    const selectedDateTasks = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = selectedDate.toISOString().split('T')[0];
        return tasks.filter((task: Task) => {
            const startDateStr = task.start_date?.split('T')[0];
            const endDateStr = task.end_date?.split('T')[0];
            if (startDateStr && endDateStr) {
                return dateStr >= startDateStr && dateStr <= endDateStr;
            }
            return startDateStr === dateStr || endDateStr === dateStr;
        });
    }, [selectedDate, tasks]);

    const getHeaderTitle = () => {
        if (viewMode === 'month') {
            return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
            return `${MONTHS[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
        }
        return `${MONTHS[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${MONTHS[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    };

    const taskStats = useMemo(() => {
        return {
            total: tasks.length,
            completed: tasks.filter((t: Task) => t.status.toLowerCase() === 'completed').length,
            inProgress: tasks.filter((t: Task) => t.status.toLowerCase() === 'in_progress').length,
            pending: tasks.filter((t: Task) => t.status.toLowerCase() === 'pending').length,
        };
    }, [tasks]);

    if (isLoading) {
        return (
            <div className="calendar-loading">
                <div className="loading-spinner" />
                <p>Loading calendar...</p>
            </div>
        );
    }

    return (
        < div className="full-width-calendar-wrapper">
            < div className="calendar-container" >
                {/* Header */}
                <div className="calendar-header" >
                    <div className="header-left">
                        <div className="title-with-picker">
                            <h1 className="calendar-title">
                                <CalendarIcon className="title-icon clickable" />
                                Calendar
                            </h1>
                        </div>
                        <p className="calendar-subtitle">View and manage your tasks</p>
                    </div>

                    <div className="header-stats">
                        <div className="stat-item">
                            <span className="stat-value">{taskStats.total}</span>
                            <span className="stat-label">Total</span>
                        </div>
                        <div className="stat-item completed">
                            <span className="stat-value">{taskStats.completed}</span>
                            <span className="stat-label">Done</span>
                        </div>
                        <div className="stat-item in-progress">
                            <span className="stat-value">{taskStats.inProgress}</span>
                            <span className="stat-label">Active</span>
                        </div>
                        <div className="stat-item pending">
                            <span className="stat-value">{taskStats.pending}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                </div >

                {/* Controls */}
                <div className="calendar-controls" >
                    <div className="controls-left">
                        <button className="today-btn" onClick={goToToday}>
                            Today
                        </button>
                        <div className="nav-buttons">
                            <button className="nav-btn" onClick={() => navigateMonth('prev')}>
                                <ChevronLeft size={20} />
                            </button>
                            <button className="nav-btn" onClick={() => navigateMonth('next')}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <h2 className="current-period">{getHeaderTitle()}</h2>
                    </div>

                    <div className="controls-right">
                        <div className="view-toggle">
                            <button
                                className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
                                onClick={() => setViewMode('month')}
                            >
                                <Grid3X3 size={16} />
                                Month
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
                                onClick={() => setViewMode('week')}
                            >
                                <List size={16} />
                                Week
                            </button>
                        </div>
                    </div>
                </div >

                {/* Calendar Body */}
                <div className={`calendar-body ${selectedDate ? 'with-sidebar' : ''}`}>
                    <div className="calendar-main">
                        {viewMode === 'month' ? (
                            <div className="month-view">
                                <div className="weekday-header">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <div key={day} className="weekday-cell">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="days-grid">
                                    {calendarDays.map((day, index) => (
                                        <DayCell
                                            key={index}
                                            day={day}
                                            onTaskClick={handleTaskClick}
                                            onDateClick={handleDateClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <WeekView
                                currentDate={currentDate}
                                tasks={tasks}
                                onTaskClick={handleTaskClick}
                            />
                        )}
                    </div>

                    {
                        selectedDate && (
                            <TaskListSidebar
                                tasks={selectedDateTasks}
                                selectedDate={selectedDate}
                                onTaskClick={handleTaskClick}
                                onClose={() => setSelectedDate(null)}
                            />
                        )
                    }
                </div >

                {/* Status Legend */}
                < div className="calendar-legend" >
                    <span className="legend-title">Status:</span>
                    <div className="legend-items">
                        {[
                            { status: 'pending', label: 'Pending' },
                            { status: 'in_progress', label: 'In Progress' },
                            { status: 'completed', label: 'Completed' },
                            { status: 'deployed', label: 'Deployed' },
                            { status: 'deferred', label: 'Deferred' },
                        ].map(({ status, label }) => {
                            const config = getStatusConfig(status);
                            return (
                                <div key={status} className="legend-item">
                                    <span className="legend-dot" style={{ backgroundColor: config.color }} />
                                    <span className="legend-label">{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div >

                {/* Task Detail Modal */}
                {
                    selectedTask && (
                        <TaskDetailModal
                            task={selectedTask}
                            onClose={() => setSelectedTask(null)}
                            onDelete={async () => {
                                setSelectedTask(null);
                            }}
                            onTaskUpdated={(updatedTask) => {
                                setSelectedTask(updatedTask);
                            }}
                        />
                    )
                }
            </div >
        </div >
    );
};

export default Calendar;