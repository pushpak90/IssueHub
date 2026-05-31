import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, FolderKanban, Settings2, Filter, Search,
  X, Columns, Zap, Save, Loader2, Plus, Trash2,
  CheckCircle2, ChevronRight, Users
} from 'lucide-react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { boardService } from '../services/boardService'
import { ticketService } from '../services/ticketService'
import { projectService } from '../services/projectService'
import { configService } from '../services/configService'
import { getPriorityConfig, getTypeConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

/** Build a lookup map: name -> statusConfig object */
function buildStatusMap(statuses = []) {
  return Object.fromEntries(statuses.map(s => [s.name, s]))
}

/** Get label for a status name using dynamic config, fallback to formatted name */
function getStatusLabel(name, statusMap) {
  return statusMap[name]?.displayName || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Get a Tailwind top-border color class from a hex color (fallback to gray) */
function hexToTopBorder(name, statusMap) {
  const color = statusMap[name]?.color
  if (!color) return 'border-t-gray-400'
  // Map common hex colors to Tailwind classes for known defaults
  const knownMap = {
    '#6B7280': 'border-t-gray-400', '#3B82F6': 'border-t-blue-500',
    '#8B5CF6': 'border-t-purple-500', '#F59E0B': 'border-t-yellow-500',
    '#10B981': 'border-t-green-500', '#4B5563': 'border-t-gray-500',
    '#F97316': 'border-t-orange-500', '#EF4444': 'border-t-red-500',
  }
  return knownMap[color] || ''
}

// ── Edit Board Panel ──────────────────────────────────────────────────────────
function EditBoardPanel({ board, onClose, allStatuses = [] }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: { name: board.name, description: board.description || '', boardType: board.boardType },
  })

  const currentColumns    = (board.columnConfig || 'TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE')
    .split(',').filter(Boolean)
  const [columns, setCols] = useState(currentColumns)

  const currentProjectIds = (board.projects || []).map(p => p.id)
  const [projectIds, setProjectIds] = useState(currentProjectIds)

  // All available projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects-all-small'],
    queryFn: () => projectService.getAllProjects({ size: 200 }),
    staleTime: 30000,
  })
  const allProjects = projectsData?.content || []

  const saveMutation = useMutation({
    mutationFn: (data) => boardService.updateBoard(board.id, {
      name:         data.name,
      description:  data.description,
      boardType:    data.boardType,
      columnConfig: columns.join(','),
      projectIds:   projectIds,
    }),
    onSuccess: () => {
      toast.success('Board updated!')
      queryClient.invalidateQueries(['board', String(board.id)])
      queryClient.invalidateQueries(['boards'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const toggleColumn = (colId) =>
    setCols(prev => prev.includes(colId)
      ? prev.filter(c => c !== colId)
      : [...prev, colId])

  const moveCol = (idx, dir) => {
    const arr = [...columns]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= arr.length) return
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    setCols(arr)
  }

  const toggleProject = (pid) =>
    setProjectIds(prev => prev.includes(pid)
      ? prev.filter(p => p !== pid)
      : [...prev, pid])

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900
        border-l border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between
        border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary-600" /> Edit Board
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="p-6 space-y-6">

        {/* ── Basic Info ── */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Board Info
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Board Name *</label>
            <input {...register('name', { required: true })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('description')} className="input resize-none min-h-[70px]"
              placeholder="What is this board for?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Board Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'KANBAN', icon: Columns, label: 'Kanban', desc: 'Continuous flow' },
                { value: 'SCRUM',  icon: Zap,     label: 'Scrum',  desc: 'Sprint-based'  },
              ].map(t => (
                <label key={t.value}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                    false ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <input type="radio" {...register('boardType')} value={t.value} className="accent-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <t.icon className="h-3.5 w-3.5 text-primary-500" /> {t.label}
                    </p>
                    <p className="text-[10px] text-gray-400">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* ── Columns ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Board Columns
          </h3>
          <p className="text-xs text-gray-400">Toggle columns and reorder with ↑↓</p>

          {/* Toggle checkboxes */}
          <div className="flex flex-wrap gap-2">
            {allStatuses.map(s => (
              <button key={s.name} type="button" onClick={() => toggleColumn(s.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  columns.includes(s.name)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                {s.displayName}
              </button>
            ))}
          </div>

          {/* Order */}
          <div className="space-y-1.5 mt-2">
            {columns.map((colId, idx) => {
              const s = allStatuses.find(x => x.name === colId)
              return (
                <div key={colId}
                  className="flex items-center justify-between rounded-lg border
                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-4">{idx + 1}</span>
                    {s?.color && (
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {s?.displayName || colId}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveCol(idx, -1)} disabled={idx === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400
                        hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">↑</button>
                    <button type="button" onClick={() => moveCol(idx, 1)} disabled={idx === columns.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400
                        hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">↓</button>
                    <button type="button" onClick={() => toggleColumn(colId)}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-300
                        hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
            {columns.length === 0 && (
              <p className="text-xs text-orange-500">Select at least one column above</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* ── Projects ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Projects on this Board
          </h3>
          <p className="text-xs text-gray-400">Select which projects' tickets appear on this board</p>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {allProjects.map(p => {
              const selected = projectIds.includes(p.id)
              return (
                <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2.5
                    transition-all text-left ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg
                      text-[10px] font-bold shrink-0 ${
                      selected
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}>
                      {p.keyPrefix}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                  </div>
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary-600 dark:text-primary-400 shrink-0" />}
                </button>
              )
            })}
          </div>

          {projectIds.length === 0 && (
            <p className="text-xs text-orange-500">Select at least one project</p>
          )}
        </div>

        {/* ── Save ── */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 pb-2 border-t border-gray-100 dark:border-gray-800 -mx-6 px-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="submit"
            disabled={saveMutation.isPending || columns.length === 0 || projectIds.length === 0}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ── Ticket card + Kanban (same as before) ─────────────────────────────────────
function TicketCard({ ticket, isDragging = false }) {
  const priority = getPriorityConfig(ticket.priority)
  const type     = getTypeConfig(ticket.type)
  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-800 p-3.5 select-none
      ${isDragging
        ? 'opacity-40 border-primary-300 shadow-none'
        : 'border-gray-200 dark:border-gray-700 hover:shadow-md cursor-grab'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-gray-400">{ticket.ticketNumber}</span>
        <span>{type.icon}</span>
      </div>
      <Link to={`/tickets/${ticket.id}`} onClick={e => e.stopPropagation()}>
        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 hover:text-primary-600">
          {ticket.title}
        </p>
      </Link>
      <div className="flex items-center justify-between">
        <span className={`badge text-[10px] px-2 py-0.5 ${priority.className}`}>{priority.label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">
            {ticket.ticketNumber?.split('-')[0]}
          </span>
          {ticket.assignee && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full
              bg-primary-100 text-primary-700 text-[9px] font-bold dark:bg-primary-900/30">
              {(ticket.assignee.firstName || ticket.assignee.username)?.[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableTicket({ ticket }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 999 : undefined }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} isDragging={isDragging} />
    </div>
  )
}

function BoardColumn({ colId, title, tickets, statusMap }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  const color = statusMap?.[colId]?.color
  return (
    <div className={`flex min-w-[260px] flex-col rounded-xl border border-t-4
      border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 transition-colors
      ${hexToTopBorder(colId, statusMap || {})}
      ${isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300' : ''}`}
      style={color && !hexToTopBorder(colId, statusMap || {}) ? { borderTopColor: color } : undefined}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{title}</span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full
            bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 px-1.5">{tickets.length}</span>
        </div>
        {isOver && <span className="text-[10px] text-primary-500 animate-pulse">Drop here</span>}
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 min-h-[350px] space-y-2.5">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(t => <SortableTicket key={t.id} ticket={t} />)}
        </SortableContext>
        {tickets.length === 0 && (
          <div className={`flex h-20 items-center justify-center rounded-xl border-2 border-dashed
            ${isOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-xs text-gray-400">{isOver ? '✓ Release here' : 'Drop tickets'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Board Detail ─────────────────────────────────────────────────────────
export default function BoardDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const { user }     = useSelector(s => s.auth)
  const canManage    = isPrivileged(user)

  const filterRef = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [showEdit,         setShowEdit]         = useState(false)
  const [showFilter,       setShowFilter]       = useState(false)   // filter panel
  const [search,           setSearch]           = useState('')
  const [priority,         setPriority]         = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState(null)
  const [activeTicket,     setActiveTicket]     = useState(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardService.getBoard(id),
  })

  // Always fetch fresh statuses — staleTime:0 ensures new statuses appear immediately
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['ticket-statuses', 'global'],
    queryFn: () => configService.getStatuses(),
    staleTime: 0,          // no caching — always get the latest statuses
  })
  const statusMap = buildStatusMap(allStatuses)

  // All tickets for this board (no server-side status filter — distributed client-side by column)
  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['board-tickets', id, priority, search],
    queryFn: () => boardService.getBoardTickets(id, { priority, search }),
    enabled: !!id,
  })

  // Unique assignees extracted from all tickets (for the filter dropdown)
  const assignees = useMemo(() => {
    const map = new Map()
    allTickets.forEach(t => {
      if (t.assignee) map.set(t.assignee.id, t.assignee)
    })
    return Array.from(map.values())
  }, [allTickets])

  // Tickets visible after assignee filter
  const tickets = selectedAssignee === 'UNASSIGNED'
    ? allTickets.filter(t => !t.assignee)
    : selectedAssignee
      ? allTickets.filter(t => t.assignee?.id === selectedAssignee)
      : allTickets

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, newStatus }) => ticketService.updateTicket(ticketId, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries(['board-tickets', id]),
    onError: () => toast.error('Failed to update ticket'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => boardService.deleteBoard(id),
    onSuccess: () => { toast.success('Board deleted'); navigate('/boards') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  // ── Derived ───────────────────────────────────────────────────────────────

  // Columns = ALL active statuses from the API in their configured order
  const columns = allStatuses.length > 0
    ? allStatuses.map(s => s.name)
    : ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE']

  const sensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const getCol   = (colId) => tickets.filter(t => t.status === colId)

  const initials = (a) =>
    ([a.firstName, a.lastName].filter(Boolean).join(' ') || a.username || '?')
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const hasFilters = !!(search || priority || selectedAssignee)

  const handleDragStart = ({ active }) =>
    setActiveTicket(allTickets.find(t => t.id === active.id) || null)

  const handleDragEnd = ({ active, over }) => {
    setActiveTicket(null)
    if (!over) return
    const ticket = allTickets.find(t => t.id === active.id)
    if (!ticket) return
    const overCol    = columns.find(c => c === over.id)
    const overTicket = allTickets.find(t => t.id === Number(over.id))
    const newStatus  = overCol || overTicket?.status
    if (newStatus && ticket.status !== newStatus)
      updateMutation.mutate({ ticketId: ticket.id, newStatus })
  }

  // ── Loading / empty states ─────────────────────────────────────────────────

  if (boardLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-gray-200 rounded" />
      <div className="h-16 bg-gray-200 rounded-xl" />
      <div className="flex gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="min-w-[260px] h-72 bg-gray-200 rounded-xl" />)}
      </div>
    </div>
  )

  if (!board) return (
    <div className="text-center py-16">
      <p className="text-gray-400">Board not found</p>
      <Link to="/boards" className="btn-primary mt-4">Back to Boards</Link>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Edit slide-in panel */}
      <AnimatePresence>
        {showEdit && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowEdit(false)} />
            <EditBoardPanel board={board} onClose={() => setShowEdit(false)} allStatuses={allStatuses} />
          </>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/boards" className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Boards
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900 dark:text-white">{board.name}</span>
        <span className={`badge text-[10px] ml-1 ${
          board.boardType === 'SCRUM' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>{board.boardType}</span>
      </div>

      {/* Board header card */}
      <div className="card p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          {/* Left: name + projects */}
          <div>
            <div className="flex items-center gap-2">
              {board.boardType === 'SCRUM'
                ? <Zap className="h-5 w-5 text-purple-600" />
                : <Columns className="h-5 w-5 text-blue-600" />}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{board.name}</h1>
            </div>
            {board.description && <p className="text-xs text-gray-500 mt-1">{board.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {board.projects?.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg
                    bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400
                    transition-colors font-medium">
                  <FolderKanban className="h-3.5 w-3.5" /> {p.keyPrefix} · {p.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{allTickets.length} tickets</span>
            {canManage && (
              <>
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                    bg-primary-50 text-primary-700 hover:bg-primary-100
                    dark:bg-primary-900/20 dark:text-primary-400 font-medium transition-colors">
                  <Settings2 className="h-4 w-4" /> Edit Board
                </button>
                <button onClick={() => window.confirm('Delete this board?') && deleteMutation.mutate()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg
                    text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Toolbar: search + Filter button ── */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..." className="input pl-8 text-sm h-8 w-full" />
          </div>

          {/* Priority */}
          <select value={priority} onChange={e => setPriority(e.target.value)} className="input text-sm h-8 w-36">
            <option value="">All Priority</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* ── Filter button (opens assignee dropdown) ── */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(f => !f)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${
                showFilter || selectedAssignee
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <Filter className="h-3.5 w-3.5" />
              Filter
              {selectedAssignee && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] text-white font-bold">1</span>
              )}
            </button>

            {/* Filter dropdown panel */}
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-30 w-64 rounded-2xl border border-gray-200
                    dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary-500" /> Filter by Assignee
                    </span>
                    {selectedAssignee && (
                      <button onClick={() => setSelectedAssignee(null)}
                        className="text-[10px] text-red-500 hover:underline font-medium">
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Assignee list */}
                  <div className="max-h-72 overflow-y-auto">
                    {/* All / Everyone */}
                    <button
                      onClick={() => { setSelectedAssignee(null); setShowFilter(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                        !selectedAssignee
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 shrink-0">
                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Everyone</p>
                        <p className="text-[11px] text-gray-400">{allTickets.length} ticket{allTickets.length !== 1 ? 's' : ''}</p>
                      </div>
                      {!selectedAssignee && <CheckCircle2 className="h-4 w-4 text-primary-600 ml-auto shrink-0" />}
                    </button>

                    {/* Unassigned */}
                    {allTickets.some(t => !t.assignee) && (
                      <button
                        onClick={() => { setSelectedAssignee('UNASSIGNED'); setShowFilter(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                          selectedAssignee === 'UNASSIGNED'
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 shrink-0">
                          <span className="text-gray-400 text-[10px]">?</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">Unassigned</p>
                          <p className="text-[11px] text-gray-400">{allTickets.filter(t => !t.assignee).length} ticket{allTickets.filter(t => !t.assignee).length !== 1 ? 's' : ''}</p>
                        </div>
                        {selectedAssignee === 'UNASSIGNED' && <CheckCircle2 className="h-4 w-4 text-primary-600 ml-auto shrink-0" />}
                      </button>
                    )}

                    {/* Divider if both unassigned and assigned exist */}
                    {assignees.length > 0 && allTickets.some(t => !t.assignee) && (
                      <div className="mx-4 border-t border-gray-100 dark:border-gray-800" />
                    )}

                    {assignees.length === 0 && (
                      <p className="px-4 py-4 text-xs text-gray-400 text-center">No assigned tickets yet</p>
                    )}

                    {/* Assignee rows */}
                    {assignees.map(a => {
                      const isActive = selectedAssignee === a.id
                      const fullName = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.username
                      const count = allTickets.filter(t => t.assignee?.id === a.id).length
                      return (
                        <button
                          key={a.id}
                          onClick={() => { setSelectedAssignee(isActive ? null : a.id); setShowFilter(false) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full
                            bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300
                            text-xs font-bold shrink-0">
                            {initials(a)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{fullName}</p>
                            <p className="text-[11px] text-gray-400">{count} ticket{count !== 1 ? 's' : ''}</p>
                          </div>
                          {isActive && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active filter chip + Clear all */}
          {hasFilters && (
            <div className="flex items-center gap-1.5">
              {selectedAssignee && selectedAssignee !== 'UNASSIGNED' && (
                <span className="flex items-center gap-1 text-[11px] bg-primary-100 text-primary-700
                  dark:bg-primary-900/30 dark:text-primary-400 rounded-full px-2.5 py-1 font-medium">
                  {(() => {
                    const a = assignees.find(x => x.id === selectedAssignee)
                    return a ? ([a.firstName, a.lastName].filter(Boolean).join(' ') || a.username) : ''
                  })()}
                  <button onClick={() => setSelectedAssignee(null)} className="ml-0.5 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedAssignee === 'UNASSIGNED' && (
                <span className="flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600
                  dark:bg-gray-800 dark:text-gray-400 rounded-full px-2.5 py-1 font-medium">
                  Unassigned
                  <button onClick={() => setSelectedAssignee(null)} className="ml-0.5 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button onClick={() => { setSearch(''); setPriority(''); setSelectedAssignee(null) }}
                className="text-[11px] text-red-500 hover:underline px-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Active filter summary */}
        {selectedAssignee && (
          <p className="mt-2 text-[11px] text-gray-400">
            Showing <strong className="text-gray-700 dark:text-gray-300">{tickets.length}</strong> ticket{tickets.length !== 1 ? 's' : ''}
            {selectedAssignee === 'UNASSIGNED'
              ? ' with no assignee'
              : ` assigned to ${(() => { const a = assignees.find(x => x.id === selectedAssignee); return a ? ([a.firstName, a.lastName].filter(Boolean).join(' ') || a.username) : '' })()}`}
          </p>
        )}
      </div>

      {/* ── Kanban board ── */}
      {ticketsLoading || allStatuses.length === 0 ? (
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[260px] h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(col => (
              <BoardColumn
                key={col}
                colId={col}
                title={getStatusLabel(col, statusMap)}
                tickets={getCol(col)}
                statusMap={statusMap}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTicket && (
              <div className="rotate-2 opacity-90 shadow-2xl">
                <TicketCard ticket={activeTicket} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
