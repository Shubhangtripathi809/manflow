import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  TestTube2,
  Settings,
  LogOut,
  Users,
  Cog,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckSquare,
  CheckCircle,
  Clock,
  PlayCircle,
  Pause,
  Crown,
  TrendingUp,
  Braces,
  ListTodo,
  Calendar,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { projectsApi } from '@/services/api';
import type { Project } from '@/types';

const ADMIN_ROLES = ['admin', 'manager', 'annotator'];

const FavouriteProjectsAccordion = ({ projects }: { projects: Project[] }) => {
  const { user } = useAuth();
  const favProjects = useMemo(() => {
    return projects.filter(p =>
      p.is_favourite &&
      p.members?.some(member => member.user.id === user?.id)
    );
  }, [projects, user?.id]);

  if (favProjects.length === 0) return null;

  return (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">
      {favProjects.map((project) => (
        <NavLink
          key={project.id}
          to={`/projects/${project.id}`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
          <span className="truncate">{project.name}</span>
        </NavLink>
      ))}
    </div>
  );
};

const TaskAccordion = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isTaskRoute = location.pathname.startsWith('/taskboard');
  const isCreateRoute = location.pathname.startsWith('/taskboard/create');
  const CREATION_ALLOWED_ROLES = ['admin', 'manager', 'annotator'];
  const isCreationAllowed = !!(user?.role && CREATION_ALLOWED_ROLES.includes(user.role));
  const [isOpen, setIsOpen] = useState(isTaskRoute);

  useMemo(() => { if (isTaskRoute) setIsOpen(true); }, [isTaskRoute]);
  const AccordionIcon = isOpen ? ChevronUp : ChevronDown;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
          isTaskRoute ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        onClick={() => (isTaskRoute ? setIsOpen(!isOpen) : navigate('/taskboard'))}
      >
        <CheckSquare className="h-5 w-5" />
        <span className="flex-1">My Tasks</span>
        <AccordionIcon className="h-4 w-4" />
      </div>
      {isOpen && (
        <div className="ml-4 border-l pl-2 space-y-1">
          {[
            { id: 'ALL', name: 'All Tasks', href: '/taskboard', icon: CheckSquare },
            { id: 'COMPLETED', name: 'Completed Tasks', href: '/taskboard/completed', icon: CheckCircle },
            { id: 'PENDING', name: 'Pending Tasks', href: '/taskboard/pending', icon: Clock },
            { id: 'BACKLOG', name: 'Backlog Tasks', href: '/taskboard/backlog', icon: ListTodo },
            { id: 'IN_PROGRESS', name: 'In Progress Tasks', href: '/taskboard/in_progress', icon: PlayCircle },
            { id: 'DEPLOYED', name: 'Deployed Tasks', href: '/taskboard/deployed', icon: CheckSquare },
            { id: 'DEFERRED', name: 'Deferred Tasks', href: '/taskboard/deferred', icon: Pause },
          ].map((item) => (
            <NavLink
              key={item.id}
              to={item.href}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
          {isCreationAllowed && (
            <NavLink
              to="/taskboard/create"
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              <Plus className="h-4 w-4" />
              Add New Task
            </NavLink>
          )}
        </div>
      )}
    </div>
  );
};

const UserManagementAccordion = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [isOpen, setIsOpen] = useState(isAdminRoute);
  useMemo(() => { if (isAdminRoute) setIsOpen(true); }, [isAdminRoute]);

  return (
    <div className="space-y-1">
      <div
        className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
          isAdminRoute ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Crown className="h-5 w-5" />
        <span className="flex-1">Team Management</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      {isOpen && (
        <div className="ml-4 border-l pl-2 space-y-1">
          {[
            { id: 'USER_ROLES', name: 'User Roles', href: '/admin/user-roles', icon: Users },
            { id: 'TEAM_PERFORMANCE', name: 'Team Performance', href: '/admin/team-performance', icon: TrendingUp },
          ].map((item) => (
            <NavLink
              key={item.id}
              to={item.href}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const ToolsAccordion = () => {
  const location = useLocation();
  const isToolsRoute = location.pathname.startsWith('/tools');
  const [isOpen, setIsOpen] = useState(isToolsRoute);
  useMemo(() => { if (isToolsRoute) setIsOpen(true); }, [isToolsRoute]);

  return (
    <div className="space-y-1">
      <div
        className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
          isToolsRoute ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Cog className="h-5 w-5" />
        <span className="flex-1">Tools</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      {isOpen && (
        <div className="ml-4 border-l pl-2 space-y-1">
          {[
            { id: 'PDF_HTML', name: 'PDF vs HTML', href: '/tools/pdf-vs-html', icon: FileText },
            { id: 'JSON', name: 'JSON Viewer', href: '/tools/json-viewer', icon: Braces },
          ].map((item) => (
            <NavLink
              key={item.id}
              to={item.href}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export function Sidebar() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProjectsOpen, setIsProjectsOpen] = useState(location.pathname.startsWith('/projects'));

  useMemo(() => {
    if (location.pathname.startsWith('/projects')) {
      setIsProjectsOpen(true);
    }
  }, [location.pathname]);

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const projects = useMemo(() => {
    if (!projectsData) return [];
    if (Array.isArray(projectsData)) return projectsData;
    if ('results' in projectsData && Array.isArray(projectsData.results)) return projectsData.results;
    return [];
  }, [projectsData]) as Project[];

  const shouldShowAdminLink = user?.role && ADMIN_ROLES.includes(user.role);

  // Define base navigation items
  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Test Runs', href: '/test-runs', icon: TestTube2 },
    { name: 'Tools', href: '/tools', icon: Cog },
  ];

  const navigation = useMemo(() => {
    const nav = [...baseNavigation];
    nav.splice(2, 0, { name: 'My Tasks', href: '/taskboard', icon: CheckSquare });
    if (shouldShowAdminLink) {
      const toolIndex = nav.findIndex(item => item.name === 'Tools');
      nav.splice(toolIndex + 1, 0, { name: 'Team Management', href: '/admin/user-roles', icon: Crown });
    }
    return nav;
  }, [shouldShowAdminLink]);

  const isLoading = authLoading || projectsLoading;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-primary">ZanFlow</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {isLoading ? (
          <div className="p-3 text-sm text-muted-foreground animate-pulse">Loading navigation...</div>
        ) : (
          navigation.map((item) => {
            if (item.name === 'My Tasks') return <TaskAccordion key="my-tasks" />;
            if (item.name === 'Team Management') return <UserManagementAccordion key="admin-tools" />;
            if (item.name === 'Tools') return <ToolsAccordion key="tools-accordion" />;
            if (item.name === 'Projects') {
              const isRouteActive = location.pathname.startsWith('/projects');

              return (
                <div key="projects-group" className="space-y-1">
                  <div
                    onClick={() => {
                      if (!isRouteActive) {
                        navigate(item.href);
                        setIsProjectsOpen(true);
                      } else {
                        setIsProjectsOpen(!isProjectsOpen);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                      isRouteActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {isProjectsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {isProjectsOpen && <FavouriteProjectsAccordion projects={projects} />}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })
        )}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 cursor-pointer hover:bg-accent rounded-lg p-2 transition-colors" onClick={() => navigate('/profile')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <NavLink to="/settings" className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <Settings className="h-4 w-4" /> Settings
          </NavLink>
          <button onClick={logout} className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}