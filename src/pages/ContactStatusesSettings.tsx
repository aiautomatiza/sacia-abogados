/**
 * @fileoverview Contact Statuses Settings Page
 * @description Admin page for configuring contact statuses
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusManager } from '@/features/contacts/components/StatusManager';

export default function ContactStatusesSettings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/contacts/settings">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver a Configuración
          </Button>
        </Link>
      </div>

      <StatusManager />
    </div>
  );
}
