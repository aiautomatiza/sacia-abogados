/**
 * @fileoverview Contact Settings Page
 * @description Central configuration page for contacts with tabbed interface
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomFieldsTab, StatusesTab } from '@/features/contacts';
import { LocationsManager } from '@/features/locations';
import { useAppointmentsEnabled } from '@/hooks/useTenantSettings';

/**
 * Valid tab values
 */
type TabValue = 'fields' | 'statuses' | 'locations';

const DEFAULT_TAB: TabValue = 'fields';

/**
 * ContactSettings - Central configuration page for contacts
 *
 * Features:
 * - Tabbed interface for different configuration sections
 * - Query param-based tab state (?tab=fields or ?tab=statuses)
 * - Scalable architecture for adding more tabs
 *
 * Tabs:
 * - fields: Custom fields configuration
 * - statuses: Contact statuses configuration
 *
 * @example
 * // Navigate to fields tab
 * /contacts/settings?tab=fields
 *
 * // Navigate to statuses tab
 * /contacts/settings?tab=statuses
 */
export default function ContactSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabValue) || DEFAULT_TAB;

  const { isEnabled: appointmentsEnabled } = useAppointmentsEnabled();

  // Validate and set default tab if invalid
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['fields', 'statuses', 'locations'];
    if (!tab || !validTabs.includes(tab)) {
      setSearchParams({ tab: DEFAULT_TAB }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/contacts">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver a Contactos
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground mt-1">
            Configura los campos, estados y sedes para la gestión de contactos y citas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="statuses">Estados</TabsTrigger>
          {appointmentsEnabled && (
            <TabsTrigger value="locations">Sedes</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent value="statuses" className="space-y-4">
          <StatusesTab />
        </TabsContent>

        {appointmentsEnabled && (
          <TabsContent value="locations" className="space-y-4">
            <LocationsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
