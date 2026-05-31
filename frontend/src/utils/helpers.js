import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '-'
  return format(new Date(date), fmt)
}

export function timeAgo(date) {
  if (!date) return '-'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Static fallbacks (used when dynamic config hasn't loaded yet) ──────────

const STATUS_FALLBACK = {
  TODO:        { label: 'To Do',       color: '#6B7280', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  IN_PROGRESS: { label: 'In Progress', color: '#3B82F6', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  IN_REVIEW:   { label: 'In Review',   color: '#8B5CF6', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  TESTING:     { label: 'Testing',     color: '#F59E0B', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  DONE:        { label: 'Done',        color: '#10B981', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CLOSED:      { label: 'Closed',      color: '#4B5563', className: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  ON_HOLD:     { label: 'On Hold',     color: '#F97316', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CANCELLED:   { label: 'Cancelled',   color: '#EF4444', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

const PRIORITY_FALLBACK = {
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    icon: '🔴' },
  HIGH:     { label: 'High',     className: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', icon: '🟠' },
  MEDIUM:   { label: 'Medium',   className: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', icon: '🟡' },
  LOW:      { label: 'Low',      className: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: '🟢' },
}

const TYPE_FALLBACK = {
  BUG:           { label: 'Bug',           icon: '🐛', className: 'text-red-600' },
  FEATURE:       { label: 'Feature',       icon: '✨', className: 'text-blue-600' },
  TASK:          { label: 'Task',          icon: '✅', className: 'text-gray-600' },
  IMPROVEMENT:   { label: 'Improvement',   icon: '⚡', className: 'text-purple-600' },
  EPIC:          { label: 'Epic',          icon: '🔮', className: 'text-indigo-600' },
  STORY:         { label: 'Story',         icon: '📖', className: 'text-teal-600' },
  TEST:          { label: 'Test',          icon: '🧪', className: 'text-orange-600' },
  DOCUMENTATION: { label: 'Docs',          icon: '📄', className: 'text-gray-500' },
}

// ── Dynamic-aware getters ──────────────────────────────────────────────────

/**
 * Get display config for a status value.
 * @param {string} status  - the status name key e.g. "IN_PROGRESS"
 * @param {object} configMap - optional map from useStatusConfig (buildStatusMap result)
 */
export function getStatusConfig(status, configMap) {
  if (configMap && configMap[status]) {
    const c = configMap[status]
    return {
      label: c.displayName,
      color: c.color,
      className: 'rounded-full px-2 py-0.5 text-xs font-medium',
      style: { backgroundColor: c.color + '22', color: c.color },
    }
  }
  return STATUS_FALLBACK[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
}

/**
 * Get display config for a priority value.
 * @param {string} priority
 * @param {object} configMap - optional map from usePriorityConfig (buildPriorityMap result)
 */
export function getPriorityConfig(priority, configMap) {
  if (configMap && configMap[priority]) {
    const c = configMap[priority]
    return {
      label: c.displayName,
      icon: c.icon || '●',
      dot: c.dotColor || c.color,
      className: 'rounded-full px-2 py-0.5 text-xs font-medium',
      style: { backgroundColor: c.color, color: c.textColor },
    }
  }
  return PRIORITY_FALLBACK[priority] || { label: priority, className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', icon: '⚪' }
}

/**
 * Get display config for a ticket type value.
 * @param {string} type
 * @param {object} configMap - optional map from useTypeConfig (buildTypeMap result)
 */
export function getTypeConfig(type, configMap) {
  if (configMap && configMap[type]) {
    const c = configMap[type]
    return {
      label: c.displayName,
      icon: c.icon || '📌',
      className: 'font-medium',
      style: { color: c.color },
    }
  }
  return TYPE_FALLBACK[type] || { label: type, icon: '📌', className: 'text-gray-600' }
}

export function hasRole(user, role) {
  return user?.roles?.includes(role)
}

export function isAdmin(user) { return hasRole(user, 'ROLE_ADMIN') }
export function isManager(user) { return hasRole(user, 'ROLE_MANAGER') || isAdmin(user) }

export function truncate(str, n = 60) {
  return str && str.length > n ? str.slice(0, n) + '...' : str
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
