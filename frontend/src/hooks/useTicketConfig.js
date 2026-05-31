import { useQuery } from '@tanstack/react-query'
import { configService } from '../services/configService'

const STALE_TIME = 5 * 60 * 1000  // 5 minutes

/**
 * Returns the list of statuses for a project.
 * If projectId is provided, returns project-specific statuses (falls back to global).
 * If projectId is omitted, returns the global default statuses.
 */
export function useStatusConfig(projectId) {
  return useQuery({
    queryKey: ['ticket-statuses', projectId ?? 'global'],
    queryFn: () => configService.getStatuses(projectId),
    staleTime: STALE_TIME,
  })
}

/** Returns the globally configured priority list. */
export function usePriorityConfig() {
  return useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: configService.getPriorities,
    staleTime: STALE_TIME,
  })
}

/** Returns the globally configured ticket type list. */
export function useTypeConfig() {
  return useQuery({
    queryKey: ['ticket-types'],
    queryFn: configService.getTypes,
    staleTime: STALE_TIME,
  })
}

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Build a status lookup map from the config array.
 * Returns { [name]: { displayName, color, textColor, icon, isFinal, isDefault } }
 */
export function buildStatusMap(statuses = []) {
  return Object.fromEntries(
    statuses.map(s => [s.name, s])
  )
}

export function buildPriorityMap(priorities = []) {
  return Object.fromEntries(
    priorities.map(p => [p.name, p])
  )
}

export function buildTypeMap(types = []) {
  return Object.fromEntries(
    types.map(t => [t.name, t])
  )
}
