import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, FolderKanban, Settings2, Filter, Search,
  X, Columns, Zap, Save, Loader2, Plus, Trash2,
  CheckCircle2, ChevronRight
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
import { getStatusConfig, getPriorityConfig, getTypeConfig } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

const ALL_STATUSES = [
  { id: 'TODO',        label: 'To Do'       },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW',   label: 'In Review'   },
  { id: 'TESTING',     label: 'Testing'     },
  { id: 'DONE',        label: 'Done'        },
  { id: 'CLOSED',      label: 'Closed'      },
  { id: 'ON_HOLD',     label: 'On Hold'     },
  { id: 'CANCELLED',   label: 'Cancelled'   },
]

// ── Edit Board Panel ──────────────────────────────────────────────────────────
function EditBoardPanel({ board, onClose }) {
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
            {ALL_STATUSES.map(s => (
              <button key={s.id} type="button" onClick={() => toggleColumn(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  columns.includes(s.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Order */}
          <div className="space-y-1.5 mt-2">
            {columns.map((colId, idx) => {
              const s = ALL_STATUSES.find(x => x.id === colId)
              return (
                <div key={colId}
                  className="flex items-center justify-between rounded-lg border
                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-4">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {s?.label || colId}
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

function BoardColumn({ colId, title, tickets }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  return (
    <div className={`flex min-w-[260px] flex-col rounded-xl border border-t-4
      border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 transition-colors
      ${getStatusColor(colId)}
      ${isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300' : ''}`}>
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

function getStatusColor(colId) {
  const map = {
    TODO: 'border-t-gray-400', IN_PROGRESS: 'border-t-blue-500',
    IN_REVIEW: 'border-t-purple-500', TESTING: 'border-t-yellow-500',
    DONE: 'border-t-green-500', CLOSED: 'border-t-gray-300',
  }
  return map[colId] || ''
}

// ── Main Board Detail ─────────────────────────────────────────────────────────
export default function BoardDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const { user }     = useSelector(s => s.auth)
  const canManage    = isPrivileged(user)

  const [showEdit,     setShowEdit]     = useState(false)
  const [search,       setSearch]       = useState('')
  const [status,       setStatus]       = useState('')
  const [priority,     setPriority]     = useState('')
  const [activeTicket, setActiveTicket] = useState(null)

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardService.getBoard(id),
  })

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['board-tickets', id, status, priority, search],
    queryFn: () => boardService.getBoardTickets(id, { status, priority, search }),
    enabled: !!id,
  })

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

  const columns   = (board?.columnConfig || 'TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE').split(',').filter(Boolean)
  const sensors   = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const getCol    = (colId) => tickets.filter(t => t.status === colId)

  const handleDragStart = ({ active }) => setActiveTicket(tickets.find(t => t.id === active.id) || null)
  const handleDragEnd   = ({ active, over }) => {
    setActiveTicket(null)
    if (!over) return
    const ticket = tickets.find(t => t.id === active.id)
    if (!ticket) return
    const overCol    = columns.find(c => c === over.id)
    const overTicket = tickets.find(t => t.id === Number(over.id))
    const newStatus  = overCol || overTicket?.status
    if (newStatus && ticket.status !== newStatus) {
      updateMutation.mutate({ ticketId: ticket.id, newStatus })
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Edit slide-in panel */}
      <AnimatePresence>
        {showEdit && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowEdit(false)} />
            <EditBoardPanel board={board} onClose={() => setShowEdit(false)} />
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

      {/* Board info card */}
      <div className="card p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              {board.boardType === 'SCRUM'
                ? <Zap className="h-5 w-5 text-purple-600" />
                : <Columns className="h-5 w-5 text-blue-600" />}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{board.name}</h1>
            </div>
            {board.description && (
              <p className="text-xs text-gray-500 mt-1">{board.description}</p>
            )}
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

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{tickets.length} tickets · By {board.createdBy}</span>
            {canManage && (
              <>
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                    bg-primary-50 text-primary-700 hover:bg-primary-100
                    dark:bg-primary-900/20 dark:text-primary-400 font-medium transition-colors">
                  <Settings2 className="h-4 w-4" /> Edit Board
                </button>
                <button
                  onClick={() => window.confirm('Delete this board?') && deleteMutation.mutate()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg
                    text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..." className="input pl-8 text-sm h-8 w-full" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input text-sm h-8 w-36">
            <option value="">All Status</option>
            {columns.map(c => <option key={c} value={c}>{getStatusConfig(c).label}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="input text-sm h-8 w-36">
            <option value="">All Priority</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || status || priority) && (
            <button onClick={() => { setSearch(''); setStatus(''); setPriority('') }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 h-8 rounded-lg hover:bg-red-50">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      {ticketsLoading ? (
        <div className="flex gap-4">
          {columns.map(c => <div key={c} className="min-w-[260px] h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map(col => (
              <BoardColumn key={col} colId={col} title={getStatusConfig(col).label} tickets={getCol(col)} />
            ))}
          </div>
          <DragOverlay>
            {activeTicket && (
              <div className="rotate-2 opacity-90 shadow-2xl"><TicketCard ticket={activeTicket} /></div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
