import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FolderKanban, Users, Ticket, Search,
  MoreVertical, Edit2, Trash2, UserPlus, X, AlertTriangle,
  ChevronDown, ChevronRight, Tag, Folder, Settings2
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { projectService } from '../services/projectService'
import { userService } from '../services/userService'
import { categoryService } from '../services/categoryService'
import { formatDate, getInitials, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

const CATEGORY_COLORS = [
  '#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444',
  '#EC4899','#14B8A6','#F97316','#6366F1','#84CC16',
]
const CATEGORY_ICONS = ['📁','🏢','💻','🎓','🏥','🏦','🛒','⚙️','🚀','🎯','🌐','📊']

// ── Create/Edit Category Modal ────────────────────────────────────────────────
function CategoryModal({ category, onClose }) {
  const queryClient = useQueryClient()
  const [color, setColor] = useState(category?.color || '#3B82F6')
  const [icon, setIcon]   = useState(category?.icon  || '📁')
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: category?.name || '', description: category?.description || '' }
  })

  const mutation = useMutation({
    mutationFn: (data) => category
      ? categoryService.update(category.id, { ...data, color, icon })
      : categoryService.create({ ...data, color, icon }),
    onSuccess: () => {
      toast.success(category ? 'Category updated!' : 'Category created!')
      queryClient.invalidateQueries(['categories'])
      queryClient.invalidateQueries(['projects'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {category ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input {...register('name', { required: 'Name is required' })}
              className="input" placeholder="e.g. RF-Campus, Websites, Internal Tools" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input {...register('description')} className="input" placeholder="Optional description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all
                    ${icon === ic ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Preview</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500">Category color</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Create Project Modal ──────────────────────────────────────────────────────
function CreateProjectModal({ categories, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, setValue } = useForm()

  const mutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: async (newProject) => {
      toast.success('Project created!')
      queryClient.invalidateQueries(['projects'])
      queryClient.invalidateQueries(['categories'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create project'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Project</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input" placeholder="My Project" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Prefix *</label>
            <input
              {...register('keyPrefix', {
                required: 'Required', pattern: { value: /^[A-Z0-9]+$/, message: 'Uppercase + numbers only' },
                minLength: { value: 2, message: 'Min 2 chars' }, maxLength: { value: 10, message: 'Max 10 chars' },
              })}
              className="input"
              placeholder="PROJ"
              onChange={e => setValue('keyPrefix', e.target.value.toUpperCase())}
            />
            {errors.keyPrefix && <p className="text-xs text-red-500 mt-1">{errors.keyPrefix.message}</p>}
            <p className="text-xs text-gray-400 mt-1">Used for ticket numbers e.g. PROJ-1</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('description')} className="input min-h-[70px] resize-none" />
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select {...register('categoryId', { setValueAs: v => v ? Number(v) : null })}
              className="input">
              <option value="">— No category (Uncategorized) —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Assign Category Modal ─────────────────────────────────────────────────────
function AssignCategoryModal({ project, categories, onClose }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(project.categoryId || null)

  const assignMutation = useMutation({
    mutationFn: () => selected
      ? categoryService.assignProject(project.id, selected)
      : categoryService.unassignProject(project.id),
    onSuccess: () => {
      toast.success('Category updated!')
      queryClient.invalidateQueries(['categories'])
      queryClient.invalidateQueries(['projects'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assign to Category</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Assign <strong>{project.name}</strong> to a category:</p>
        <div className="space-y-2 mb-5">
          <button onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
              !selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}>
            <span className="text-lg">🚫</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">No Category (Uncategorized)</span>
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelected(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${
                selected === cat.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}>
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.projectCount} project{cat.projectCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}
            className="btn-primary flex-1">
            {assignMutation.isPending ? 'Saving...' : 'Assign'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Project mini-card ─────────────────────────────────────────────────────────
function ProjectCard({ project, canManage, categories }) {
  const [menu, setMenu] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteProject(project.id),
    onSuccess: () => { toast.success('Project deleted'); queryClient.invalidateQueries(['projects']); queryClient.invalidateQueries(['categories']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <>
      {showAssign && <AssignCategoryModal project={project} categories={categories} onClose={() => setShowAssign(false)} />}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors">
        <Link to={`/projects/${project.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700 text-[10px] font-bold shrink-0 dark:bg-primary-900/30 dark:text-primary-400">
            {project.keyPrefix}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-primary-600">{project.name}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>{project.totalTickets} tickets</span>
              <span>·</span>
              <span>{project.memberCount} members</span>
              <span className={cn('px-1 rounded', project.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400')}>
                {project.status}
              </span>
            </div>
          </div>
        </Link>

        {canManage && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setMenu(!menu) }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1">
                  <Link to={`/projects/${project.id}`} onClick={() => setMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <FolderKanban className="h-3.5 w-3.5 text-blue-500" /> Open Project
                  </Link>
                  <button onClick={() => { setShowAssign(true); setMenu(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Tag className="h-3.5 w-3.5 text-purple-500" /> Assign Category
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button onClick={() => { if (window.confirm(`Delete "${project.name}"?`)) deleteMutation.mutate(); setMenu(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Category Group ────────────────────────────────────────────────────────────
function CategoryGroup({ category, projects, canManage, allCategories, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Category header */}
      <div className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 cursor-pointer ${expanded ? 'rounded-t-xl' : 'rounded-xl'}`}
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2.5">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <span className="text-lg">{category.icon}</span>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{category.name}</h3>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
          </div>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full
            bg-gray-200 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 px-1.5">
            {projects.length}
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(category)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-blue-500">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(category.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Projects list */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            style={{ overflow: expanded ? 'visible' : 'hidden' }}>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50 px-2 py-1 rounded-b-xl overflow-visible">
              {projects.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">
                  No projects in this category yet
                </p>
              ) : projects.map(p => (
                <ProjectCard key={p.id} project={p} canManage={canManage} categories={allCategories} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Projects Page ────────────────────────────────────────────────────────
export default function Projects() {
  const { user } = useSelector(s => s.auth)
  const queryClient = useQueryClient()
  const canManage = isPrivileged(user)

  const [showCreateProject,  setShowCreateProject]  = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [editingCategory,    setEditingCategory]    = useState(null)
  const [search,             setSearch]             = useState('')
  const [viewMode,           setViewMode]           = useState('grouped') // 'grouped' | 'flat'

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
  })

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectService.getAllProjects({ search, size: 200 }),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => { toast.success('Category deleted'); queryClient.invalidateQueries(['categories']); queryClient.invalidateQueries(['projects']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const allProjects = projectsData?.content || []
  const filtered = search
    ? allProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.keyPrefix.toLowerCase().includes(search.toLowerCase()))
    : allProjects

  // Group projects by category
  const categorized = categoriesRaw.reduce((acc, cat) => {
    acc[cat.id] = { category: cat, projects: filtered.filter(p => p.categoryId === cat.id) }
    return acc
  }, {})
  const uncategorized = filtered.filter(p => !p.categoryId)

  const totalProjects = allProjects.length

  return (
    <div className="space-y-5">
      {showCreateProject  && <CreateProjectModal categories={categoriesRaw} onClose={() => setShowCreateProject(false)} />}
      {showCreateCategory && <CategoryModal onClose={() => { setShowCreateCategory(false) }} />}
      {editingCategory    && <CategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalProjects} projects · {categoriesRaw.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'grouped' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}>
              Grouped
            </button>
            <button onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 dark:border-gray-700 transition-colors ${
                viewMode === 'flat' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}>
              All
            </button>
          </div>
          {canManage && (
            <>
              <button onClick={() => setShowCreateCategory(true)} className="btn-secondary text-sm">
                <Folder className="h-4 w-4" /> New Category
              </button>
              <button onClick={() => setShowCreateProject(true)} className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> New Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}
        </div>
      ) : viewMode === 'grouped' ? (
        /* ── Grouped view ── */
        <div className="space-y-3">
          {/* Categories */}
          {Object.values(categorized).map(({ category, projects }) => (
            <CategoryGroup
              key={category.id}
              category={category}
              projects={projects}
              canManage={canManage}
              allCategories={categoriesRaw}
              onEdit={setEditingCategory}
              onDelete={(id) => window.confirm('Delete category? Projects will be uncategorized.') && deleteCategoryMutation.mutate(id)}
            />
          ))}

          {/* Uncategorized */}
          {(uncategorized.length > 0 || categoriesRaw.length === 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30">
                <Folder className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Uncategorized</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-500 px-1.5">
                  {uncategorized.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50 px-2 py-1">
                {uncategorized.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">All projects are categorized</p>
                ) : uncategorized.map(p => (
                  <ProjectCard key={p.id} project={p} canManage={canManage} categories={categoriesRaw} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty */}
          {categoriesRaw.length === 0 && uncategorized.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
              <FolderKanban className="h-12 w-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No projects yet</p>
              {canManage && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowCreateCategory(true)} className="btn-secondary">
                    <Folder className="h-4 w-4" /> New Category
                  </button>
                  <button onClick={() => setShowCreateProject(true)} className="btn-primary">
                    <Plus className="h-4 w-4" /> New Project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Flat view (card grid) ── */
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16">
            <FolderKanban className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project, i) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/projects/${project.id}`}
                  className="block card p-4 hover:shadow-card-hover transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700 text-xs font-bold dark:bg-primary-900/30 dark:text-primary-400">
                      {project.keyPrefix}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{project.name}</p>
                      {project.categoryName && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span>{project.categoryIcon}</span> {project.categoryName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />{project.totalTickets}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project.memberCount}</span>
                    <span className={cn('ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium',
                      project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {project.status}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
