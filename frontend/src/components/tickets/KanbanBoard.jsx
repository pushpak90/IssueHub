import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { configService } from '../../services/configService'
import { getPriorityConfig, getTypeConfig, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Single ticket card ───────────────────────────────────────────────────────
function TicketCard({ ticket, isDragging = false }) {
  const priority = getPriorityConfig(ticket.priority)
  const type = getTypeConfig(ticket.type)
  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date()

  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-800 p-3.5 shadow-sm
      transition-all select-none
      ${isDragging
        ? 'opacity-40 border-primary-300 shadow-none'
        : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-grab'
      }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{ticket.ticketNumber}</span>
        <span className="text-sm">{type.icon}</span>
      </div>
      <Link to={`/tickets/${ticket.id}`} onClick={e => e.stopPropagation()}>
        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-3 hover:text-primary-600 transition-colors">
          {ticket.title}
        </p>
      </Link>
      <div className="flex items-center justify-between gap-2">
        <span className={`badge text-[10px] px-2 py-0.5 ${priority.className}`}>
          {priority.label}
        </span>
        <div className="flex items-center gap-1.5">
          {ticket.dueDate && (
            <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {isOverdue ? '⚠' : '📅'} {ticket.dueDate}
            </span>
          )}
          {ticket.assignee && (
            <div
              title={ticket.assignee.firstName
                ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                : ticket.assignee.username}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[9px] font-bold dark:bg-primary-900/30 dark:text-primary-400">
              {(ticket.assignee.firstName || ticket.assignee.username)?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sortable wrapper for each ticket ─────────────────────────────────────────
function SortableTicketCard({ ticket }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} isDragging={isDragging} />
    </div>
  )
}

// ── Droppable Kanban column ───────────────────────────────────────────────────
function KanbanColumn({ colId, title, color, tickets }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })

  return (
    <div className={`flex min-w-[270px] max-w-[270px] flex-col rounded-xl border
      border-t-4 border-gray-200 dark:border-gray-700
      bg-gray-50/80 dark:bg-gray-900/40 transition-colors
      ${isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300' : ''}
    `}
      style={{ borderTopColor: color || '#6B7280' }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{title}</span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 font-medium px-1.5">
            {tickets.length}
          </span>
        </div>
        {isOver && (
          <span className="text-[10px] text-primary-500 font-medium animate-pulse">Drop here</span>
        )}
      </div>

      {/* Ticket list — droppable area */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 min-h-[400px] max-h-[600px] space-y-2.5">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(ticket => (
            <SortableTicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className={`flex h-24 items-center justify-center rounded-xl border-2 border-dashed transition-colors
            ${isOver
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700'
            }`}>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isOver ? '✓ Release to move here' : 'Drop tickets here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Kanban board ─────────────────────────────────────────────────────────
export default function KanbanBoard({ projectId }) {
  const queryClient = useQueryClient()
  const [activeTicket, setActiveTicket] = useState(null)

  // Fetch dynamic statuses for this project (falls back to global if none defined)
  // staleTime:0 ensures new statuses added by admin appear immediately
  const { data: statuses = [], isLoading: statusLoading } = useQuery({
    queryKey: ['ticket-statuses', projectId ?? 'global'],
    queryFn: () => configService.getStatuses(projectId),
    staleTime: 0,
  })

  const { data, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', 'project', projectId],
    queryFn: () => ticketService.getProjectTickets(projectId, { size: 200 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => ticketService.updateTicket(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['tickets', 'project', projectId]),
    onError: () => toast.error('Failed to move ticket'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const tickets = data?.content || []
  const getColumnTickets = (statusName) => tickets.filter(t => t.status === statusName)

  const handleDragStart = ({ active }) => {
    const found = tickets.find(t => t.id === active.id || t.id === Number(active.id))
    setActiveTicket(found || null)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveTicket(null)
    if (!over) return

    const activeId = typeof active.id === 'string' ? Number(active.id) : active.id
    const ticket = tickets.find(t => t.id === activeId)
    if (!ticket) return

    // Dropped onto a column header (droppable id = status name)
    const overColumn = statuses.find(s => s.name === over.id)
    if (overColumn) {
      if (ticket.status !== overColumn.name)
        updateMutation.mutate({ id: ticket.id, status: overColumn.name })
      return
    }

    // Dropped onto another ticket — move to that ticket's status
    const overId = typeof over.id === 'string' ? Number(over.id) : over.id
    const overTicket = tickets.find(t => t.id === overId)
    if (overTicket && ticket.status !== overTicket.status)
      updateMutation.mutate({ id: ticket.id, status: overTicket.status })
  }

  const isLoading = statusLoading || ticketsLoading

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="min-w-[270px] h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTicket(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(s => (
          <KanbanColumn
            key={s.name}
            colId={s.name}
            title={s.displayName}
            color={s.color}
            tickets={getColumnTickets(s.name)}
          />
        ))}
      </div>

      {/* Ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeTicket && (
          <div className="rotate-2 opacity-95 shadow-2xl">
            <TicketCard ticket={activeTicket} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
