import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CampaignContactWithBatch } from '../types';

interface CampaignContactsTableProps {
  contacts: CampaignContactWithBatch[];
  isLoading?: boolean;
}

export function CampaignContactsTable({ contacts, isLoading }: CampaignContactsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter((contact) => {
    const search = searchTerm.toLowerCase();
    return (
      contact.nombre?.toLowerCase().includes(search) ||
      contact.numero.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Enviado</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="destructive">Fallido</Badge>;
    }
    if (status === 'processing') {
      return <Badge variant="default">Procesando</Badge>;
    }
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Envío</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-5 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o número..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Envío</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron contactos
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={`${contact.id}-${contact.batch_number}`}>
                  <TableCell className="font-medium">
                    {contact.nombre || 'Sin nombre'}
                  </TableCell>
                  <TableCell>{contact.numero}</TableCell>
                  <TableCell>
                    <Badge variant="outline">#{contact.batch_number}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(contact.batch_status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.sent_at
                      ? format(new Date(contact.sent_at), "d 'de' MMMM, HH:mm", { locale: es })
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredContacts.length} de {contacts.length} contactos
      </div>
    </div>
  );
}
