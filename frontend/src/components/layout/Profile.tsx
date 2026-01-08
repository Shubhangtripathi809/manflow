import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronDown,
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
    Plus,
    Trash2,
    Edit2,
    Save,
    X as XIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { projectsApi, documentsApi, taskApi, authApi } from '@/services/api';
import { Skill } from '@/types';
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
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    console.log('[Profile] Render - isOpen:', isOpen, 'pathname:', location.pathname);
    const { data: freshUserData, refetch: refetchUser } = useQuery({
        queryKey: ['fresh-user-data'],
        queryFn: () => authApi.getMe(),
        enabled: isOpen,
    });
    const [skills, setSkills] = useState<Skill[]>([]);
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
    const [newSkill, setNewSkill] = useState<Skill>({
        name: '',
        proficiency: 'Beginner',
        category: 'other'
    });
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const categories = ['frontend', 'backend', 'other'];
    const levelOptions: Array<{ label: string; value: Skill['proficiency'] }> = [
        { label: 'Learning', value: 'Learning' },
        { label: 'Beginner', value: 'Beginner' },
        { label: 'Intermediate', value: 'Intermediate' },
        { label: 'Advance', value: 'Advance' },
    ];

    const queryClient = useQueryClient();
    console.log('[Profile Debug] Component Rendered. Current window.location:', window.location.pathname);
    console.log('[Profile Debug] Router location.pathname:', location.pathname);
    console.log('[Profile Debug] Modal isOpen state:', isOpen);


    // Sync fresh user data with skills when profile opens
    useEffect(() => {
        if (isOpen && freshUserData?.skills) {
            setSkills(freshUserData.skills);
        }
    }, [isOpen, freshUserData]);

    // Refetch user data when profile opens
    useEffect(() => {
        if (isOpen) {
            refetchUser();
        }
    }, [isOpen, refetchUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.level-dropdown') &&
                !target.closest('.level-dropdown-trigger') &&
                !target.closest('.skill-category-select') &&
                !target.closest('[data-category-dropdown]')) {
                setLevelDropdownOpen(false);
                setCategoryDropdownOpen(false);
            }
        };

        if (levelDropdownOpen || categoryDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [levelDropdownOpen, categoryDropdownOpen]);

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

    // Mutation for updating skills
    const updateSkillsMutation = useMutation({
        mutationFn: (updatedSkills: Skill[]) => authApi.updateSkills(updatedSkills),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            queryClient.invalidateQueries({ queryKey: ['fresh-user-data'] });
            refetchUser();
        },
    });

    const projects = projectsData?.results || [];
    const documents = documentsData?.results || [];
    const tasks = tasksData?.tasks || tasksData?.results || [];

    const handleNavigation = (href: string) => {
        navigate(href);
    };

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    // Skill handlers
    const handleAddSkill = () => {
        if (newSkill.name.trim()) {
            const updatedSkills = [...skills, newSkill];
            setSkills(updatedSkills);
            updateSkillsMutation.mutate(updatedSkills);
            setNewSkill({ name: '', proficiency: 'Beginner', category: 'other' });
            setIsAddingSkill(false);
        }
    };

    const handleUpdateSkill = (index: number) => {
        updateSkillsMutation.mutate(skills);
        setEditingIndex(null);
    };

    const handleDeleteSkill = (index: number) => {
        const updatedSkills = skills.filter((_, i) => i !== index);
        setSkills(updatedSkills);
        updateSkillsMutation.mutate(updatedSkills);
    };

   const handleCancelEdit = () => {
        setEditingIndex(null);
        setIsAddingSkill(false);
        setNewSkill({ name: '', proficiency: 'Beginner', category: 'other' }); 
        setLevelDropdownOpen(false);
        setCategoryDropdownOpen(false);
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

    const renderSkills = () => {
        const groupedSkills = {
            frontend: skills.filter(s => s.category === 'frontend'),
            backend: skills.filter(s => s.category === 'backend'),
            other: skills.filter(s => s.category === 'other'),
        };

        const renderSkillCard = (skill: typeof skills[0], index: number, category: string) => {
            const actualIndex = skills.findIndex(s => s.name === skill.name && s.category === category);
            const isEditing = editingIndex === actualIndex;

            return (
                <div key={actualIndex} className="skill-card">
                    {isEditing ? (
                        <div className="skill-edit">
                            <input
                                type="text"
                                value={skills[actualIndex].name}
                                onChange={(e) => {
                                    const updated = [...skills];
                                    updated[actualIndex].name = e.target.value;
                                    setSkills(updated);
                                }}
                                className="skill-input"
                                placeholder="Skill name"
                            />
                            <select
                                value={skills[actualIndex].category}
                                onChange={(e) => {
                                    const updated = [...skills];
                                    updated[actualIndex].category = e.target.value;
                                    setSkills(updated);
                                }}
                                className="skill-category-select"
                            >
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="other">Other</option>
                            </select>
                            <div className="skill-actions">
                                <button onClick={() => handleUpdateSkill(actualIndex)} className="btn-save">
                                    <Save className="h-4 w-4" />
                                </button>
                                <button onClick={handleCancelEdit} className="btn-cancel">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="skill-header">
                                <h4 className="skill-name">{skill.name}</h4>
                                <div className="skill-actions">
                                    <button onClick={() => setEditingIndex(actualIndex)} className="btn-edit">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteSkill(actualIndex)} className="btn-delete">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="skill-progress">
                                <div className="skill-progress-bar" style={{
                                    width: skill.proficiency === 'Advance' ? '100%' :
                                        skill.proficiency === 'Intermediate' ? '75%' :
                                            skill.proficiency === 'Beginner' ? '50%' : '25%'
                                }} />
                            </div>
                            <div className="skill-level">{skill.proficiency} Level</div>
                        </>
                    )}
                </div>
            );
        };

        return (
            <div className="profile-skills">
                {/* Add Skill Button at Top */}
                <div className="skills-header mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">My Skills</h2>
                    <button
                        onClick={() => setIsAddingSkill(true)}
                        className="btn-add-skill-compact"
                        disabled={isAddingSkill}
                    >
                        <Plus className="h-5 w-5" />
                        Add Skill
                    </button>
                </div>

                {/* Add Skill Form */}
                {isAddingSkill && (
                    <div className="add-skill-form-improved mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Add New Skill</h3>
                            <button
                                onClick={handleCancelEdit}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="skill-input-container relative">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Skill Name</label>
                                <input
                                    type="text"
                                    value={newSkill.name}
                                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                                    onFocus={() => {
                                        setLevelDropdownOpen(false);
                                        setCategoryDropdownOpen(false);
                                    }}
                                    placeholder="e.g., React, Python, UI/UX Design"
                                    className="skill-input w-full"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative z-0" data-category-dropdown>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                                    <div
                                        className="w-full p-2.5 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex items-center justify-between min-h-[42px] text-sm transition-colors"
                                        onClick={() => {
                                            setCategoryDropdownOpen(!categoryDropdownOpen);
                                            setLevelDropdownOpen(false);
                                        }}
                                    >
                                        <span className="capitalize text-gray-700">{newSkill.category}</span>
                                        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", categoryDropdownOpen && "rotate-180")} />
                                    </div>
                                    {categoryDropdownOpen && (
                                        <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                                            {categories.map((cat) => (
                                                <div
                                                    key={cat}
                                                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm capitalize flex items-center justify-between"
                                                    onClick={() => {
                                                        setNewSkill({ ...newSkill, category: cat });
                                                        setCategoryDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{cat}</span>
                                                    {newSkill.category === cat && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10 level-dropdown">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Proficiency Level</label>
                                    <div
                                        className="level-dropdown-trigger w-full p-2.5 rounded border border-gray-300 hover:border-gray-400 cursor-pointer bg-white flex items-center justify-between min-h-[42px] text-sm transition-colors"
                                        onClick={() => {
                                            setLevelDropdownOpen(!levelDropdownOpen);
                                            setCategoryDropdownOpen(false);
                                        }}
                                    >
                                        <span className="text-gray-700">{newSkill.proficiency}</span>
                                        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", levelDropdownOpen && "rotate-180")} />
                                    </div>

                                    {levelDropdownOpen && (
                                        <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                            {levelOptions.map((opt) => (
                                                <div
                                                    key={opt.label}
                                                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between"
                                                    onClick={() => {
                                                        setNewSkill({ ...newSkill, proficiency: opt.value });
                                                        setLevelDropdownOpen(false);
                                                    }}
                                                >
                                                    {opt.label}
                                                    {newSkill.proficiency === opt.label && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-actions flex gap-3 pt-2">
                                <button onClick={handleAddSkill} className="btn-primary flex-1">Add Skill</button>
                                <button onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {skills.length === 0 && !isAddingSkill ? (
                    <div className="skills-empty">
                        <Star className="skills-icon" />
                        <h3>No skills added yet</h3>
                        <p>Start building your skills profile</p>
                    </div>
                ) : (
                    <>
                        {groupedSkills.backend.length > 0 && (
                            <div className="skills-category">
                                <h3 className="category-title">Backend Skills</h3>
                                <div className="skills-grid">
                                    {groupedSkills.backend.map((skill, idx) => renderSkillCard(skill, idx, 'backend'))}
                                </div>
                            </div>
                        )}

                        {groupedSkills.frontend.length > 0 && (
                            <div className="skills-category">
                                <h3 className="category-title">Frontend Skills</h3>
                                <div className="skills-grid">
                                    {groupedSkills.frontend.map((skill, idx) => renderSkillCard(skill, idx, 'frontend'))}
                                </div>
                            </div>
                        )}

                        {groupedSkills.other.length > 0 && (
                            <div className="skills-category">
                                <h3 className="category-title">Other Skills</h3>
                                <div className="skills-grid">
                                    {groupedSkills.other.map((skill, idx) => renderSkillCard(skill, idx, 'other'))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background flex overflow-hidden">

            {/* Left Sidebar*/}
            <aside
                className="w-64 border-r bg-card flex-shrink-0"
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