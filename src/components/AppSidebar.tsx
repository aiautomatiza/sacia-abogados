import {
  Users, Settings, LogOut,
  ChevronLeft, ChevronRight, Send, MessageSquare, Phone, CalendarDays, UserCog
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useComercialRole } from '@/hooks/useComercialRole';
import { useModuleAccess } from '@/hooks/useTenantSettings';
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

const navigationItems: NavigationItem[] = [
  {
    title: 'Conversaciones',
    url: '/conversations',
    icon: MessageSquare,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
    requiredModule: 'conversations',
  },
  {
    title: 'Contactos',
    url: '/contacts',
    icon: Users,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
  },
  {
    title: 'Campañas',
    url: '/campaigns',
    icon: Send,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
    requiredModule: 'campaigns',
    hiddenForComercialRoles: ['director_sede', 'comercial'],
  },
  {
    title: 'Llamadas',
    url: '/calls',
    icon: Phone,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
    requiredModule: 'calls',
  },
  {
    title: 'Citas',
    url: '/appointments',
    icon: CalendarDays,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
    requiredModule: 'appointments',
  },
  {
    title: 'Equipo Comercial',
    url: '/comerciales',
    icon: UserCog,
    group: 'Principal',
    roles: ['user_client', 'super_admin'],
    visibleForComercialRoles: [null, 'director_comercial_general', 'director_sede'],
  },
  {
    title: 'Configuración',
    url: '/contacts/settings',
    icon: Settings,
    group: 'Configuración',
    roles: ['user_client', 'super_admin'],
    visibleForComercialRoles: [null, 'director_comercial_general'],
  },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { role } = useRole();
  const { comercialRole } = useComercialRole();
  const { isLoading: loadingModules, isModuleEnabled } = useModuleAccess();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await signOut();
    toast.success('Sesión cerrada');
    navigate('/auth');
  };

  // Filtrar items según el rol del usuario, módulos habilitados y rol comercial
  const filteredNavigationItems = navigationItems.filter((item) => {
    // Filtrar por rol
    if (item.roles && role && !item.roles.includes(role)) {
      return false;
    }

    // Filtrar por rol comercial - hidden
    if (item.hiddenForComercialRoles && comercialRole && item.hiddenForComercialRoles.includes(comercialRole)) {
      return false;
    }

    // Filtrar por rol comercial - visible only for specific roles
    if (item.visibleForComercialRoles && !item.visibleForComercialRoles.includes(comercialRole)) {
      return false;
    }

    // Si requiere un módulo específico, verificar si está habilitado
    if (item.requiredModule) {
      // No mostrar mientras carga para evitar flash
      if (loadingModules) return false;
      return isModuleEnabled(item.requiredModule);
    }

    return true;
  });

  const groupedItems = filteredNavigationItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof filteredNavigationItems>);

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r"
    >
      {/* Header con logo y botón - usa clases CSS de grupo */}
      <SidebarHeader className="h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {/* Logo y texto - se ocultan automáticamente con CSS */}
          <div className="flex items-center space-x-3 py-2 group-data-[collapsible=icon]:hidden">
            <img 
              src={logoAIAutomatiza} 
              alt="AIAutomatiza Logo" 
              className="h-6 w-auto"
            />
            <span className="text-lg font-semibold font-heading text-sidebar-foreground">AIAutomatiza</span>
          </div>
          
          {/* Botón - se centra automáticamente en modo icon */}
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

      {/* Contenido - sin overrides de padding */}
      <SidebarContent>
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            {/* Se oculta automáticamente en modo icon */}
            <SidebarGroupLabel>
              {groupName === 'Configuración' ? 'SISTEMA' : groupName.toUpperCase()}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild
                      tooltip={item.title}
                      disabled={item.disabled}
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
                        {item.badge && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary group-data-[collapsible=icon]:hidden">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer - sin overrides de padding */}
      <SidebarFooter>
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 px-3 py-2.5 text-sm font-medium"
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5 shrink-0 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
          </Button>
          
          {/* Info de versión - se oculta en modo icon */}
          <div className="text-xs text-sidebar-foreground/50 text-center mt-2 group-data-[collapsible=icon]:hidden">
            <p className="font-medium">AIAutomatiza v1.0.0</p>
            <p className="mt-0.5">© 2025</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
