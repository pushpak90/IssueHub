import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Calendar, CheckSquare, Target, AlertTriangle } from 'lucide-react'
import { sprintService } from '../../services/sprintService'
import { ticketService } from '../../services/ticketService'
import { getPriorityConfig, getTypeConfig, getStatusConfig, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const SPRINT_COLUMNS = [
  { id: 'TODO',        title: 'To Do',       color: 'border-t-gray-400' },
  { id: 'IN_PROGRESS', title: 'In Progress',  color: 'border-t-blue-500' },
  { id: 'IN_REVIEW',   title: 'In Review',    color: 'border-t-purple-500' },
  { id: 'TESTING',     title: 'Testing',      color: 'border-t-yellow-500' },
  { id: 'DONE',        title: 'Done',         color: 'border-t-green-500' },
]

function TicketCard({ ticket, isDragging = false }) {
  const priority = getPriorityConfig(ticket.priority)
  const type     = getTypeConfig(ticket.type)
  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-800 p-3.5 select-none
      ${isDragging
        ? 'opacity-40 border-primary-300'
        : 'border-gray-200 dark:border-gray-700 hover:shadow-md cursor-grab'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-gray-400">{ticket.ticketNumber}</span>
        <span>{type.icon}</span>
      </div>
      <Link to={`/tickets/${ticket.id}`} onClick={e => e.stopPropagation()}>
        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2.5 hover:text-primary-600">{ticket.title}</p>
      </Link>
      <div className="flex items-center justify-between">
        <span className={`badge text-[10px] px-2 py-0.5 ${priority.className}`}>{priority.label}</span>
        <div className="flex items-center gap-1.5">
          {ticket.dueDate && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />{ticket.dueDate}
            </span>
          )}
          {ticket.assignee && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[9px] font-bold dark:bg-primary-900/30">
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

function SprintColumn({ column, tickets }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div className={`flex min-w-[260px] flex-col rounded-xl border border-t-4 ${column.color}
      border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 transition-colors
      ${isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-sm text-gray-900 dark:text-white">{column.title}</span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 px-1.5">
          {tickets.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 min-h-[350px] max-h-[550px] space-y-2.5">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(t => <SortableTicket key={t.id} ticket={t} />)}
        </SortableContext>
        {tickets.length === 0 && (
          <div className={`flex h-20 items-center justify-center rounded-xl border-2 border-dashed transition-colors
            ${isOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-xs text-gray-400">{isOver ? '✓ Drop here' : 'Empty'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActiveSprintBoard({ projectId }) {
  const queryClient = useQueryClient()
  const [activeTicket, setActiveTicket] = useState(null)

  const { data: sprint } = useQuery({
    queryKey: ['active-sprint', projectId],
    queryFn: () => sprintService.getActiveSprint(projectId),
  })

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['sprint-tickets', sprint?.id],
    queryFn: () => sprintService.getSprintTickets(sprint.id),
    enabled: !!sprint?.id,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => ticketService.updateTicket(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['sprint-tickets', sprint?.id]),
    onError: () => toast.error('Failed to update ticket'),
  })

  const completeMutation = useMutation({
    mutationFn: () => sprintService.completeSprint(sprint.id),
    onSuccess: () => {
      toast.success('Sprint completed!')
      queryClient.invalidateQueries(['active-sprint', projectId])
      queryClient.invalidateQueries(['sprints', projectId])
      queryClient.invalidateQueries(['backlog', projectId])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const getColumnTickets = (status) => tickets.filter(t => t.status === status)
  const doneCount = tickets.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const progress  = tickets.length > 0 ? Math.round((doneCount / tickets.length) * 100) : 0

  const handleDragStart = ({ active }) => setActiveTicket(tickets.find(t => t.id === active.id) || null)
  const handleDragEnd   = ({ active, over }) => {
    setActiveTicket(null)
    if (!over) return
    const ticket     = tickets.find(t => t.id === active.id)
    const overColumn = SPRINT_COLUMNS.find(c => c.id === over.id)
    const newStatus  = overColumn?.id || tickets.find(t => t.id === Number(over.id))?.status
    if (newStatus && ticket && ticket.status !== newStatus) {
      updateMutation.mutate({ id: ticket.id, status: newStatus })
    }
  }

  if (!sprint) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
      <Zap className="h-10 w-10 text-gray-300 mb-3" />
      <p className="font-medium text-gray-500">No active sprint</p>
      <p className="text-xs text-gray-400 mt-1">Go to Backlog → start a sprint to use this board</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Sprint info header */}
      <div className="card p-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
            <span className="badge text-xs bg-green-100 text-green-700">Active</span>
          </div>
          {sprint.goal && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Target className="h-3 w-3" /> {sprint.goal}
            </p>
          )}
          {(sprint.startDate || sprint.endDate) && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {sprint.startDate && formatDate(sprint.startDate)}
              {sprint.startDate && sprint.endDate && ' – '}
              {sprint.endDate && formatDate(sprint.endDate)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-32 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
            </div>
            <p className="text-[10px] text-gray-400">{doneCount}/{tickets.length} done</p>
          </div>

          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors dark:bg-blue-900/20 dark:text-blue-400"
          >
            <CheckSquare className="h-4 w-4" /> Complete Sprint
          </button>
        </div>
      </div>

      {/* Warning if nearly over deadline */}
      {sprint.endDate && new Date(sprint.endDate) < new Date() && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Sprint deadline has passed! Consider completing or extending this sprint.
        </div>
      )}

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-4">
          {SPRINT_COLUMNS.map(c => <div key={c.id} className="min-w-[260px] h-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {SPRINT_COLUMNS.map(col => (
              <SprintColumn key={col.id} column={col} tickets={getColumnTickets(col.id)} />
            ))}
          </div>
          <DragOverlay>
            {activeTicket && <div className="rotate-2 opacity-95 shadow-2xl"><TicketCard ticket={activeTicket} /></div>}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
