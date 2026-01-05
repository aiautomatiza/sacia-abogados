import {
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plug
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logoAIAutomatiza from '@/assets/logo-aiautomatiza.png';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import type { NavigationItem } from '@/types/navigation';

const adminNavigationItems: NavigationItem[] = [
  {
    title: 'Gestión de Clientes',
    url: '/admin/tenants',
    icon: Building2,
    group: 'Administración',
    roles: ['super_admin'],
  },
  {
    title: 'Integraciones',
    url: '/admin/integrations',
    icon: Plug,
    group: 'Administración',
    roles: ['super_admin'],
  },
];

export function AdminSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sesión cerrada');
    navigate('/auth');
  };

  const groupedItems = adminNavigationItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof adminNavigationItems>);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r"
    >
      {/* Header con logo y botón toggle */}
      <SidebarHeader className="h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {/* Logo y texto - se ocultan en modo icon */}
          <div className="flex items-center space-x-3 py-2 group-data-[collapsible=icon]:hidden">
            <img
              src={logoAIAutomatiza}
              alt="AIAutomatiza Logo"
              className="h-6 w-auto"
            />
            <div>
              <span className="text-lg font-semibold font-heading text-sidebar-foreground">
                AIAutomatiza
              </span>
              <span className="block text-xs text-muted-foreground">Panel Admin</span>
            </div>
          </div>

          {/* Botón toggle - se centra en modo icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent focus-ring",
              isCollapsed && "mx-auto"
            )}
            aria-label={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      {/* Contenido con navegación */}
      <SidebarContent>
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            {/* Label se oculta en modo icon */}
            <SidebarGroupLabel>
              {groupName.toUpperCase()}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className="group-data-[collapsible=icon]:justify-center px-3 py-2.5"
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 text-sm font-medium"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-5 w-5 shrink-0 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer con logout y versión */}
      <SidebarFooter>
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3 py-2.5 text-sm font-medium"
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5 shrink-0 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
          </Button>

          {/* Info de versión - se oculta en modo icon */}
          <div className="text-xs text-sidebar-foreground/50 text-center mt-2 group-data-[collapsible=icon]:hidden">
            <p className="font-medium">AIAutomatiza v1.0.0</p>
            <p className="mt-0.5">© 2025 - Panel Admin</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
