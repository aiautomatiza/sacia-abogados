import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationMutations } from "../hooks/use-location-mutations";
import type { TenantLocation, CreateLocationInput, OperatingHours } from "../types";
import { DAYS_OF_WEEK, TIMEZONES, parseOperatingHours } from "../types";

const locationSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  code: z.string().optional(),
  address_line1: z.string().min(1, "La dirección es requerida"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "La ciudad es requerida"),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  timezone: z.string().optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  // Operating hours
  monday_open: z.string().optional(),
  monday_close: z.string().optional(),
  tuesday_open: z.string().optional(),
  tuesday_close: z.string().optional(),
  wednesday_open: z.string().optional(),
  wednesday_close: z.string().optional(),
  thursday_open: z.string().optional(),
  thursday_close: z.string().optional(),
  friday_open: z.string().optional(),
  friday_close: z.string().optional(),
  saturday_open: z.string().optional(),
  saturday_close: z.string().optional(),
  sunday_open: z.string().optional(),
  sunday_close: z.string().optional(),
});

type FormData = z.infer<typeof locationSchema>;

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: TenantLocation | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  return { value, label: value };
});

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
}: LocationFormDialogProps) {
  const { createMutation, updateMutation } = useLocationMutations();
  const isEditing = !!location;

  const form = useForm<FormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      code: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "España",
      phone: "",
      email: "",
      timezone: "Europe/Madrid",
      is_active: true,
      is_default: false,
    },
  });

  useEffect(() => {
    if (location) {
      const hours = parseOperatingHours(location.operating_hours);
      form.reset({
        name: location.name,
        code: location.code || "",
        address_line1: location.address_line1,
        address_line2: location.address_line2 || "",
        city: location.city,
        state_province: location.state_province || "",
        postal_code: location.postal_code || "",
        country: location.country || "España",
        phone: location.phone || "",
        email: location.email || "",
        timezone: location.timezone || "Europe/Madrid",
        is_active: location.is_active,
        is_default: location.is_default,
        monday_open: hours.monday?.open || "",
        monday_close: hours.monday?.close || "",
        tuesday_open: hours.tuesday?.open || "",
        tuesday_close: hours.tuesday?.close || "",
        wednesday_open: hours.wednesday?.open || "",
        wednesday_close: hours.wednesday?.close || "",
        thursday_open: hours.thursday?.open || "",
        thursday_close: hours.thursday?.close || "",
        friday_open: hours.friday?.open || "",
        friday_close: hours.friday?.close || "",
        saturday_open: hours.saturday?.open || "",
        saturday_close: hours.saturday?.close || "",
        sunday_open: hours.sunday?.open || "",
        sunday_close: hours.sunday?.close || "",
      });
    } else {
      form.reset({
        name: "",
        code: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state_province: "",
        postal_code: "",
        country: "España",
        phone: "",
        email: "",
        timezone: "Europe/Madrid",
        is_active: true,
        is_default: false,
      });
    }
  }, [location, form]);

  const buildOperatingHours = (data: FormData): OperatingHours => {
    const hours: OperatingHours = {};

    DAYS_OF_WEEK.forEach(({ key }) => {
      const openKey = `${key}_open` as keyof FormData;
      const closeKey = `${key}_close` as keyof FormData;
      const open = data[openKey] as string;
      const close = data[closeKey] as string;

      if (open && close) {
        hours[key as keyof OperatingHours] = { open, close };
      }
    });

    return hours;
  };

  const onSubmit = async (data: FormData) => {
    try {
      const operatingHours = buildOperatingHours(data);

      const input: CreateLocationInput = {
        name: data.name,
        code: data.code || undefined,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || undefined,
        city: data.city,
        state_province: data.state_province || undefined,
        postal_code: data.postal_code || undefined,
        country: data.country || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        timezone: data.timezone || undefined,
        is_active: data.is_active,
        is_default: data.is_default,
        operating_hours: operatingHours,
      };

      if (isEditing && location) {
        await updateMutation.mutateAsync({ id: location.id, data: input });
      } else {
        await createMutation.mutateAsync(input);
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? "Editar Sede" : "Nueva Sede"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la sede"
              : "Completa los datos para crear una nueva sede"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto pr-4 min-h-0">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="address">Dirección</TabsTrigger>
                  <TabsTrigger value="schedule">Horario</TabsTrigger>
                </TabsList>

                {/* Tab General */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nombre <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Sede Central" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="MAD-01" {...field} />
                        </FormControl>
                        <FormDescription>
                          Código interno para identificar la sede
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="+34 912 345 678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="sede@empresa.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona horaria</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona zona horaria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-6 pt-2">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Activa</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Sede principal</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tab Dirección */}
                <TabsContent value="address" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="address_line1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Dirección <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Calle Gran Vía 123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address_line2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección (línea 2)</FormLabel>
                        <FormControl>
                          <Input placeholder="Piso 5, Puerta A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ciudad <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Madrid" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state_province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia/Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="Madrid" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código Postal</FormLabel>
                          <FormControl>
                            <Input placeholder="28001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>País</FormLabel>
                          <FormControl>
                            <Input placeholder="España" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tab Horario */}
                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Define el horario de apertura para cada día. Deja vacío si
                    la sede está cerrada ese día.
                  </p>

                  {DAYS_OF_WEEK.map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-3 gap-4 items-center">
                      <span className="font-medium">{label}</span>

                      <FormField
                        control={form.control}
                        name={`${key}_open` as keyof FormData}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value as string}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Apertura" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Cerrado</SelectItem>
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`${key}_close` as keyof FormData}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value as string}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Cierre" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Cerrado</SelectItem>
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 mt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar"
                    : "Crear sede"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
