import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/common';
import { projectsApi } from '@/services/api';
import type { Project } from '@/types';
import { ViewToggle, DualView, useViewMode, } from '@/components/layout/DualView';
import {
 getProjectsTableColumns,
  ProjectGridCard,
} from '@/components/layout/DualView/projectsConfig';

export function Projects() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('');
  const { viewMode, setViewMode } = useViewMode({
    defaultMode: 'table',
    storageKey: 'projects-view-mode',
  });

  const toggleFavorite = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await projectsApi.update(project.id, {
        is_favourite: !project.is_favourite,
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };
  const columns = getProjectsTableColumns(toggleFavorite);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filter],
    queryFn: () => projectsApi.list(filter ? { task_type: filter } : undefined),
    staleTime: 1000 * 60 * 10,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = (() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (
      typeof data === 'object' &&
      'results' in data &&
      Array.isArray(data.results)
    ) {
      return data.results;
    }
    return [];
  })() as Project[];

  const emptyState = (
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
  );

  return (
    <div className="w-full p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your ground truth and testing projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Link to="/projects/new">
            <Button>
              New Project
            </Button>
          </Link>
        </div>
      </div>

      <DualView
        viewMode={viewMode}
        isLoading={isLoading}
        gridProps={{
          data: projects,
          renderCard: (project: any) => (
            <ProjectGridCard
              key={project.id}
              project={project}
              onToggleFavorite={toggleFavorite}
            />
          ),
          emptyState,
          gridClassName: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
        }}
        tableProps={{
          data: projects,
          columns: columns,
          rowKey: (project: any) => project.id,
          onRowClick: (project: any) =>
            (window.location.href = `/projects/${project.id}`),
          emptyState,
          rowClassName: () => 'group',
        }}
      />
    </div>
  );
}