import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Phone, MapPin } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useActiveLocations } from "@/features/locations";
import { useTenantAgents } from "../hooks/use-tenant-agents";
import { useAppointmentMutations } from "../hooks/use-appointment-mutations";
import type {
  AppointmentDetailed,
  AppointmentType,
  CreateAppointmentInput,
} from "../types";
import { DEFAULT_DURATION_OPTIONS } from "../types";

const appointmentSchema = z
  .object({
    type: z.enum(["call", "in_person"]),
    contact_id: z.string().min(1, "Selecciona un contacto"),
    scheduled_date: z.date({ required_error: "Selecciona una fecha" }),
    scheduled_time: z.string().min(1, "Selecciona una hora"),
    duration_minutes: z.number().min(5).max(480),
    title: z.string().optional(),
    description: z.string().optional(),
    customer_notes: z.string().optional(),
    agent_id: z.string().optional(),
    location_id: z.string().optional(),
    call_phone_number: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "call") {
        return !!data.agent_id;
      }
      return true;
    },
    {
      message: "Selecciona un comercial para la llamada",
      path: ["agent_id"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "in_person") {
        return !!data.location_id;
      }
      return true;
    },
    {
      message: "Selecciona una sede para la cita presencial",
      path: ["location_id"],
    }
  );

type FormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentDetailed | null;
  preSelectedContactId?: string | null;
  preSelectedContactName?: string | null;
  preSelectedContactPhone?: string | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  return { value, label: value };
});

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  preSelectedContactId,
  preSelectedContactName,
  preSelectedContactPhone,
}: AppointmentFormDialogProps) {
  const { data: locations } = useActiveLocations();
  const { agents } = useTenantAgents();
  const { createMutation, updateMutation } = useAppointmentMutations();
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    appointment?.type || "call"
  );

  const isEditing = !!appointment;

  const form = useForm<FormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      type: "call",
      contact_id: "",
      scheduled_date: new Date(),
      scheduled_time: "10:00",
      duration_minutes: 30,
      title: "",
      description: "",
      customer_notes: "",
      agent_id: "",
      location_id: "",
      call_phone_number: "",
    },
  });

  useEffect(() => {
    if (appointment) {
      const scheduledAt = new Date(appointment.scheduled_at);
      form.reset({
        type: appointment.type,
        contact_id: appointment.contact_id,
        scheduled_date: scheduledAt,
        scheduled_time: format(scheduledAt, "HH:mm"),
        duration_minutes: appointment.duration_minutes,
        title: appointment.title || "",
        description: appointment.description || "",
        customer_notes: appointment.customer_notes || "",
        agent_id: appointment.agent_id || "",
        location_id: appointment.location_id || "",
        call_phone_number: appointment.call_phone_number || "",
      });
      setAppointmentType(appointment.type);
    } else if (preSelectedContactId) {
      form.reset({
        type: "call",
        contact_id: preSelectedContactId,
        scheduled_date: new Date(),
        scheduled_time: "10:00",
        duration_minutes: 30,
        title: "",
        description: "",
        customer_notes: "",
        agent_id: "",
        location_id: "",
        call_phone_number: preSelectedContactPhone || "",
      });
      setAppointmentType("call");
    } else {
      form.reset({
        type: "call",
        contact_id: "",
        scheduled_date: new Date(),
        scheduled_time: "10:00",
        duration_minutes: 30,
        title: "",
        description: "",
        customer_notes: "",
        agent_id: "",
        location_id: "",
        call_phone_number: "",
      });
      setAppointmentType("call");
    }
  }, [appointment, preSelectedContactId, preSelectedContactPhone, form]);

  const onSubmit = async (data: FormData) => {
    try {
      // Combinar fecha y hora
      const scheduledAt = new Date(data.scheduled_date);
      const [hours, minutes] = data.scheduled_time.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const input: CreateAppointmentInput = {
        type: data.type,
        contact_id: data.contact_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: data.duration_minutes,
        title: data.title || undefined,
        description: data.description || undefined,
        customer_notes: data.customer_notes || undefined,
        agent_id: data.type === "call" ? data.agent_id : undefined,
        location_id: data.type === "in_person" ? data.location_id : undefined,
        call_phone_number:
          data.type === "call" ? data.call_phone_number : undefined,
      };

      if (isEditing && appointment) {
        await updateMutation.mutateAsync({
          id: appointment.id,
          data: {
            scheduled_at: input.scheduled_at,
            duration_minutes: input.duration_minutes,
            title: input.title,
            description: input.description,
            customer_notes: input.customer_notes,
            agent_id: input.agent_id,
            location_id: input.location_id,
            call_phone_number: input.call_phone_number,
          },
        });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving appointment:", error);
    }
  };

  const handleTypeChange = (type: string) => {
    setAppointmentType(type as AppointmentType);
    form.setValue("type", type as AppointmentType);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de la cita"
              : "Completa los datos para programar una nueva cita"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de cita */}
            <div className="space-y-2">
              <FormLabel>Tipo de cita</FormLabel>
              <Tabs
                value={appointmentType}
                onValueChange={handleTypeChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="call" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Llamada
                  </TabsTrigger>
                  <TabsTrigger value="in_person" className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Presencial
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Contacto (si viene preseleccionado, mostrarlo) */}
            {preSelectedContactId ? (
              <div className="space-y-2">
                <FormLabel>Contacto</FormLabel>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {preSelectedContactName || "Sin nombre"}
                  </p>
                  {preSelectedContactPhone && (
                    <p className="text-sm text-muted-foreground">
                      {preSelectedContactPhone}
                    </p>
                  )}
                </div>
                <input
                  type="hidden"
                  {...form.register("contact_id")}
                  value={preSelectedContactId}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ID de Contacto <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingresa el ID del contacto"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ingresa el ID del contacto para la cita
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fecha y hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Fecha <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
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
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Hora <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona hora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duración */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona duración" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEFAULT_DURATION_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos específicos por tipo */}
            {appointmentType === "call" ? (
              <>
                <FormField
                  control={form.control}
                  name="agent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Comercial <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona comercial" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agents?.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        El comercial que realizara la llamada
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="call_phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono de llamada</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Numero alternativo para la llamada"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Dejar vacio para usar el telefono del contacto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Sede <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona sede" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      La sede donde se realizara la cita presencial
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Titulo o asunto de la cita"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas internas sobre la cita"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas del cliente */}
            <FormField
              control={form.control}
              name="customer_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas del cliente</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas o comentarios del cliente"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
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
                    : "Crear cita"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
