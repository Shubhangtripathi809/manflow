import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, FileText, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/common';
import { projectsApi } from '@/services/api';
import { formatRelativeTime } from '@/lib/utils';
import type { Project } from '@/types';

const TASK_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'key_value', label: 'Key-Value Extraction' },
  { value: 'table', label: 'Table Extraction' },
  { value: 'classification', label: 'Document Classification' },
  { value: 'ocr', label: 'OCR' },
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'ideas', label: 'Ideas' },
];

export function Projects() {
  const [filter, setFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filter],
    queryFn: () => projectsApi.list(filter ? { task_type: filter } : undefined),
  });

  const projects = data?.results || data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your ground truth and testing projects
          </p>
        </div>
        <Link to="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      {/* <div className="flex gap-2 flex-wrap">
        {TASK_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div> */}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {project.task_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {project.document_count || 0} docs
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project.member_count || 0} members
                      </span>
                    </div>

                    {/* Member Names Section */}
                    {project.members && project.members.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.members.slice(0, 3).map((member) => (
                          <Badge
                            key={member.id}
                            variant="outline"
                            className="text-[10px] px-2 py-0 font-normal bg-muted/30"
                          >
                            {member.full_name}
                          </Badge>
                        ))}
                        {project.members.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{project.members.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Updated {formatRelativeTime(project.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Link to="/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
