import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, FileText, Users, UsersIcon } from 'lucide-react';
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
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'ideas', label: 'Ideas' },
];

export function Projects() {
  const [filter, setFilter] = useState<string>('');
  const [openMembersCard, setOpenMembersCard] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filter],
    queryFn: () => projectsApi.list(filter ? { task_type: filter } : undefined),
    refetchOnMount: true,
    staleTime: 0,
  });

  const projects = (() => {

    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  })() as Project[];


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

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
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
                          {project.task_type?.replace('_', ' ') || 'General'}
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
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMembersCard(openMembersCard === project.id ? null : project.id);
                          }}
                          className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Users className="h-4 w-4" />
                          {project.member_count || 0} members
                        </button>

                        {openMembersCard === project.id && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 z-[100]"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMembersCard(null);
                              }}
                            />

                            {/* Popup */}
                            <div
                              className="absolute left-0 top-full mt-2 z-[101] w-72 bg-background border border-border rounded-lg shadow-xl"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <div className="p-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <UsersIcon className="h-4 w-4" />
                                    Project Members
                                  </h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {project.members?.length || project.member_count || 0}
                                  </Badge>
                                </div>
                              </div>

                              <div className="max-h-64 overflow-y-auto p-2">
                                {project.members && project.members.length > 0 ? (
                                  <div className="space-y-1">
                                    {project.members.map((member) => {
                                      const userData = member.user;
                                      const initials = userData.full_name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2);

                                      return (
                                        <div
                                          key={member.id}
                                          className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                                        >
                                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                                            {initials}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                              {userData.full_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                              @{userData.username}
                                            </p>
                                          </div>
                                          {member.role === 'owner' && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                              Owner
                                            </Badge>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                      No members assigned
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Member Names Section */}
                    {project.members && project.members.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.members.slice(0, 3).map((member) => (
                          <Badge
                            key={member.id}
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
