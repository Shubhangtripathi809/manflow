import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const baseNavigation = [ 
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'My Tasks', href: '/taskboard', icon: CheckSquare},
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Test Runs', href: '/test-runs', icon: TestTube2 },
  { name: 'Issues', href: '/issues', icon: AlertCircle },
  
];

const ADMIN_ROLES = ['admin', 'manager', 'annotator']; 

export function Sidebar() {
  const { user, logout, isLoading, hasRole } = useAuth(); 
  const shouldShowAdminLink = user?.role && ADMIN_ROLES.includes(user.role);

  console.log(`[Sidebar] State: isLoading=${isLoading}, userRole='${user?.role}', showAdminLink=${shouldShowAdminLink}`);

  const navigation = [
    ...baseNavigation,
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
          navigation.map((item) => (
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
          ))
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