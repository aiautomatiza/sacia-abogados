import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Lock } from "lucide-react";
import { useCampaigns, CampaignsTable, type CampaignFilters } from "@/features/campaigns";
import { useCampaignsEnabled } from "@/hooks/useTenantSettings";

export default function Campaigns() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { enabled: campaignsEnabled, whatsappEnabled, callsEnabled, isLoading: loadingSettings } = useCampaignsEnabled();

  // Determinar tabs disponibles según canales habilitados
  const availableTabs = useMemo(() => {
    const tabs: Array<{ value: string; label: string }> = [];

    // Solo mostrar "Todas" si hay más de un canal habilitado
    if (whatsappEnabled && callsEnabled) {
      tabs.push({ value: "all", label: "Todas" });
    }

    if (whatsappEnabled) {
      tabs.push({ value: "whatsapp", label: "WhatsApp" });
    }

    if (callsEnabled) {
      tabs.push({ value: "llamadas", label: "Llamadas" });
    }

    return tabs;
  }, [whatsappEnabled, callsEnabled]);

  // Tab por defecto: si solo hay un canal, usar ese; si hay varios, usar "all"
  const defaultTab = availableTabs.length === 1 ? availableTabs[0].value : "all";

  // Sincronizar tab activo cuando los settings carguen
  useEffect(() => {
    if (!loadingSettings && availableTabs.length > 0 && activeTab === null) {
      setActiveTab(defaultTab);
    }
  }, [loadingSettings, availableTabs, defaultTab, activeTab]);

  // Calcular filtros basados en el tab activo
  const filters: CampaignFilters = useMemo(() => {
    if (!activeTab || activeTab === "all") {
      return {};
    }
    return { channel: activeTab as "whatsapp" | "llamadas" };
  }, [activeTab]);

  const { data, isLoading } = useCampaigns(filters, page);
  const campaigns = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const handleChannelFilter = (channel: string) => {
    setPage(1);
    setActiveTab(channel);
  };

  // Show disabled message if no campaigns are enabled
  if (loadingSettings) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaignsEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader title="Campañas" />
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Campañas no disponibles</h2>
          <p className="text-muted-foreground max-w-md mb-4">
            Tu cuenta no tiene habilitado ningún canal de campañas. Para poder crear y gestionar campañas,
            necesitas tener habilitado al menos uno de los siguientes canales:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 mb-6">
            <li>• Campañas de WhatsApp</li>
            <li>• Campañas de Llamadas</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Contacta con tu administrador para habilitar estos canales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Campañas"
        actions={
          <Button onClick={() => navigate('/campaigns/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </Button>
        }
      />

      <Tabs value={activeTab || defaultTab} onValueChange={handleChannelFilter}>
        <TabsList className="mb-6">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <CampaignsTable campaigns={campaigns} isLoading={isLoading} />
          </TabsContent>
        ))}
      </Tabs>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
