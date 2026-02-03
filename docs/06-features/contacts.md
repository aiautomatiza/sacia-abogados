# Contacts

Sistema de gestion de contactos CRM con campos personalizados.

## Descripcion

El modulo de contactos permite gestionar clientes con informacion basica (numero de telefono, nombre) y campos personalizados dinamicos definidos por cada tenant.

## Casos de Uso

1. Ver listado de contactos con busqueda y paginacion
2. Crear nuevo contacto con campos personalizados
3. Editar informacion de contacto
4. Eliminar contactos (individual o masivo)
5. Importar contactos desde CSV/Excel
6. Ver historial de conversaciones y llamadas de un contacto

## Estructura de Archivos

```
src/features/contacts/
├── components/
│   ├── ContactList.tsx         # Lista de contactos
│   ├── ContactCard.tsx         # Card individual
│   ├── ContactForm.tsx         # Formulario crear/editar
│   ├── ContactDetail.tsx       # Vista detallada
│   ├── ContactFilters.tsx      # Filtros de busqueda
│   ├── ContactImportDialog.tsx # Importar desde archivo
│   └── BulkActions.tsx         # Acciones masivas
├── hooks/
│   ├── useContacts.ts          # Query de lista
│   ├── useContact.ts           # Query individual
│   ├── useContactMutations.ts  # Mutations CRUD
│   └── useCustomFields.ts      # Campos personalizados
├── services/
│   └── contact.service.ts      # Llamadas a Supabase
├── types/
│   └── index.ts                # TypeScript types
└── utils/
    └── import-parser.ts        # Parser CSV/Excel
```

## Base de Datos

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `crm_contacts` | Contactos principales |
| `custom_fields` | Definicion de campos personalizados |

### Schema crm_contacts

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador |
| `tenant_id` | UUID | FK a tenants |
| `numero` | TEXT | Telefono (unico por tenant) |
| `nombre` | TEXT | Nombre del contacto |
| `attributes` | JSONB | Campos personalizados |
| `created_at` | TIMESTAMP | Fecha creacion |
| `updated_at` | TIMESTAMP | Ultima actualizacion |

### Campos Personalizados

Los campos adicionales se almacenan en `attributes` como JSON:

```json
{
  "email": "cliente@example.com",
  "empresa": "Acme Corp",
  "ciudad": "CDMX",
  "tipo_cliente": "premium"
}
```

La definicion de campos esta en `custom_fields`:

```typescript
interface CustomField {
  id: string;
  tenant_id: string;
  field_name: string;      // Nombre interno
  field_label: string;     // Label para UI
  field_type: string;      // text, select, date, etc.
  required: boolean;
  options: string[] | null; // Para select
  display_order: number;
}
```

## Hooks

### useContacts

```typescript
const {
  data,      // { data: Contact[], total, page, totalPages }
  isLoading,
  error,
  refetch,
} = useContacts(filters, page);
```

### useContact

```typescript
const {
  data: contact,
  isLoading,
} = useContact(contactId);
```

### useContactMutations

```typescript
const {
  createContact,
  updateContact,
  deleteContact,
  deleteContacts, // Bulk delete
  importContacts,
} = useContactMutations();

// Crear
createContact.mutate({
  numero: '5512345678',
  nombre: 'Juan Perez',
  attributes: { email: 'juan@email.com' },
});

// Actualizar
updateContact.mutate({
  id: 'contact-id',
  data: { nombre: 'Juan P.' },
});

// Eliminar
deleteContact.mutate('contact-id');

// Bulk delete
deleteContacts.mutate(['id1', 'id2', 'id3']);
```

### useCustomFields

```typescript
const { data: customFields } = useCustomFields();

// Retorna array de definiciones de campos
// para renderizar formularios dinamicos
```

## Componentes

### ContactList

```typescript
<ContactList
  contacts={contacts}
  onSelect={(contact) => setSelected(contact)}
  onBulkDelete={(ids) => deleteContacts.mutate(ids)}
/>
```

### ContactForm

```typescript
<ContactForm
  defaultValues={contact}
  customFields={customFields}
  onSubmit={(data) => updateContact.mutate(data)}
  isLoading={updateContact.isPending}
/>
```

### ContactImportDialog

```typescript
<ContactImportDialog
  onImport={(contacts) => importContacts.mutate(contacts)}
/>
```

## Rutas

| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/contacts` | ContactsPage | Lista de contactos |

## Realtime

```typescript
useRealtime({
  subscriptions: [{
    table: 'crm_contacts',
    filter: `tenant_id=eq.${tenantId}`,
    queryKeysToInvalidate: [['contacts', tenantId]],
  }],
  enabled: !!tenantId,
});
```

## Validacion

```typescript
// src/lib/validations/contact.ts
export const contactSchema = z.object({
  numero: z
    .string()
    .min(10, 'Minimo 10 digitos')
    .regex(/^\d+$/, 'Solo numeros'),
  nombre: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});
```

## Edge Functions

| Funcion | Descripcion |
|---------|-------------|
| `create-contact` | Crear desde API externa |
| `import-contacts` | Importar masivo |
| `external-contact-api` | API publica |
| `sync-contact-from-external` | Sync individual |

## Flujo de Importacion

```
1. Usuario sube CSV/Excel
2. Frontend parsea archivo
3. Muestra preview con mapeo de columnas
4. Usuario confirma
5. Se llama a importContacts mutation
6. Edge Function procesa en batches
7. Retorna resultado (importados, errores)
```

## Busqueda

La busqueda se realiza en `numero` y `nombre`:

```typescript
.or(`numero.ilike.%${search}%,nombre.ilike.%${search}%`)
```

## Restricciones

- `numero` es unico por tenant
- Campos en `attributes` deben coincidir con `custom_fields`
- Borrado en cascada afecta conversaciones y llamadas

## Permisos

| Accion | user_client | super_admin |
|--------|-------------|-------------|
| Ver | Solo su tenant | Todos |
| Crear | Solo su tenant | Todos |
| Editar | Solo su tenant | Todos |
| Eliminar | Solo su tenant | Todos |
| Importar | Solo su tenant | Todos |
