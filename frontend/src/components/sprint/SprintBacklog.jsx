import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Play, CheckSquare, Trash2, ChevronDown, ChevronRight,
  X, Loader2, Calendar, Target, ArrowRight, Clock, AlertTriangle,
  Flag, List, Zap
} from 'lucide-react'
import { sprintService } from '../../services/sprintService'
import { getStatusConfig, getPriorityConfig, getTypeConfig, formatDate, timeAgo } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Create Sprint Modal ───────────────────────────────────────────────────────
function CreateSprintModal({ projectId, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '' })

  const mutation = useMutation({
    mutationFn: () => sprintService.createSprint(projectId, form),
    onSuccess: () => {
      toast.success('Sprint created!')
      queryClient.invalidateQueries(['sprints', projectId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary-600" /> Create Sprint
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprint Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="Sprint 1, Sprint 2, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sprint Goal <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              className="input resize-none min-h-[70px]"
              placeholder="What do you want to achieve in this sprint?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Sprint'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Single ticket row ─────────────────────────────────────────────────────────
function TicketRow({ ticket, sprintId, onAdd, onRemove, inSprint = false, canManage = true }) {
  const status   = getStatusConfig(ticket.status)
  const priority = getPriorityConfig(ticket.priority)
  const type     = getTypeConfig(ticket.type)

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors">
      <span className="text-sm shrink-0">{type.icon}</span>
      <span className="text-[10px] font-mono text-gray-400 w-16 shrink-0">{ticket.ticketNumber}</span>
      <Link to={`/tickets/${ticket.id}`}
        className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 truncate">
        {ticket.title}
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`badge text-[10px] ${status.className}`}>{status.label}</span>
        <div className={`h-2 w-2 rounded-full ${priority.dot}`} title={priority.label} />
        {ticket.assignee && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[9px] font-semibold dark:bg-primary-900/30">
            {(ticket.assignee.firstName || ticket.assignee.username)?.[0]}
          </div>
        )}
      </div>
      {/* Action buttons — only for admin/manager */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {inSprint && canManage && (
          <button onClick={() => onRemove(ticket.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs"
            title="Move to backlog">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!inSprint && canManage && (
          <button onClick={() => onAdd(ticket.id)}
            className="flex items-center gap-1 text-xs px-2 h-6 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium"
            title="Add to sprint">
            <ArrowRight className="h-3 w-3" /> Add
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sprint card ───────────────────────────────────────────────────────────────
function SprintCard({ sprint, projectId, canManage = false, onAddTicket, onRemoveTicket }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(sprint.status === 'ACTIVE')

  const { data: tickets = [] } = useQuery({
    queryKey: ['sprint-tickets', sprint.id],
    queryFn: () => sprintService.getSprintTickets(sprint.id),
    enabled: expanded,
  })

  const startMutation = useMutation({
    mutationFn: () => sprintService.startSprint(sprint.id),
    onSuccess: () => {
      toast.success(`${sprint.name} started! 🚀`)
      queryClient.invalidateQueries(['sprints', projectId])
      queryClient.invalidateQueries(['active-sprint', projectId])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to start sprint'),
  })

  const completeMutation = useMutation({
    mutationFn: () => sprintService.completeSprint(sprint.id),
    onSuccess: () => {
      toast.success(`${sprint.name} completed! ✅`)
      queryClient.invalidateQueries(['sprints', projectId])
      queryClient.invalidateQueries(['active-sprint', projectId])
      queryClient.invalidateQueries(['backlog', projectId])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => sprintService.deleteSprint(sprint.id),
    onSuccess: () => {
      toast.success('Sprint deleted')
      queryClient.invalidateQueries(['sprints', projectId])
      queryClient.invalidateQueries(['backlog', projectId])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot delete'),
  })

  const statusColors = {
    PLANNING:  'border-l-gray-400 bg-gray-50 dark:bg-gray-900/30',
    ACTIVE:    'border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
    COMPLETED: 'border-l-blue-400 bg-blue-50/30 dark:bg-blue-900/10',
  }

  const doneDone = tickets.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const total    = tickets.length
  const progress = total > 0 ? Math.round((doneDone / total) * 100) : 0

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${statusColors[sprint.status]} overflow-hidden`}>
      {/* Sprint header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <button className="text-gray-400 shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{sprint.name}</span>
            <span className={`badge text-[10px] ${
              sprint.status === 'ACTIVE'    ? 'bg-green-100 text-green-700' :
              sprint.status === 'PLANNING'  ? 'bg-gray-100 text-gray-600'  :
              'bg-blue-100 text-blue-700'
            }`}>{sprint.statusLabel}</span>
            <span className="text-xs text-gray-400">{sprint.ticketCount} ticket{sprint.ticketCount !== 1 ? 's' : ''}</span>
          </div>
          {sprint.goal && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Target className="h-3 w-3 shrink-0" /> {sprint.goal}
            </p>
          )}
        </div>

        {/* Dates */}
        {(sprint.startDate || sprint.endDate) && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            {sprint.startDate && formatDate(sprint.startDate)}
            {sprint.startDate && sprint.endDate && ' → '}
            {sprint.endDate && formatDate(sprint.endDate)}
          </div>
        )}

        {/* Progress bar for active */}
        {sprint.status === 'ACTIVE' && total > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        )}

        {/* Action buttons — Admin/Manager only */}
        {canManage && (
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            {sprint.status === 'PLANNING' && (
              <button onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">
                <Play className="h-3 w-3" /> Start
              </button>
            )}
            {sprint.status === 'ACTIVE' && (
              <button onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors">
                <CheckSquare className="h-3 w-3" /> Complete
              </button>
            )}
            {sprint.status !== 'ACTIVE' && (
              <button onClick={() => deleteMutation.mutate()}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ticket list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
            <div className="p-2">
              {tickets.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">
                  No tickets yet — add from the backlog below
                </p>
              ) : (
                tickets.map(ticket => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    sprintId={sprint.id}
                    inSprint
                    canManage={canManage}
                    onRemove={(ticketId) => {
                      sprintService.removeTicketFromSprint(sprint.id, ticketId).then(() => {
                        queryClient.invalidateQueries(['sprint-tickets', sprint.id])
                        queryClient.invalidateQueries(['backlog', projectId])
                        toast.success('Moved to backlog')
                      })
                    }}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Backlog view ─────────────────────────────────────────────────────────
export default function SprintBacklog({ projectId }) {
  const queryClient = useQueryClient()
  const { user } = useSelector(s => s.auth)
  const canManage = user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')
  const [showCreate, setShowCreate] = useState(false)
  const [backlogExpanded, setBacklogExpanded] = useState(true)
  const [selectedSprint, setSelectedSprint] = useState(null)

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintService.getProjectSprints(projectId),
  })

  const { data: backlog = [], isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => sprintService.getBacklog(projectId),
  })

  const planningSprints  = sprints.filter(s => s.status === 'PLANNING')
  const activeSprint     = sprints.find(s => s.status === 'ACTIVE')
  const completedSprints = sprints.filter(s => s.status === 'COMPLETED')

  const handleAddToSprint = async (ticketId) => {
    if (!selectedSprint) {
      toast.error('Select a sprint to add tickets to')
      return
    }
    await sprintService.addTicketToSprint(selectedSprint, ticketId)
    queryClient.invalidateQueries(['sprint-tickets', selectedSprint])
    queryClient.invalidateQueries(['backlog', projectId])
    toast.success('Ticket added to sprint')
  }

  if (sprintsLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {showCreate && <CreateSprintModal projectId={projectId} onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sprints & Backlog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeSprint
              ? `Active: ${activeSprint.name} · ${backlog.length} ticket${backlog.length !== 1 ? 's' : ''} in backlog`
              : `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''} · ${backlog.length} in backlog`}
          </p>
        </div>
        {canManage ? (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Sprint
          </button>
        ) : (
          <span className="badge text-xs bg-gray-100 text-gray-500">View only — Sprint management is for Admins/Managers</span>
        )}
      </div>

      {/* Quick-add target selector — Admin/Manager only */}
      {canManage && (planningSprints.length > 0 || activeSprint) && backlog.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <Flag className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Adding backlog tickets to:
          </span>
          <select value={selectedSprint || ''} onChange={e => setSelectedSprint(e.target.value ? Number(e.target.value) : null)}
            className="input text-xs h-7 ml-auto w-44">
            <option value="">— Choose sprint —</option>
            {activeSprint && <option value={activeSprint.id}>🟢 {activeSprint.name} (Active)</option>}
            {planningSprints.map(s => <option key={s.id} value={s.id}>📋 {s.name}</option>)}
          </select>
        </div>
      )}

      {/* Empty state */}
      {sprints.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-12">
          <Zap className="h-10 w-10 text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No sprints yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Create your first sprint to start planning work</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Create First Sprint
          </button>
        </div>
      )}

      {/* Active Sprint */}
      {activeSprint && (
        <div>
          <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Active Sprint
          </h3>
          <SprintCard sprint={activeSprint} projectId={projectId} canManage={canManage} onAddTicket={handleAddToSprint} />
        </div>
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Planning</h3>
          <div className="space-y-2">
            {planningSprints.map(s => (
              <SprintCard key={s.id} sprint={s} projectId={projectId} canManage={canManage} onAddTicket={handleAddToSprint} />
            ))}
          </div>
        </div>
      )}

      {/* Backlog */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 cursor-pointer"
          onClick={() => setBacklogExpanded(e => !e)}
        >
          <div className="flex items-center gap-2">
            {backlogExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Backlog</span>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 px-1.5 font-medium">
              {backlog.length}
            </span>
          </div>
          <p className="text-xs text-gray-400">Tickets not in any sprint</p>
        </div>

        <AnimatePresence>
          {backlogExpanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-2 divide-y divide-gray-50 dark:divide-gray-800/50">
                {backlogLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : backlog.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 italic">No tickets in backlog</p>
                ) : backlog.map(ticket => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    inSprint={false}
                    onAdd={handleAddToSprint}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completed sprints */}
      {completedSprints.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none list-none">
            <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
            {completedSprints.length} completed sprint{completedSprints.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {completedSprints.map(s => (
              <SprintCard key={s.id} sprint={s} projectId={projectId} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
