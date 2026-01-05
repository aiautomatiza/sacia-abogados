// Types
export * from './types';

// Hooks
export { useContacts, useContact, useContactMutations } from './hooks/useContacts';
export { useCustomFields, useCustomFieldMutations } from './hooks/useCustomFields';
export { useContactsUrlState } from './hooks/use-contacts-url-state';
export { useContactsPagination } from './hooks/use-contacts-pagination';

// Components
export { ContactsTable } from './components/ContactsTable';
export { ContactDialog } from './components/ContactDialog';
export { ContactDeleteDialog } from './components/ContactDeleteDialog';
export { ContactFilters } from './components/ContactFilters';
export { ContactsPagination } from './components/ContactsPagination';
export { DynamicFieldInput } from './components/DynamicFieldInput';
export { CustomFieldsList } from './components/CustomFieldsList';
export { CustomFieldDialog } from './components/CustomFieldDialog';

// Lib
export { buildContactSchema } from './lib/validations';

// Services
export * as contactService from './services/contact.service';
export * as customFieldsService from './services/custom-fields.service';
