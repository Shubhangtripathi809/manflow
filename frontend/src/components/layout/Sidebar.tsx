import { NavLink, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  TestTube2,
  AlertCircle,
  Settings,
  LogOut,
  Users,
  CheckSquare,
  Cog,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle,
  Clock,
  PlayCircle,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Test Runs', href: '/test-runs', icon: TestTube2 },
  { name: 'Issues', href: '/issues', icon: AlertCircle },
  { name: 'Tools', href: '/tools', icon: Cog },

];

const ADMIN_ROLES = ['admin', 'manager', 'annotator'];


const taskNavigation = [
    { id: 'ALL', name: 'All Tasks', href: '/taskboard', icon: CheckSquare },
    { id: 'COMPLETED', name: 'Completed Tasks', href: '/taskboard/completed', icon: CheckCircle },
    { id: 'PENDING', name: 'Pending Tasks', href: '/taskboard/pending', icon: Clock },
    { id: 'IN_PROGRESS', name: 'In Progress Tasks', href: '/taskboard/in_progress', icon: PlayCircle },
    { id: 'DEPLOYED', name: 'Deployed Tasks', href: '/taskboard/deployed', icon: CheckSquare },
    { id: 'DEFERRED', name: 'Deferred Tasks', href: '/taskboard/deferred', icon: Pause },
];

const TaskAccordion = () => {
    const { user } = useAuth(); 
    const location = useLocation();
    const isTaskRoute = location.pathname.startsWith('/taskboard');
    const isCreateRoute = location.pathname.startsWith('/taskboard/create');
    const CREATION_ALLOWED_ROLES = ['admin', 'manager', 'annotator'];
    const isCreationAllowed = !!(user?.role && CREATION_ALLOWED_ROLES.includes(user.role));
    const [isOpen, setIsOpen] = useState(isTaskRoute);

    // Effect to auto-open the accordion
    useMemo(() => {
        if (isTaskRoute) {
            setIsOpen(true);
        }
    }, [isTaskRoute]);

    const AccordionIcon = isOpen ? ChevronUp : ChevronDown; 

    return (
        <div className="space-y-1">
            {/* My Tasks Header */}
            <div
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    isTaskRoute
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <CheckSquare className="h-5 w-5" />
                <span className="flex-1">My Tasks</span>
                <AccordionIcon className="h-4 w-4" />
            </div>

            {/* Collapsible Menu (Accordion Content) */}
            {isOpen && (
                <div className="ml-4 border-l pl-2 space-y-1">
                    {taskNavigation.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary/20 text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )
                            }
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </NavLink>
                    ))}
                    
                    {/* ADD: Add New Task Link */}
                    {isCreationAllowed && (
                         <NavLink
                            to="/taskboard/create"
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                                    isCreateRoute || isActive // Highlight if on /create route
                                        ? 'bg-primary/20 text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )
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

export function Sidebar() {
  const { user, logout, isLoading, hasRole } = useAuth();
  const shouldShowAdminLink = user?.role && ADMIN_ROLES.includes(user.role);

  const myTaskItem = { name: 'My Tasks', href: '/taskboard', icon: CheckSquare }; // ADD

  console.log(`[Sidebar] State: isLoading=${isLoading}, userRole='${user?.role}', showAdminLink=${shouldShowAdminLink}`);

  const navigation = [
    ...baseNavigation.slice(0, 2),
    myTaskItem, 
    ...baseNavigation.slice(2),
    ...(shouldShowAdminLink
      ? [{ name: 'User Management', href: '/users', icon: Users }]
      : []),
  ];

  console.log(`[Sidebar] Final navigation length: ${navigation.length}`);


  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-primary">ZanFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {isLoading ? (
          <div className="p-3 text-sm text-muted-foreground animate-pulse">Loading navigation...</div>
        ) : (
          navigation.map((item) => {
            if (item.name === 'My Tasks') {
                return <TaskAccordion key="my-tasks" />; 
            }
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
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
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 animate-pulse" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse" />
            ) : (
              <p className="truncate text-sm font-medium">{user?.username}</p>
            )}
            {isLoading ? (
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
            ) : (
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user?.role}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!isLoading && (
            <>
              <NavLink
                to="/settings"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                Settings
              </NavLink>
              <button
                onClick={logout}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}