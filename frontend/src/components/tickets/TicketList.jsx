import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react'
import { ticketService } from '../../services/ticketService'
import { userService } from '../../services/userService'
import { getStatusConfig, getPriorityConfig, getTypeConfig, timeAgo, formatDate } from '../../utils/helpers'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

export default function TicketList({ projectId }) {
  const { user: currentUser } = useSelector(s => s.auth)
  const privileged = isPrivileged(currentUser)

  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    search: '',
    assigneeId: '',
  })

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [filters])

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
    enabled: privileged,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'project', projectId, page, filters],
    queryFn: () => ticketService.getProjectTickets(projectId, {
      page, size: 15,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.type && { type: filters.type }),
      ...(filters.search && { search: filters.search }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    }),
  })

  const tickets = data?.content || []
  const hasFilters = filters.status || filters.priority || filters.type || filters.search ||
    (privileged && filters.assigneeId)

  const clearFilters = () => setFilters({
    status: '', priority: '', type: '', search: '',
    assigneeId: privileged ? '' : String(currentUser?.id || ''),
  })

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  return (
    <div className="space-y-3">
      {/* ── Filter bar ── */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              placeholder="Search by title or ticket number..."
              className="input pl-8 text-sm h-8 w-full"
            />
          </div>

          {/* Status */}
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
            className="input text-sm h-8 w-36">
            <option value="">All Status</option>
            {['TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE','CLOSED','ON_HOLD','CANCELLED'].map(s => (
              <option key={s} value={s}>{getStatusConfig(s).label}</option>
            ))}
          </select>

          {/* Priority */}
          <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)}
            className="input text-sm h-8 w-36">
            <option value="">All Priority</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => (
              <option key={p} value={p}>{getPriorityConfig(p).label}</option>
            ))}
          </select>

          {/* Type */}
          <select value={filters.type} onChange={e => setFilter('type', e.target.value)}
            className="input text-sm h-8 w-36">
            <option value="">All Types</option>
            {['BUG','FEATURE','TASK','IMPROVEMENT','EPIC','STORY','TEST','DOCUMENTATION'].map(t => (
              <option key={t} value={t}>{getTypeConfig(t).label}</option>
            ))}
          </select>

          {/* Assignee — admin/manager only */}
          {privileged && (
            <select
              value={filters.assigneeId}
              onChange={e => setFilter('assigneeId', e.target.value)}
              className="input text-sm h-8 w-44"
            >
              <option value="">All Assignees</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
                </option>
              ))}
            </select>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Quick "My tickets" shortcut for developers */}
        {!privileged && (
          <button
            onClick={() => setFilter('assigneeId', String(currentUser?.id || ''))}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              filters.assigneeId === String(currentUser?.id || '')
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            My Tickets
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <p className="text-gray-400 text-sm">No tickets found</p>
                    {hasFilters && (
                      <button onClick={clearFilters}
                        className="text-xs text-primary-600 hover:underline mt-1">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : tickets.map(ticket => {
                const status = getStatusConfig(ticket.status)
                const priority = getPriorityConfig(ticket.priority)
                const type = getTypeConfig(ticket.type)
                return (
                  <tr key={ticket.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link to={`/tickets/${ticket.id}`}
                        className="flex items-center gap-2 hover:text-primary-600 group">
                        <span className="text-base">{type.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 truncate">
                          {ticket.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${priority.dot}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{priority.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${type.className}`}>{type.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[9px] font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                            {ticket.assignee.firstName?.[0] || ticket.assignee.username?.[0]}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {ticket.assignee.firstName
                              ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                              : ticket.assignee.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${ticket.dueDate ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300'}`}>
                        {ticket.dueDate ? formatDate(ticket.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{timeAgo(ticket.createdAt)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
            <span className="text-xs text-gray-500">
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} tickets
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={data.first}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.last}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
