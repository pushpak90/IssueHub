/**
 * Static fallback constants — used only when the dynamic config API hasn't loaded.
 * The canonical source of truth is the backend config tables (ticket_status_configs,
 * ticket_priority_configs, ticket_type_configs) accessible via /config/* endpoints.
 * Use useStatusConfig / usePriorityConfig / useTypeConfig hooks for live data.
 */

export const TICKET_STATUSES = [
  { value: 'TODO',        label: 'To Do',       color: 'bg-gray-100 text-gray-700' },
  { value: 'IN_PROGRESS', label: 'In Progress',  color: 'bg-blue-100 text-blue-700' },
  { value: 'IN_REVIEW',   label: 'In Review',    color: 'bg-purple-100 text-purple-700' },
  { value: 'TESTING',     label: 'Testing',      color: 'bg-yellow-100 text-yellow-700' },
  { value: 'DONE',        label: 'Done',         color: 'bg-green-100 text-green-700' },
  { value: 'CLOSED',      label: 'Closed',       color: 'bg-gray-200 text-gray-600' },
  { value: 'ON_HOLD',     label: 'On Hold',      color: 'bg-orange-100 text-orange-700' },
  { value: 'CANCELLED',   label: 'Cancelled',    color: 'bg-red-100 text-red-600' },
]

export const TICKET_PRIORITIES = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  { value: 'HIGH',     label: 'High',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { value: 'MEDIUM',   label: 'Medium',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { value: 'LOW',      label: 'Low',      color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
]

export const TICKET_TYPES = [
  { value: 'BUG',           label: 'Bug',           icon: '🐛', color: 'text-red-600' },
  { value: 'FEATURE',       label: 'Feature',       icon: '✨', color: 'text-blue-600' },
  { value: 'TASK',          label: 'Task',          icon: '✅', color: 'text-gray-600' },
  { value: 'IMPROVEMENT',   label: 'Improvement',   icon: '⚡', color: 'text-purple-600' },
  { value: 'EPIC',          label: 'Epic',          icon: '🔮', color: 'text-indigo-600' },
  { value: 'STORY',         label: 'Story',         icon: '📖', color: 'text-teal-600' },
  { value: 'TEST',          label: 'Test',          icon: '🧪', color: 'text-orange-600' },
  { value: 'DOCUMENTATION', label: 'Documentation', icon: '📄', color: 'text-gray-500' },
]

export const KANBAN_COLUMNS = [
  { id: 'TODO',        title: 'To Do',       color: 'border-t-gray-400' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-t-blue-500' },
  { id: 'IN_REVIEW',   title: 'In Review',   color: 'border-t-purple-500' },
  { id: 'TESTING',     title: 'Testing',     color: 'border-t-yellow-500' },
  { id: 'DONE',        title: 'Done',        color: 'border-t-green-500' },
]

export const ROLES = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEVELOPER', 'ROLE_TESTER']
