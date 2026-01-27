/**
 * @fileoverview Locations Manager
 * @description Componente principal para gestionar sedes del tenant.
 * Se usa dentro de la página de configuración o como sección en admin.
 */

import { useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocations } from "../hooks/use-locations";
import { useLocationMutations } from "../hooks/use-location-mutations";
import { LocationCard } from "./LocationCard";
import { LocationFormDialog } from "./LocationFormDialog";
import { LocationsEmptyState } from "./LocationsEmptyState";
import type { TenantLocation, LocationFilters } from "../types";

export function LocationsManager() {
  // State
  const [filters, setFilters] = useState<LocationFilters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TenantLocation | null>(
    null
  );
  const [deletingLocation, setDeletingLocation] =
    useState<TenantLocation | null>(null);

  // Hooks
  const { data: locations, isLoading, refetch } = useLocations(filters);
  const { deleteMutation, setDefaultMutation, toggleActiveMutation } =
    useLocationMutations();

  // Handlers
  const handleCreate = () => {
    setEditingLocation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (location: TenantLocation) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLocation(null);
  };

  const handleDelete = (location: TenantLocation) => {
    setDeletingLocation(location);
  };

  const confirmDelete = async () => {
    if (deletingLocation) {
      await deleteMutation.mutateAsync(deletingLocation.id);
      setDeletingLocation(null);
    }
  };

  const handleSetDefault = async (location: TenantLocation) => {
    await setDefaultMutation.mutateAsync(location.id);
  };

  const handleToggleActive = async (
    location: TenantLocation,
    isActive: boolean
  ) => {
    await toggleActiveMutation.mutateAsync({ id: location.id, isActive });
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleActiveFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      is_active: value === "all" ? undefined : value === "active",
    }));
  };

  const isEmpty = !isLoading && (!locations || locations.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Sedes</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las ubicaciones físicas de tu organización
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva sede
        </Button>
      </div>

      {/* Filtros */}
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ciudad..."
              value={filters.search || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={
              filters.is_active === undefined
                ? "all"
                : filters.is_active
                  ? "active"
                  : "inactive"
            }
            onValueChange={handleActiveFilterChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <LocationsEmptyState onCreateClick={handleCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations?.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Diálogo de formulario */}
      <LocationFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        location={editingLocation}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={!!deletingLocation}
        onOpenChange={(open) => !open && setDeletingLocation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sede</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la sede "
              {deletingLocation?.name}"? Esta acción no se puede deshacer.
              Las citas asociadas a esta sede no serán eliminadas pero
              perderán la referencia a la sede.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
