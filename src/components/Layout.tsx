import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-svh w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full overflow-hidden">
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
