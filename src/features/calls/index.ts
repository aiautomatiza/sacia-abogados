/**
 * @fileoverview Calls Feature Module
 * @description Barrel exports for calls feature
 */

// Components
export { CallsPage } from "./components/CallsPage";
export { CallsHeader } from "./components/CallsHeader";
export { CallsFilters } from "./components/CallsFilters";
export { CallsTable } from "./components/CallsTable";
export { getCallColumns, callColumns } from "./components/call-columns";
export { CallStatsCards } from "./components/CallStatsCards";
export { CallDetailModal } from "./components/CallDetailModal";
export { CallAudioPlayer } from "./components/CallAudioPlayer";
export { CallTranscriptViewer } from "./components/CallTranscriptViewer";
export { CallsEmpty } from "./components/CallsEmpty";
export { CallsError } from "./components/CallsError";
export { CallsPagination } from "./components/CallsPagination";

// Hooks
export { useCallsData, useCallDetail, callsQueryKeys, CALLS_QUERY_KEY, CALLS_STATS_QUERY_KEY } from "./hooks/use-calls-data";
export { useCallsFilters } from "./hooks/use-calls-filters";
export { useCallsPagination } from "./hooks/use-calls-pagination";
export { useCallsSorting } from "./hooks/use-calls-sorting";
export { useCallsPreferences } from "./hooks/use-calls-preferences";
export { useCallAudio } from "./hooks/use-call-audio";
export { usePrefetchCalls } from "./hooks/use-prefetch-calls";
export { useRealtimeCalls } from "./hooks/use-realtime-calls";
export { useCallsUrlState } from "./hooks/use-calls-url-state";
export type { CallDetailTab } from "./hooks/use-calls-url-state";

// Types
export * from "./types/call.types";

// Utils
export * from "./utils/call-formatters";

// Repository
export { callsRepo } from "./lib/repos/calls.repo";
