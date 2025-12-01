import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  FileText,
  TestTube2,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common';
import { projectsApi } from '@/services/api';
import { formatRelativeTime } from '@/lib/utils';

export function Dashboard() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const stats = [
    {
      name: 'Total Projects',
      value: projects?.results?.length || 0,
      icon: FolderKanban,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      name: 'Documents',
      value: projects?.results?.reduce(
        (acc: number, p: { document_count: number }) => acc + (p.document_count || 0),
        0
      ) || 0,
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      name: 'Test Runs',
      value: '-',
      icon: TestTube2,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      name: 'Open Issues',
      value: '-',
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your QA and ground truth management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects?.results?.length > 0 ? (
              <div className="space-y-4">
                {projects.results.slice(0, 5).map((project: {
                  id: number;
                  name: string;
                  task_type: string;
                  document_count: number;
                  updated_at: string;
                }) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.task_type} • {project.document_count} documents
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(project.updated_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No projects yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <a
                href="/projects/new"
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                <span>Create new project</span>
              </a>
              <a
                href="/documents/new"
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span>Upload documents</span>
              </a>
              <a
                href="/test-runs/new"
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <TestTube2 className="h-5 w-5 text-muted-foreground" />
                <span>Run new test</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
