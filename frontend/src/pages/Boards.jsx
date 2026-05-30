import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Columns, Trash2, Settings2, FolderKanban,
  X, Loader2, Zap, Lock, Eye, LayoutGrid, Edit2, CheckCircle2, Save
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { boardService } from '../services/boardService'
import { projectService } from '../services/projectService'
import { formatDate, getInitials } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

const ALL_STATUSES = ['TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE','CLOSED','ON_HOLD','CANCELLED']

// ── Create Board Modal ────────────────────────────────────────────────────────
function CreateBoardModal({ onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { boardType: 'KANBAN' }
  })
  const [selectedProjects, setSelectedProjects] = useState([])
  const [selectedColumns, setSelectedColumns] = useState(['TODO','IN_PROGRESS','IN_REVIEW','DONE'])

  const { data: projectsData } = useQuery({
    queryKey: ['projects-all-small'],
    queryFn: () => projectService.getAllProjects({ size: 200 }),
  })
  const allProjects = projectsData?.content || []

  const mutation = useMutation({
    mutationFn: (data) => boardService.createBoard({
      name:         data.name,
      description:  data.description,
      boardType:    data.boardType,
      projectIds:   selectedProjects.map(Number),
      columnConfig: selectedColumns.join(','),
    }),
    onSuccess: () => {
      toast.success('Board created!')
      queryClient.invalidateQueries(['boards'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const toggleProject = (id) => setSelectedProjects(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
  )
  const toggleColumn = (col) => setSelectedColumns(c =>
    c.includes(col) ? c.filter(x => x !== col) : [...c, col]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl mb-10">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary-600" /> Create Board
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Board Name *</label>
            <input {...register('name', { required: 'Name is required' })}
              className="input" placeholder="e.g. Frontend Team Board, QA Dashboard..." />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('description')} className="input resize-none min-h-[60px]"
              placeholder="What is this board for?" />
          </div>

          {/* Board Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Board Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'KANBAN', icon: Columns, label: 'Kanban', desc: 'Continuous flow, no sprints' },
                { value: 'SCRUM',  icon: Zap,     label: 'Scrum',  desc: 'Sprint-based iterations' },
              ].map(t => (
                <label key={t.value}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                    watch('boardType') === t.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <input type="radio" {...register('boardType')} value={t.value} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      <t.icon className="h-4 w-4 text-primary-500" /> {t.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Select Projects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Projects * <span className="text-gray-400 font-normal">({selectedProjects.length} selected)</span>
            </label>
            {allProjects.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No projects available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {allProjects.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => toggleProject(String(p.id))}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm text-left transition-all ${
                      selectedProjects.includes(String(p.id))
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700 text-[10px] font-bold shrink-0 dark:bg-primary-900/30">
                      {p.keyPrefix}
                    </div>
                    <span className="truncate text-xs font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedProjects.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">Select at least one project</p>
            )}
          </div>

          {/* Columns config */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Columns <span className="text-gray-400 font-normal">(choose which statuses to show)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map(col => (
                <button key={col} type="button" onClick={() => toggleColumn(col)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedColumns.includes(col)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800'
                  }`}>
                  {col.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit"
              disabled={mutation.isPending || selectedProjects.length === 0}
              className="btn-primary flex-1 disabled:opacity-50">
              {mutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                : <><LayoutGrid className="h-4 w-4" /> Create Board</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Edit Board Modal ──────────────────────────────────────────────────────────
function EditBoardModal({ board, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name:        board.name,
      description: board.description || '',
      boardType:   board.boardType   || 'KANBAN',
    },
  })

  const currentCols = (board.columnConfig || 'TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE')
    .split(',').filter(Boolean)
  const [selectedColumns,  setCols]    = useState(currentCols)
  const [selectedProjects, setProjects] = useState((board.projects || []).map(p => p.id))

  const { data: projectsData } = useQuery({
    queryKey: ['projects-all-small'],
    queryFn: () => projectService.getAllProjects({ size: 200 }),
    staleTime: 30000,
  })
  const allProjects = projectsData?.content || []

  const mutation = useMutation({
    mutationFn: (data) => boardService.updateBoard(board.id, {
      name:         data.name,
      description:  data.description,
      boardType:    data.boardType,
      columnConfig: selectedColumns.join(','),
      projectIds:   selectedProjects,
    }),
    onSuccess: () => {
      toast.success('Board updated!')
      queryClient.invalidateQueries(['boards'])
      queryClient.invalidateQueries(['board', String(board.id)])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const toggleCol = (col) => setCols(p =>
    p.includes(col) ? p.filter(c => c !== col) : [...p, col])

  const moveCol = (idx, dir) => {
    const arr  = [...selectedColumns]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setCols(arr)
  }

  const toggleProject = (id) => setProjects(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl mb-10">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary-600" /> Edit Board
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-5">

          {/* Name + Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Board Name *</label>
              <input {...register('name', { required: true })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea {...register('description')} className="input resize-none min-h-[60px]"
                placeholder="What is this board for?" />
            </div>
          </div>

          {/* Board Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Board Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'KANBAN', icon: Columns, label: 'Kanban', desc: 'Continuous flow' },
                { value: 'SCRUM',  icon: Zap,     label: 'Scrum',  desc: 'Sprint-based'   },
              ].map(t => (
                <label key={t.value}
                  className="flex items-center gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 cursor-pointer">
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

          {/* Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Columns
              <span className="ml-1 font-normal text-gray-400">(toggle to add/remove, ↑↓ to reorder)</span>
            </label>
            {/* Toggle */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ALL_STATUSES.map(col => (
                <button key={col} type="button" onClick={() => toggleCol(col)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedColumns.includes(col)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                  {col.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {/* Order list */}
            <div className="space-y-1.5">
              {selectedColumns.map((col, idx) => (
                <div key={col} className="flex items-center justify-between rounded-lg border
                  border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {col.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveCol(idx, -1)} disabled={idx === 0}
                      className="flex h-5 w-5 items-center justify-center rounded text-gray-400
                        hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">↑</button>
                    <button type="button" onClick={() => moveCol(idx, 1)} disabled={idx === selectedColumns.length - 1}
                      className="flex h-5 w-5 items-center justify-center rounded text-gray-400
                        hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">↓</button>
                    <button type="button" onClick={() => toggleCol(col)}
                      className="flex h-5 w-5 items-center justify-center rounded text-gray-300
                        hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Projects <span className="font-normal text-gray-400">({selectedProjects.length} selected)</span>
            </label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {allProjects.map(p => {
                const sel = selectedProjects.includes(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                    className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left
                      transition-all ${sel
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}>
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold ${
                        sel ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      }`}>{p.keyPrefix}</div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                    </div>
                    {sel && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit"
              disabled={mutation.isPending || selectedColumns.length === 0 || selectedProjects.length === 0}
              className="btn-primary flex-1 disabled:opacity-50">
              {mutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Board Card ────────────────────────────────────────────────────────────────
function BoardCard({ board, index, canManage, onDelete }) {
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const columns = (board.columnConfig || '').split(',').filter(Boolean)

  return (
    <>
      {showEdit && <EditBoardModal board={board} onClose={() => setShowEdit(false)} />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer"
        onClick={() => navigate(`/boards/${board.id}`)}
      >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            board.boardType === 'SCRUM'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {board.boardType === 'SCRUM' ? <Zap className="h-5 w-5" /> : <Columns className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{board.name}</h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              board.boardType === 'SCRUM'
                ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
            }`}>{board.boardType}</span>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {/* Edit button */}
            <button
              onClick={() => setShowEdit(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400
                hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
              title="Edit board"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            {/* Delete button */}
            <button
              onClick={() => onDelete(board.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400
                hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
              title="Delete board"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {board.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{board.description}</p>
      )}

      {/* Projects */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {board.projects?.slice(0, 3).map(p => (
          <span key={p.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
            bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">
            <FolderKanban className="h-2.5 w-2.5" /> {p.keyPrefix}
          </span>
        ))}
        {board.projectCount > 3 && (
          <span className="text-[10px] text-gray-400">+{board.projectCount - 3} more</span>
        )}
        {board.projectCount === 0 && (
          <span className="text-[10px] text-gray-300 italic">No projects yet</span>
        )}
      </div>

      {/* Columns preview */}
      <div className="flex gap-1 flex-wrap">
        {columns.slice(0, 5).map(col => (
          <span key={col} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono">
            {col.replace(/_/g, ' ')}
          </span>
        ))}
        {columns.length > 5 && <span className="text-[9px] text-gray-300">+{columns.length - 5}</span>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
        <span className="text-xs text-gray-400">
          {board.projectCount} project{board.projectCount !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-gray-400">{formatDate(board.createdAt)}</span>
      </div>
      </motion.div>
    </>
  )
}

// ── Main Boards Page ──────────────────────────────────────────────────────────
export default function Boards() {
  const { user } = useSelector(s => s.auth)
  const queryClient = useQueryClient()
  const canManage = isPrivileged(user)
  const [showCreate, setShowCreate] = useState(false)

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: boardService.getAllBoards,
  })

  const deleteMutation = useMutation({
    mutationFn: boardService.deleteBoard,
    onSuccess: () => { toast.success('Board deleted'); queryClient.invalidateQueries(['boards']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  })

  return (
    <div className="space-y-4">
      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boards</h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-project boards — view tickets from multiple projects in one place
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Board
          </button>
        )}
      </div>

      {/* Read-only hint for developers */}
      {!canManage && (
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
          <Lock className="h-4 w-4 shrink-0" />
          Boards are managed by Admins and Managers. You can view boards you have access to.
        </div>
      )}

      {/* Board grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
          <LayoutGrid className="h-12 w-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No boards yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Create a board to aggregate tickets from multiple projects
          </p>
          {canManage && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Create your first board
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board, i) => (
            <BoardCard
              key={board.id}
              board={board}
              index={i}
              canManage={canManage}
              onDelete={(id) => window.confirm('Delete this board?') && deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
