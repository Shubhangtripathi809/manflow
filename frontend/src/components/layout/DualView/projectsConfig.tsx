import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, UsersIcon } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@/components/common';
import { formatRelativeTime, getProjectTypeColor } from '@/lib/utils';
import { projectsApi } from '@/services/api';
import type { Project } from '@/types';
import type { TableColumn } from '../DualView';

// projectsConfig.tsx
export const projectsTableColumns: TableColumn<Project>[] = [
  {
    key: 'name',
    label: 'Project',
    render: (project: any) => (
      <div className="flex items-center gap-3">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] ${getProjectTypeColor(project.task_type)}`}>
          {project.name?.slice(0, 1)?.toUpperCase()}
        </div>
        <span className="font-semibold text-[#172b4d]">{project.name}</span>
      </div>
    ),
  },
  {
    key: 'document_count',
    label: 'Documents',
    width: '120px',
    render: (project: any) => (
      <span className="text-gray-600 font-medium">{project.document_count || 0} docs</span>
    ),
  },
  {
    key: 'member_count',
    label: 'Members',
    width: '120px',
    render: (project: any) => (
      <div className="flex -space-x-2">
        {/* Mirroring the Task Assignee style */}
        <span className="text-gray-600 font-medium">{project.member_count || 0} members</span>
      </div>
    ),
  },
  {
    key: 'updated_at',
    label: 'Updated',
    width: '150px',
    render: (project: any) => (
      <span className="text-[#5e6c84]">{formatRelativeTime(project.updated_at)}</span>
    ),
  },
  {
    key: 'favorite',
    label: 'Favorite',
    width: '80px',
    className: 'text-center',
    render: (project: any) => (
      <button className="text-yellow-500 hover:scale-110 transition-transform">
        {project.is_favourite ? '★' : '☆'}
      </button>
    ),
  },
];

interface ProjectGridCardProps {
  project: Project;
  onToggleFavorite: (e: React.MouseEvent, project: Project) => void;
}

export function ProjectGridCard({ project, onToggleFavorite }: ProjectGridCardProps) {
  const [openMembersCard, setOpenMembersCard] = React.useState(false);

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getProjectTypeColor(project.task_type)}`}
              >
                {project.name?.slice(0, 1)?.toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-lg">{project.name}</CardTitle>
              </div>
            </div>

            {/* Favourite Star Icon */}
            <button
              type="button"
            //   onClick={onToggleFavorite}
              className="p-2 hover:bg-accent rounded-full transition-colors group/star"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={project.is_favourite ? "#eab308" : "none"}
                stroke={project.is_favourite ? "#eab308" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-all ${
                  project.is_favourite
                    ? "scale-110"
                    : "text-muted-foreground group-hover/star:text-yellow-500"
                }`}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-3 px-3">
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {project.document_count || 0} docs
              </span>
              <p className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(project.updated_at)}
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMembersCard(!openMembersCard);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  {project.member_count || 0} members
                </button>

                {openMembersCard && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMembersCard(false);
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
                                .map((n) => n[0])
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
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 capitalize bg-primary/5"
                                    >
                                      {member.role.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium">
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
        </CardContent>
      </Card>
    </Link>
  );
}