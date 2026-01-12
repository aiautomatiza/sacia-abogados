import { useState, useEffect, useMemo } from "react";
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
  useContactsPagination,
  type Contact,
} from "@/features/contacts";

export default function Contacts() {
  const { scope } = useAuth();

  // URL state management
  const { urlPage, urlSearch, setUrlPage, setUrlSearch } = useContactsUrlState();

  // Pagination state (controlled)
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    goToNext,
    goToPrevious,
    goToFirst,
    getPaginationInfo,
    validatePage,
    pageSizeOptions,
  } = useContactsPagination();

  // Local state
  const [search, setSearch] = useState("");
  const [statusIds, setStatusIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync page from URL on mount
  useEffect(() => {
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [urlPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when page changes
  useEffect(() => {
    if (page !== urlPage) {
      setUrlPage(page);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync search from URL on mount
  useEffect(() => {
    if (urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [urlSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when search changes
  useEffect(() => {
    if (search !== urlSearch) {
      setUrlSearch(search);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data fetching with pageSize
  const { data: contactsData, isLoading } = useContacts({ search, status_ids: statusIds }, page, pageSize);
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

  // Calculate pagination info
  const paginationInfo = useMemo(
    () => getPaginationInfo(totalCount),
    [getPaginationInfo, totalCount]
  );

  // Validate page when totalCount changes
  useEffect(() => {
    validatePage(totalCount);
  }, [totalCount, validatePage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    goToFirst();
  }, [search, goToFirst]);

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
            pageSizeOptions={pageSizeOptions}
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
