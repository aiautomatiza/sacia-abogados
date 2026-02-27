import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuth } from "@/contexts/auth-context";
import {
  useContacts,
  useContactMutations,
  useCustomFields,
  ContactsTable,
  ContactDialog,
  ContactDeleteDialog,
  ContactFilters,
  ContactsPagination,
  useContactsUrlState,
  type Contact,
} from "@/features/contacts";

const DEFAULT_PAGE_SIZE = 30;
const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

export default function Contacts() {
  const { scope } = useAuth();

  // URL is the single source of truth for page and search
  const { urlPage, urlSearch, setUrlPage, setUrlSearch } = useContactsUrlState();

  // Page size is local-only (no URL persistence needed)
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  // Local state
  const [statusIds, setStatusIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Use URL state directly — no bidirectional sync needed
  const page = urlPage;
  const search = urlSearch;

  // Pagination actions that update URL directly
  const setPage = useCallback((newPage: number) => {
    setUrlPage(Math.max(1, newPage));
  }, [setUrlPage]);

  const goToNext = useCallback(() => {
    setUrlPage(page + 1);
  }, [setUrlPage, page]);

  const goToPrevious = useCallback(() => {
    setUrlPage(Math.max(page - 1, 1));
  }, [setUrlPage, page]);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setUrlPage(1); // Reset to first page when changing page size
  }, [setUrlPage]);

  const setSearch = useCallback((newSearch: string) => {
    setUrlSearch(newSearch);
  }, [setUrlSearch]);

  // Data fetching with pageSize
  const { data: contactsData, isLoading, isFetching } = useContacts({ search, status_ids: statusIds }, page, pageSize);
  const { data: customFields = [] } = useCustomFields();
  const { deleteContactsBulk } = useContactMutations();

  const contacts = contactsData?.data || [];
  const totalCount = contactsData?.total || 0;

  // Realtime subscriptions for contacts and statuses
  useRealtime({
    subscriptions: [
      {
        table: 'crm_contacts',
        event: '*',
        filter: `tenant_id=eq.${scope?.tenantId}`,
        queryKeysToInvalidate: [['contacts']],
      },
      {
        table: 'crm_contact_statuses',
        event: '*',
        filter: `tenant_id=eq.${scope?.tenantId}`,
        queryKeysToInvalidate: [['contact-statuses']],
      },
    ],
    enabled: !!scope?.tenantId,
  });

  // Calculate pagination info from URL page + totalCount
  const paginationInfo = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);
    const canGoNext = page < totalPages;
    const canGoPrevious = page > 1;
    return { totalPages, totalCount, from, to, canGoNext, canGoPrevious };
  }, [page, pageSize, totalCount]);

  // Validate page when totalCount changes (e.g. after filtering reduces results)
  // IMPORTANT: Skip while fetching — during a page change, data is undefined momentarily,
  // which makes totalCount=0, totalPages=1, and would reset the page back to 1.
  useEffect(() => {
    if (isFetching) return;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > totalPages) {
      setUrlPage(totalPages);
    }
  }, [totalCount, pageSize, page, setUrlPage, isFetching]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length > 0) {
      await deleteContactsBulk.mutateAsync(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedContact(null);
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setSelectedContact(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Contactos CRM</h1>
        <div className="flex gap-2">
          <Link to="/contacts/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <ContactFilters
          search={search}
          onSearchChange={setSearch}
          statusIds={statusIds}
          onStatusIdsChange={setStatusIds}
        />
        {selectedIds.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Eliminar ({selectedIds.length})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <ContactsTable
            contacts={contacts}
            customFields={customFields}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <ContactsPagination
            currentPage={page}
            totalPages={paginationInfo.totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            from={paginationInfo.from}
            to={paginationInfo.to}
            totalCount={totalCount}
            canGoPrevious={paginationInfo.canGoPrevious}
            canGoNext={paginationInfo.canGoNext}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
        </>
      )}

      <ContactDialog open={dialogOpen} onOpenChange={handleDialogClose} contact={selectedContact} />
      <ContactDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        contactId={selectedContact?.id || null}
        contactName={selectedContact?.nombre || selectedContact?.numero}
      />
    </div>
  );
}
