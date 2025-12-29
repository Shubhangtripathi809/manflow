import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/common';
import { projectsApi, documentsApi } from '@/services/api';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Document } from '@/types';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const projects = projectsData?.results || projectsData || [];
  const documents = documentsData?.results || documentsData || [];

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => projectsApi.list(),
  });

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
  const pendingReview = documents.filter((d: Document) => d.status === 'in_review').slice(0, 5);

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
                Total Documents
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

          {/* 4. Draft Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.draftDocs}</div>
              <Link to="/documents?status=draft" className="text-xs text-primary hover:underline">
                View drafts
              </Link>
            </CardContent>
          </Card>

          {/* 5. In Review Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Review
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inReviewDocs}</div>
              <Link to="/documents?status=in_review" className="text-xs text-primary hover:underline">
                View pending
              </Link>
            </CardContent>
          </Card>

          {/* 6. Approved Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approvedDocs}</div>
              <Link to="/documents?status=approved" className="text-xs text-primary hover:underline">
                View approved
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Review
            </CardTitle>
            <Link to="/documents?status=in_review">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingReview.length > 0 ? (
              <div className="space-y-3">
                {pendingReview.map((doc: Document) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100">
                        <FileText className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.project_name || `Project ${doc.project}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(doc.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No documents pending review</p>
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