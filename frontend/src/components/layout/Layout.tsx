import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div id="layout-wrapper" className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

