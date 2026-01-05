import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Menu,
    X,
    LayoutDashboard,
    FolderKanban,
    FileText,
    CheckSquare,
    Star,
    Users,
    Clock,
    CheckCircle,
    Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { projectsApi, documentsApi, taskApi } from '@/services/api';
import { cn } from '@/lib/utils';
import './Profile.scss';
import { Sidebar } from './Sidebar';

type TabType = 'overview' | 'tasks' | 'projects' | 'skills';

interface ProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Profile({ isOpen, onClose }: ProfileProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [location.pathname]);

    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list(),
    });

    const { data: documentsData } = useQuery({
        queryKey: ['documents'],
        queryFn: () => documentsApi.list(),
    });

    const { data: tasksData } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => taskApi.list(),
    });

    const { data: performanceData } = useQuery({
        queryKey: ['performance', user?.id],
        queryFn: () => user?.id ? taskApi.getPerformance(user.id) : null,
        enabled: !!user?.id,
    });

    const projects = projectsData?.results || [];
    const documents = documentsData?.results || [];
    const tasks = tasksData?.tasks || tasksData?.results || [];


    const handleNavigation = (href: string) => {
        navigate(href);
        onClose();
    };

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    const stats = {
        totalProjects: projects.length,
        totalDocuments: documents.length,
        totalTasks: tasks.length,
        completedTasks: performanceData?.completed_tasks_count || 0,
        inProgressTasks: performanceData?.in_progress_tasks_count || 0,
        pendingTasks: performanceData?.pending_tasks_count || 0,
    };

    const renderOverview = () => (
        <div className="profile-overview">
            <div className="profile-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon projects">
                        <FolderKanban />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalProjects}</div>
                        <div className="stat-label">Projects</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon documents">
                        <FileText />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalDocuments}</div>
                        <div className="stat-label">Documents</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon tasks">
                        <CheckSquare />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalTasks}</div>
                        <div className="stat-label">Total Tasks</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon completed">
                        <CheckCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.completedTasks}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
            </div>

            <div className="profile-section">
                <h3 className="section-title">Recent Activity</h3>
                <div className="activity-list">
                    {performanceData?.recent_activity?.slice(0, 5).map((activity: any, idx: number) => (
                        <div key={idx} className="activity-item">
                            <div className="activity-icon">
                                <Activity />
                            </div>
                            <div className="activity-content">
                                <div className="activity-title">{activity.task_name}</div>
                                <div className="activity-meta">
                                    <span>{activity.project_name}</span>
                                    <span>•</span>
                                    <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <span className={cn('activity-status', activity.status.toLowerCase())}>
                                {activity.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="profile-section">
                <h3 className="section-title">Project Distribution</h3>
                <div className="distribution-list">
                    {performanceData?.project_distribution?.map((proj: any, idx: number) => (
                        <div key={idx} className="distribution-item">
                            <div className="distribution-name">{proj.project_name}</div>
                            <div className="distribution-bar-container">
                                <div
                                    className="distribution-bar"
                                    style={{ width: `${(proj.task_count / stats.totalTasks) * 100}%` }}
                                />
                            </div>
                            <div className="distribution-count">{proj.task_count}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderTasks = () => {
        const tasksByStatus = {
            pending: tasks.filter((t: any) => t.status.toLowerCase() === 'pending'),
            in_progress: tasks.filter((t: any) => t.status.toLowerCase() === 'in_progress'),
            completed: tasks.filter((t: any) => t.status.toLowerCase() === 'completed'),
        };

        return (
            <div className="profile-tasks">
                <div className="tasks-summary">
                    <div className="summary-card pending">
                        <Clock />
                        <div>
                            <div className="summary-value">{tasksByStatus.pending.length}</div>
                            <div className="summary-label">Pending</div>
                        </div>
                    </div>
                    <div className="summary-card progress">
                        <Activity />
                        <div>
                            <div className="summary-value">{tasksByStatus.in_progress.length}</div>
                            <div className="summary-label">In Progress</div>
                        </div>
                    </div>
                    <div className="summary-card completed">
                        <CheckCircle />
                        <div>
                            <div className="summary-value">{tasksByStatus.completed.length}</div>
                            <div className="summary-label">Completed</div>
                        </div>
                    </div>
                </div>

                <div className="tasks-list">
                    {tasks.slice(0, 10).map((task: any) => (
                        <div key={task.id} className="task-item" onClick={() => handleNavigation('/taskboard')}>
                            <div className="task-icon">
                                <CheckSquare />
                            </div>
                            <div className="task-content">
                                <div className="task-title">{task.heading}</div>
                                <div className="task-meta">
                                    {task.project_name && <span>{task.project_name}</span>}
                                    {task.end_date && (
                                        <>
                                            <span>•</span>
                                            <span>{new Date(task.end_date).toLocaleDateString()}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className={cn('task-status', task.status.toLowerCase())}>
                                {task.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderProjects = () => (
        <div className="profile-projects">
            <div className="projects-grid">
                {projects.map((project: any) => (
                    <div
                        key={project.id}
                        className="project-card"
                        onClick={() => handleNavigation(`/projects/${project.id}`)}
                    >
                        <div className="project-header">
                            <div className="project-icon">
                                <FolderKanban />
                            </div>
                            <div className="project-badge">{project.task_type}</div>
                        </div>
                        <div className="project-title">{project.name}</div>
                        <div className="project-description">{project.description}</div>
                        <div className="project-stats">
                            <div className="project-stat">
                                <FileText className="stat-icon" />
                                <span>{project.document_count || 0} docs</span>
                            </div>
                            <div className="project-stat">
                                <Users className="stat-icon" />
                                <span>{project.member_count || 0} members</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSkills = () => (
        <div className="profile-skills">
            <div className="skills-empty">
                <Star className="skills-icon" />
                <h3>No skills items yet</h3>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
    <div className="fixed inset-0 z-50 bg-background flex overflow-hidden">
        
        {/* Left Sidebar*/}
       <aside 
            className="w-64 border-r bg-card flex-shrink-0"
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('a, button')) {
                    onClose();
                }
            }}
        >
            <Sidebar />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
            
            {/* Header */}
            <div className="profile-header flex items-center justify-between p-4 border-b">
                <div className="header-left flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold">{user?.username}</span>
                </div>
                <button 
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors" 
                    onClick={onClose}
                >
                    <X className="h-6 w-6 text-slate-500" />
                </button>
            </div>

            {/* Content Tabs */}
            <div className="profile-tabs flex gap-8 px-8 py-4 border-b">
                {(['overview', 'tasks', 'projects', 'skills'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={cn(
                            'flex items-center gap-2 pb-2 text-sm font-medium transition-all border-b-2',
                            activeTab === tab 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' && <LayoutDashboard className="h-4 w-4" />}
                        {tab === 'tasks' && <CheckSquare className="h-4 w-4" />}
                        {tab === 'projects' && <FolderKanban className="h-4 w-4" />}
                        {tab === 'skills' && <Star className="h-4 w-4" />}
                        <span className="capitalize">{tab}</span>
                    </button>
                ))}
            </div>

            {/* Scrollable Content */}
            <div className="profile-content flex-1 overflow-y-auto p-8">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'tasks' && renderTasks()}
                {activeTab === 'projects' && renderProjects()}
                {activeTab === 'skills' && renderSkills()}
            </div>
        </div>
    </div>
);
}