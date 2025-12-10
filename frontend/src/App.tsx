import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout';
import type { User as AppUser } from '@/types';
import {
  Dashboard,
  Login,
  Projects,
  ProjectCreate,
  ProjectDetail,
  DocumentCreate,
  DocumentDetail,
  Documents,
  ProjectSettings,
  UserManagement,
  MyTask,
  CreateTask,
  TeamPerformance,
  ToolsHub,
  PdfVsHtmlViewer,
  // SuperscriptChecker,
  // JsonViewer,
  PivotTableExtractor
} from '@/pages';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAllowed, isLoading } = useAuth();
  const ALLOWED_ROLES: AppUser['role'][] = ['admin', 'manager', 'annotator'];
  const isAuthorized = isAllowed(ALLOWED_ROLES);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/users" replace /> : <Login />
        }
      />
      
      {/* Routes WITH Sidebar (Inside Layout) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/documents/new" element={<DocumentCreate />} />
        <Route path="/projects/:id/settings" element={<ProjectSettings />} />

        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />

        <Route path="/test-runs" element={<div>Test Runs (Phase 2)</div>} />
        <Route path="/test-runs/:id" element={<div>Test Run Detail (Phase 2)</div>} />

        <Route path="/issues" element={<div>Issues (Phase 3)</div>} />
        <Route path="/issues/:id" element={<div>Issue Detail (Phase 3)</div>} />

        {/* REMOVE THIS LINE - Tools should not be inside Layout */}
        {/* <Route path="/tools" element={<div>Tools Page</div>} /> */}

        <Route path="/settings" element={<div>Settings</div>} />

        <Route
          path="/users"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
      </Route>

      {/* Taskboard Routes */}
      <Route
        path="/taskboard"
        element={
          <ProtectedRoute>
            <MyTask />
          </ProtectedRoute>
        }
      >
        <Route index element={null} />
        <Route
          path="create"
          element={
            <AdminRoute>
              <CreateTask />
            </AdminRoute>
          }
        />
      </Route>

      {/* FULL-PAGE ROUTE: Team Performance */}
      <Route
        path="/team-performance"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <TeamPerformance />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* FULL-PAGE ROUTES: Tools Hub - WITHOUT ZanFlow Sidebar */}
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <ToolsHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/pdf-vs-html"
        element={
          <ProtectedRoute>
            <PdfVsHtmlViewer />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/tools/superscript-checker"
        element={
          <ProtectedRoute>
            <SuperscriptChecker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/json-viewer"
        element={
          <ProtectedRoute>
            <JsonViewer />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/tools/pivot-table"
        element={
          <ProtectedRoute>
            <PivotTableExtractor />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;