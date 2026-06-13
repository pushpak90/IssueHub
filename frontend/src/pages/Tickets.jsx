import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus, Ticket as TicketIcon, ChevronLeft, ChevronRight,
  Search, Filter, X, Hash, ArrowRight, Download, Loader2,
  FileDown, Users, User, CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { ticketService } from '../services/ticketService'
import { projectService } from '../services/projectService'
import { userService } from '../services/userService'
import TicketForm from '../components/tickets/TicketForm'
import { getStatusConfig, getPriorityConfig, getTypeConfig, timeAgo, formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

// ── Ticket Number Quick-Jump bar ──────────────────────────────────────────────
function TicketNumberSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!value.trim()) { setResult(null); setNotFound(false); return }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const ticket = await ticketService.getTicketByNumber(value.trim().toUpperCase())
        setResult(ticket)
      } catch {
        setResult(null)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [value])

  const go = () => {
    if (result) navigate(`/tickets/${result.id}`)
  }

  return (
    <div className="relative flex-1 max-w-xs">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400">
        <Hash className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Jump to ticket — e.g. ODB-1"
          className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
        />
        {value && (
          <button onClick={() => { setValue(''); setResult(null); setNotFound(false) }}
            className="text-gray-300 hover:text-gray-500">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown result */}
      {(result || notFound || loading) && value && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400">Searching...</div>
          )}
          {notFound && !loading && (
            <div className="px-4 py-3 text-xs text-gray-400">
              No ticket found for <span className="font-mono font-semibold">{value.toUpperCase()}</span>
            </div>
          )}
          {result && !loading && (
            <button onClick={go}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-semibold text-primary-600 dark:text-primary-400">
                    {result.ticketNumber}
                  </span>
                  <span className={`badge text-[10px] ${getStatusConfig(result.status).className}`}>
                    {getStatusConfig(result.status).label}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                <p className="text-xs text-gray-400">{result.projectName}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ onClose, filters, privileged, currentUserId, allUsers }) {
  const [exporting,   setExporting]   = useState(false)
  // 'mine' = only current user | 'all' = everyone | 'user' = specific user
  const [mode,        setMode]        = useState(privileged ? 'all' : 'mine')
  const [specificId,  setSpecificId]  = useState('')

  const activeFilters = [
    filters.projectId && 'Project filtered',
    filters.status    && `Status: ${filters.status.replace(/_/g,' ')}`,
    filters.priority  && `Priority: ${filters.priority}`,
    filters.search    && `Search: "${filters.search}"`,
  ].filter(Boolean)

  const doExport = async () => {
    setExporting(true)
    try {
      // Determine assigneeId based on mode
      const assigneeId =
        mode === 'mine'  ? currentUserId :
        mode === 'user'  ? (specificId || undefined) :
        undefined   // 'all' — no assignee filter (backend returns everything for admin)

      const rows = await ticketService.exportTickets({
        ...(filters.projectId  && { projectId:  filters.projectId  }),
        ...(filters.status     && { status:     filters.status     }),
        ...(filters.priority   && { priority:   filters.priority   }),
        ...(filters.search     && { search:     filters.search     }),
        ...(assigneeId         && { assigneeId }),
      })

      if (!rows || rows.length === 0) { toast.error('No tickets to export'); return }

      // Build CSV with commit IDs column
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const HEADERS = [
        'Ticket #', 'Title', 'Status', 'Priority', 'Type',
        'Project', 'Assignee', 'Reporter', 'Due Date', 'Est. Hours',
        'Commit IDs', 'Created At'
      ]
      const csvRows = rows.map(r => [
        r.ticketNumber,
        esc(r.title),
        r.status,
        r.priority,
        r.type,
        esc(r.projectName),
        esc(r.assignee),
        esc(r.reporter),
        r.dueDate || '',
        r.estimatedHours || '',
        esc(r.commitIds),  // semicolon-separated from backend
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '',
      ].join(','))

      const csv      = [HEADERS.join(','), ...csvRows].join('\r\n')
      const blob     = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url      = URL.createObjectURL(blob)
      const link     = document.createElement('a')
      const date     = new Date().toISOString().slice(0, 10)
      const suffix   = mode === 'mine' ? '-my-tickets' : mode === 'user' ? '-user-tickets' : '-all'
      link.href      = url
      link.download  = `tickets${suffix}-${date}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`✅ Downloaded ${rows.length} ticket${rows.length !== 1 ? 's' : ''} as CSV`)
      onClose()
    } catch (e) {
      toast.error('Export failed — please try again')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary-600" /> Export Tickets
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">

          {/* Role-based export options */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {privileged ? 'Who should be included?' : 'Export scope'}
            </p>

            <div className="space-y-2">
              {/* My Tickets — everyone gets this */}
              <button onClick={() => setMode('mine')}
                className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  mode === 'mine'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  mode === 'mine' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}>
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">My Tickets</p>
                  <p className="text-xs text-gray-400">Download only tickets assigned to you</p>
                </div>
                {mode === 'mine' && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
              </button>

              {/* All Tickets — admin/manager only */}
              {privileged && (
                <button onClick={() => setMode('all')}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    mode === 'all'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    mode === 'all' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">All Tickets</p>
                    <p className="text-xs text-gray-400">Download tickets from all assignees</p>
                  </div>
                  {mode === 'all' && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
                </button>
              )}

              {/* Specific User — admin/manager only */}
              {privileged && (
                <button onClick={() => setMode('user')}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    mode === 'user'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    mode === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Specific User</p>
                    <p className="text-xs text-gray-400">Download one person's tickets</p>
                  </div>
                  {mode === 'user' && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
                </button>
              )}

              {/* User picker when mode = 'user' */}
              {mode === 'user' && privileged && (
                <select value={specificId} onChange={e => setSpecificId(e.target.value)}
                  className="input text-sm w-full mt-1">
                  <option value="">— Select a user —</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName ? `${u.firstName} ${u.lastName}` : u.username} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Active filters summary */}
          {activeFilters.length > 0 && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                Active filters will be applied:
              </p>
              <div className="flex flex-wrap gap-1">
                {activeFilters.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CSV columns info */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CSV will include:</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Ticket #, Title, Status, Priority, Type, Project, Assignee, Reporter,
              Due Date, Est. Hours, <strong className="text-orange-600 dark:text-orange-400">Commit IDs</strong>, Created At
            </p>
          </div>

          {/* Download button */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={doExport}
              disabled={exporting || (mode === 'user' && !specificId)}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {exporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
                : <><Download className="h-4 w-4" /> Download CSV</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Global ticket list ────────────────────────────────────────────────────────
function GlobalTicketList({ filters, onFilterChange, privileged, currentUserId, onCreateTicket }) {
  const [page, setPage]           = useState(0)
  const [showExport, setShowExport] = useState(false)

  // All users needed by everyone — non-privileged users can also switch to see other people's tickets
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
    staleTime: 60000,
  })

  useEffect(() => { setPage(0) }, [filters])

  // Determine which assigneeId to send:
  // - Privileged (admin/manager): use whatever is in the filter dropdown (could be a specific user or empty = all)
  // - Non-privileged (developer/tester): use the filter dropdown (defaults to their own ID)
  const effectiveAssigneeId = filters.assigneeId || (!privileged && currentUserId ? String(currentUserId) : '')


  const { data, isLoading } = useQuery({
    queryKey: ['tickets-global', page, filters, currentUserId],
    queryFn: () => ticketService.getAllTickets({
      page, size: 20,
      ...(filters.projectId       && { projectId:  filters.projectId }),
      ...(filters.status          && { status:     filters.status    }),
      ...(filters.priority        && { priority:   filters.priority  }),
      ...(filters.search          && { search:     filters.search    }),
      ...(effectiveAssigneeId     && { assigneeId: effectiveAssigneeId }),
    }),
    keepPreviousData: true,
  })

  const tickets = data?.content || []
  const hasFilters = filters.projectId || filters.status || filters.priority || filters.search

  return (
    <div className="space-y-3">
      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          filters={filters}
          privileged={privileged}
          currentUserId={currentUserId}
          allUsers={allUsers}
        />
      )}

      {/* Filter bar */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => onFilterChange('search', e.target.value)}
              placeholder="Search by title or ticket number..."
              className="input pl-8 text-sm h-8 w-full"
            />
          </div>

          {/* Status */}
          <select value={filters.status} onChange={e => onFilterChange('status', e.target.value)}
            className="input text-sm h-8 w-36">
            <option value="">All Status</option>
            {['TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE','CLOSED','CANCELLED'].map(s => (
              <option key={s} value={s}>{getStatusConfig(s).label}</option>
            ))}
          </select>

          {/* Priority */}
          <select value={filters.priority} onChange={e => onFilterChange('priority', e.target.value)}
            className="input text-sm h-8 w-36">
            <option value="">All Priority</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => (
              <option key={p} value={p}>{getPriorityConfig(p).label}</option>
            ))}
          </select>

          {/* Assignee filter — everyone can use it, but developer defaults to self */}
          <select
            value={filters.assigneeId || ''}
            onChange={e => onFilterChange('assigneeId', e.target.value)}
            className="input text-sm h-8 w-44"
          >
            {/* For developer: "My Tickets" as default at top */}
            {!privileged && currentUserId && (
              <option value={String(currentUserId)}>👤 My Tickets</option>
            )}
            <option value="">All Assignees</option>
            {allUsers.map(u => (
              <option key={u.id} value={String(u.id)}>
                {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
              </option>
            ))}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button onClick={() => onFilterChange('clear')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}

          {/* Export button — opens modal */}
          <button
            onClick={() => setShowExport(true)}
            title="Export tickets to CSV"
            className="flex items-center gap-1.5 text-sm h-8 px-3 rounded-lg
              border border-gray-300 dark:border-gray-600
              text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="h-4 w-4" /> Export
          </button>

          {/* New Ticket */}
          <button onClick={onCreateTicket} className="btn-primary text-sm h-8 px-3">
            <Plus className="h-4 w-4" /> New Ticket
          </button>
        </div>

        {/* Developer hint */}
        {!privileged && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {filters.assigneeId === String(currentUserId)
                ? 'Showing your assigned tickets — select "All Assignees" to see everyone\'s'
                : 'Showing all assignees'}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                {['#', 'Title', 'Project', 'Status', 'Priority', 'Assignee', 'Due', 'Created'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}</tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <TicketIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">
                      {!privileged ? 'No tickets assigned to you' : 'No tickets found'}
                    </p>
                    {!privileged && (
                      <p className="text-xs text-gray-300 mt-1">
                        Ask your admin or manager to assign tickets to you
                      </p>
                    )}
                    {hasFilters && (
                      <button onClick={() => onFilterChange('clear')}
                        className="text-xs text-primary-600 mt-2 hover:underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : tickets.map(ticket => {
                const status   = getStatusConfig(ticket.status)
                const priority = getPriorityConfig(ticket.priority)
                const type     = getTypeConfig(ticket.type)
                return (
                  <tr key={ticket.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-mono font-semibold text-primary-600 dark:text-primary-400">
                        {ticket.ticketNumber}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[220px]">
                      <Link to={`/tickets/${ticket.id}`}
                        className="flex items-center gap-1.5 group">
                        <span className="text-sm">{type.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 truncate text-sm">
                          {ticket.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/projects/${ticket.projectId}`}
                        className="text-xs text-primary-600 hover:underline font-medium whitespace-nowrap">
                        {ticket.projectName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`badge text-xs ${status.className} whitespace-nowrap`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className={`h-2 w-2 rounded-full ${priority.dot}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{priority.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full
                            bg-primary-100 text-primary-700 text-[9px] font-semibold dark:bg-primary-900/30">
                            {ticket.assignee.firstName?.[0] || ticket.assignee.username?.[0]}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {ticket.assignee.firstName || ticket.assignee.username}
                          </span>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs whitespace-nowrap ${ticket.dueDate ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300'}`}>
                        {ticket.dueDate ? formatDate(ticket.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ticket.createdAt)}</span>
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
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.last}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Tickets Page ─────────────────────────────────────────────────────────
export default function Tickets() {
  const { user } = useSelector(s => s.auth)
  const privileged = isPrivileged(user)

  const [showCreate, setShowCreate] = useState(false)
  const [createProjectId, setCreateProjectId] = useState(null)

  // Developer defaults to their own tickets; Admin/Manager defaults to all
  const [filters, setFilters] = useState({
    projectId:  '',
    status:     '',
    priority:   '',
    search:     '',
    assigneeId: !isPrivileged({ roles: user?.roles }) && user?.id
      ? String(user.id)
      : '',
  })

  const isAdminUser = user?.roles?.some(r => r === 'ROLE_ADMIN')
  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-tickets', isAdminUser],
    queryFn: () => isAdminUser
      ? projectService.getAllProjects({ size: 200 })
      : projectService.getMyProjects({ size: 100 }),
    enabled: privileged,
    staleTime: 30000,
  })
  const projectList = projectsData?.content || []

  const handleFilterChange = (key, value) => {
    if (key === 'clear') {
      // Developers reset to their own tickets, admins reset to all
      setFilters({
        projectId: '', status: '', priority: '', search: '',
        assigneeId: !privileged && user?.id ? String(user.id) : '',
      })
    } else {
      setFilters(f => ({ ...f, [key]: value }))
    }
  }

  const handleCreateTicket = () => {
    setCreateProjectId(filters.projectId ? Number(filters.projectId) : null)
    setShowCreate(true)
  }

  return (
    <div className="space-y-5">
      {showCreate && (
        <TicketForm
          projectId={createProjectId}
          onClose={() => { setShowCreate(false); setCreateProjectId(null) }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">
            {privileged
              ? 'All tickets across projects'
              : `Tickets assigned to ${user?.firstName || user?.username}`}
          </p>
        </div>

        {/* Ticket Number Quick-Jump */}
        <TicketNumberSearch />
      </div>

      {/* Project filter chips — admin/manager only */}
      {privileged && projectList.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <button
            onClick={() => handleFilterChange('projectId', '')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filters.projectId
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}>
            All Projects
          </button>
          {projectList.map(p => (
            <button key={p.id}
              onClick={() => handleFilterChange('projectId', String(p.id))}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filters.projectId === String(p.id)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}>
              {p.keyPrefix} · {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Unified ticket table */}
      <GlobalTicketList
        filters={filters}
        onFilterChange={handleFilterChange}
        privileged={privileged}
        currentUserId={user?.id}
        onCreateTicket={handleCreateTicket}
      />
    </div>
  )
}
