import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import {
  FolderKanban,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Filter,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/common';
import { projectsApi, documentsApi, taskApi, } from '@/services/api';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Document } from '@/types';
import { TaskCard } from '@/pages/MyTask/MyTask';

// Type Definitions
type TaskStatus = 'pending' | 'backlog' | 'in_progress' | 'completed' | 'deployed' | 'deferred';

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
  status: TaskStatus;
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [selectedTaskStatus, setSelectedTaskStatus] = React.useState<TaskStatus>('pending');
  const [showStatusFilter, setShowStatusFilter] = React.useState(false);

  // Data Fetching
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => projectsApi.list(),
  });

  const { data: tasksResponse } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => taskApi.list(),
  });

  // Data Processing
  const projects = projectsData?.results || projectsData || [];
  const documents = documentsData?.results || documentsData || [];

  const allTasks: Task[] = React.useMemo(() => {
    if (!tasksResponse) {
      return [];
    }

    let tasks: Task[] = [];
    if (Array.isArray(tasksResponse.tasks)) {
      tasks = tasksResponse.tasks;
    } else if (Array.isArray(tasksResponse.results)) {
      tasks = tasksResponse.results;
    } else if (Array.isArray(tasksResponse)) {
      tasks = tasksResponse;
    }


    // Log first task to see structure
    if (tasks.length > 0) {
    }

    return tasks;
  }, [tasksResponse]);

  const myAssignedTasks = React.useMemo(() => {
    return allTasks;
  }, [allTasks]);

  const filteredTasks = React.useMemo(() => {
    const normalizeStatus = (status: string) => {
      return status.toLowerCase().replace(/[_\s-]/g, '');
    };

    const filtered = myAssignedTasks.filter(task => {
      const taskStatus = normalizeStatus(task.status);
      const selectedStatus = normalizeStatus(selectedTaskStatus);
      const matches = taskStatus === selectedStatus;
      return matches;
    });
    return filtered;
  }, [myAssignedTasks, selectedTaskStatus]);

  // Status Options Configuration
  const statusOptions: Array<{ value: TaskStatus; label: string; color: string }> = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
    { value: 'backlog', label: 'Backlog', color: 'text-orange-600' },
    { value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
    { value: 'completed', label: 'Completed', color: 'text-green-600' },
    { value: 'deployed', label: 'Deployed', color: 'text-purple-600' },
    { value: 'deferred', label: 'Deferred', color: 'text-gray-600' },
  ];

  // Statistics
  const stats = {
    totalTasks: tasksData?.tasks?.length || tasksData?.results?.length || 0,
    totalProjects: projects.length,
    totalDocuments: documents.length,
    draftDocs: documents.filter((d: Document) => d.status === 'draft').length,
    inReviewDocs: documents.filter((d: Document) => d.status === 'in_review').length,
    approvedDocs: documents.filter((d: Document) => d.status === 'approved').length,
  };

  const recentProjects = projects.slice(0, 5);
  const recentDocuments = documents.slice(0, 5);

  const isLoading = projectsLoading || docsLoading;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{user?.first_name ? `, ${user.first_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your ground truth management
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Tasks Card */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/taskboard')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasks
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <span className="text-xs text-primary hover:underline">
                Go to Taskboard
              </span>
            </CardContent>
          </Card>

          {/* 2. Projects Card */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/projects')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <Link to="/projects" className="text-xs text-primary hover:underline">
                View all projects
              </Link>
            </CardContent>
          </Card>

          {/* 3. Total Documents Card */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/documents')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <Link to="/documents" className="text-xs text-primary hover:underline">
                View all documents
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Review - Design 1: Compact List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {statusOptions.find(s => s.value === selectedTaskStatus)?.label}
            </CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusFilter(!showStatusFilter)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showStatusFilter && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStatusFilter(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20 py-1">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedTaskStatus(option.value);
                          setShowStatusFilter(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedTaskStatus === option.value ? 'bg-gray-100' : ''
                          }`}
                      >
                        <span className={option.color}>{option.label}</span>
                        {selectedTaskStatus === option.value && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  No {selectedTaskStatus} tasks assigned to you
                </p>
                <p className="text-xs text-gray-400">
                  {myAssignedTasks.length > 0
                    ? `You have ${myAssignedTasks.length} total assigned task(s) in other statuses`
                    : 'No tasks are currently assigned to you'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-2">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onTaskClick={() => navigate(`/taskboard`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Documents
            </CardTitle>
            <Link to="/documents">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((doc: Document) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.project_name || `Project ${doc.project}`}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No documents yet</p>
                <Link to="/projects">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Document
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Recent Projects
          </CardTitle>
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentProjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project: Project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderKanban className="h-4 w-4 text-primary" />
                    </div>
                    <div className="font-medium truncate">{project.name}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {project.task_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{project.document_count || 0} documents</span>
                    <span>{formatRelativeTime(project.updated_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No projects yet</p>
              <Link to="/projects/new">
                <Button variant="outline" size="sm" className="mt-2">
                  Create Project
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link to="/projects/new">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FolderKanban className="h-6 w-6" />
                <span>New Project</span>
              </Button>
            </Link>
            <Link to="/documents">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>Browse Documents</span>
              </Button>
            </Link>
            <Link to="/documents?status=in_review">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Clock className="h-6 w-6" />
                <span>Review Queue</span>
              </Button>
            </Link>
            <Link to="/documents?status=approved">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <CheckCircle className="h-6 w-6" />
                <span>Approved Docs</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}