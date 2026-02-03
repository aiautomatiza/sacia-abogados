# Forms & Validation

Formularios con React Hook Form y validacion con Zod.

## Stack

| Libreria | Uso |
|----------|-----|
| React Hook Form | Manejo de formularios |
| Zod | Validacion de schemas |
| @hookform/resolvers | Integracion RHF + Zod |

## Patron Basico

### 1. Definir Schema Zod

```typescript
// src/lib/validations/contact.ts
import { z } from 'zod';

export const contactSchema = z.object({
  numero: z
    .string()
    .min(10, 'El numero debe tener al menos 10 digitos')
    .regex(/^\d+$/, 'Solo se permiten numeros'),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .optional(),
  email: z
    .string()
    .email('Email invalido')
    .optional()
    .or(z.literal('')),
  empresa: z.string().optional(),
});

// Inferir tipo del schema
export type ContactFormData = z.infer<typeof contactSchema>;
```

### 2. Crear Formulario

```typescript
// src/features/contacts/components/ContactForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactFormData } from '@/lib/validations/contact';

interface ContactFormProps {
  defaultValues?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => void;
  isLoading?: boolean;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ContactFormProps) {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      numero: '',
      nombre: '',
      email: '',
      empresa: '',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Campo numero */}
      <div className="space-y-2">
        <Label htmlFor="numero">Numero *</Label>
        <Input
          id="numero"
          {...form.register('numero')}
          placeholder="5512345678"
        />
        {form.formState.errors.numero && (
          <p className="text-sm text-destructive">
            {form.formState.errors.numero.message}
          </p>
        )}
      </div>

      {/* Campo nombre */}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          {...form.register('nombre')}
          placeholder="Juan Perez"
        />
        {form.formState.errors.nombre && (
          <p className="text-sm text-destructive">
            {form.formState.errors.nombre.message}
          </p>
        )}
      </div>

      {/* Boton submit */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
```

### 3. Usar con Mutations

```typescript
// src/features/contacts/components/CreateContactDialog.tsx
export function CreateContactDialog() {
  const [open, setOpen] = useState(false);
  const { createContact } = useContactMutations();

  const handleSubmit = (data: ContactFormData) => {
    createContact.mutate(data, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Crear contacto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
        </DialogHeader>
        <ContactForm
          onSubmit={handleSubmit}
          isLoading={createContact.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Componentes de Form con shadcn-ui

### Form Component

```typescript
// Usando Form de shadcn-ui
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export function ContactForm({ onSubmit }: Props) {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { numero: '', nombre: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="numero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numero</FormLabel>
              <FormControl>
                <Input placeholder="5512345678" {...field} />
              </FormControl>
              <FormDescription>
                Numero de telefono sin espacios ni guiones
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}
```

## Schemas Comunes

### Campos Opcionales

```typescript
const schema = z.object({
  // Opcional (puede ser undefined)
  nombre: z.string().optional(),

  // Opcional pero si existe, no vacio
  email: z.string().email().optional().or(z.literal('')),

  // Con valor default
  status: z.enum(['active', 'inactive']).default('active'),
});
```

### Validaciones Personalizadas

```typescript
const schema = z.object({
  // Validacion custom
  phone: z.string().refine(
    (val) => /^\d{10,12}$/.test(val),
    { message: 'Telefono debe tener 10-12 digitos' }
  ),

  // Async validation
  email: z.string().email().refine(
    async (email) => {
      const exists = await checkEmailExists(email);
      return !exists;
    },
    { message: 'Este email ya esta registrado' }
  ),
});
```

### Validacion Condicional

```typescript
const appointmentSchema = z.object({
  type: z.enum(['call', 'in_person']),
  phone: z.string().optional(),
  location_id: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'call') return !!data.phone;
    if (data.type === 'in_person') return !!data.location_id;
    return true;
  },
  {
    message: 'Telefono requerido para citas telefonicas, ubicacion para presenciales',
    path: ['type'],
  }
);
```

### Arrays y Objetos Anidados

```typescript
const schema = z.object({
  name: z.string(),
  tags: z.array(z.string()).min(1, 'Al menos un tag'),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string().regex(/^\d{5}$/, 'Codigo postal invalido'),
  }),
});
```

## Select y Combobox

```typescript
<FormField
  control={form.control}
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Estado</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="inactive">Inactivo</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## DatePicker

```typescript
<FormField
  control={form.control}
  name="scheduled_at"
  render={({ field }) => (
    <FormItem className="flex flex-col">
      <FormLabel>Fecha</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP', { locale: es })
              ) : (
                <span>Seleccionar fecha</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            disabled={(date) => date < new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Form con Campos Dinamicos

```typescript
// Campos personalizados desde DB
const { data: customFields } = useCustomFields();

{customFields?.map((field) => (
  <FormField
    key={field.id}
    control={form.control}
    name={`attributes.${field.field_name}`}
    render={({ field: formField }) => (
      <FormItem>
        <FormLabel>
          {field.field_label}
          {field.required && ' *'}
        </FormLabel>
        <FormControl>
          {field.field_type === 'select' ? (
            <Select onValueChange={formField.onChange} value={formField.value}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input {...formField} type={field.field_type} />
          )}
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
))}
```

## Manejo de Errores del Servidor

```typescript
const { createContact } = useContactMutations();

const handleSubmit = (data: ContactFormData) => {
  createContact.mutate(data, {
    onError: (error) => {
      // Error general
      if (error.message.includes('duplicate')) {
        form.setError('numero', {
          type: 'server',
          message: 'Este numero ya existe',
        });
      } else {
        form.setError('root', {
          type: 'server',
          message: error.message,
        });
      }
    },
  });
};

// Mostrar error general
{form.formState.errors.root && (
  <Alert variant="destructive">
    {form.formState.errors.root.message}
  </Alert>
)}
```

## Reset y Default Values

```typescript
// Reset a valores iniciales
form.reset();

// Reset a nuevos valores
form.reset({ numero: '123', nombre: 'Juan' });

// Actualizar un campo
form.setValue('nombre', 'Nuevo nombre');

// Actualizar multiples
form.reset((values) => ({
  ...values,
  nombre: 'Actualizado',
}));
```
