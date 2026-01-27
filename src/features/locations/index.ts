// ============================================================================
// Feature: Locations
// Sistema de gestion de sedes/despachos por tenant
// ============================================================================

// Types
export * from "./types";

// Repository
export { locationsRepo } from "./lib/repos/locations.repo";

// Hooks - Data
export {
  useLocations,
  useActiveLocations,
  useLocation,
  useDefaultLocation,
  locationsQueryKeys,
  LOCATIONS_QUERY_KEY,
} from "./hooks/use-locations";

// Hooks - Mutations
export { useLocationMutations } from "./hooks/use-location-mutations";

// Components
export {
  LocationCard,
  LocationFormDialog,
  LocationsEmptyState,
  LocationsManager,
} from "./components";
