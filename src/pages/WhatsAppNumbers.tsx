import { useParams, useNavigate } from 'react-router-dom';
import { WhatsAppNumbersManager } from "@/features/admin/components/WhatsAppNumbersManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function WhatsAppNumbers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>Error: Tenant ID no encontrado</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/tenants')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Clientes
      </Button>
      <WhatsAppNumbersManager tenantId={id} />
    </div>
  );
}
