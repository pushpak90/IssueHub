import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Plus, LayoutList, Columns, Settings,
  Users, Ticket, Calendar, AlertTriangle, Zap, ListOrdered
} from 'lucide-react'
import { projectService } from '../services/projectService'
import { sprintService } from '../services/sprintService'
import KanbanBoard from '../components/tickets/KanbanBoard'
import TicketList from '../components/tickets/TicketList'
import TicketForm from '../components/tickets/TicketForm'
import ProjectSettings from '../components/project/ProjectSettings'
import SprintBacklog from '../components/sprint/SprintBacklog'
import ActiveSprintBoard from '../components/sprint/ActiveSprintBoard'
import { isAdmin as checkAdmin } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

export default function ProjectDetail() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const queryClient    = useQueryClient()
  const { user }       = useSelector(s => s.auth)
  const canManage      = isPrivileged(user)

  const [view,       setView]       = useState('kanban')   // 'kanban' | 'list' | 'backlog' | 'sprint' | 'settings'
  const [showCreate, setShowCreate] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => projectService.getProject(id),
  })

  const archiveMutation = useMutation({
    mutationFn: () => projectService.archiveProject(id),
    onSuccess: () => {
      toast.success('Project archived')
      queryClient.invalidateQueries(['projects'])
      navigate('/projects')
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-500">Project not found</p>
        <Link to="/projects" className="btn-primary">Back to Projects</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {showCreate && <TicketForm projectId={Number(id)} onClose={() => setShowCreate(false)} />}

      {/* ── Breadcrumb + header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/projects"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" /> Projects
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg
              bg-primary-100 text-primary-700 text-xs font-bold
              dark:bg-primary-900/30 dark:text-primary-400">
              {project.keyPrefix}
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <span className={`badge text-xs ${
              project.status === 'ACTIVE'   ? 'bg-green-100 text-green-700' :
              project.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' :
              'bg-yellow-100 text-yellow-700'
            }`}>{project.status}</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Ticket className="h-3.5 w-3.5" /> {project.totalTickets} tickets
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {project.memberCount} members
          </span>
        </div>
      </div>

      {/* ── Toolbar: view switcher + actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {[
            { id: 'kanban',   icon: Columns,      label: 'Kanban',         show: true },
            { id: 'sprint',   icon: Zap,          label: 'Active Sprint',  show: true },
            { id: 'backlog',  icon: ListOrdered,  label: 'Backlog',        show: true },
            { id: 'list',     icon: LayoutList,   label: 'List',           show: true },
            { id: 'settings', icon: Settings,     label: 'Settings',       show: canManage },
          ].filter(t => t.show).map((tab, idx, arr) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm transition-colors
                ${idx > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}
                ${view === tab.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* New Ticket button — not on settings tab */}
        {view !== 'settings' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Ticket
          </button>
        )}
      </div>

      {/* ── View content ── */}
      {view === 'kanban'   && <KanbanBoard projectId={Number(id)} />}
      {view === 'list'     && <TicketList  projectId={Number(id)} />}
      {view === 'backlog'  && <SprintBacklog projectId={Number(id)} />}
      {view === 'sprint'   && <ActiveSprintBoard projectId={Number(id)} />}

      {view === 'settings' && canManage && (
        <ProjectSettings
          project={project}
          onArchive={() => {
            if (window.confirm(`Archive "${project.name}"? It will be hidden from active lists.`)) {
              archiveMutation.mutate()
            }
          }}
        />
      )}
    </div>
  )
}
