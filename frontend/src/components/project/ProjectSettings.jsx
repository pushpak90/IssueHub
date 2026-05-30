import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import {
  Settings, Users, Tag, Save, Trash2, Plus, X,
  UserPlus, Search, Archive, AlertTriangle, Loader2,
  CheckCircle2, Crown
} from 'lucide-react'
import { projectService } from '../../services/projectService'
import { userService } from '../../services/userService'
import { categoryService } from '../../services/categoryService'
import { getInitials, isAdmin } from '../../utils/helpers'
import toast from 'react-hot-toast'
import api from '../../services/api'

const TABS = [
  { id: 'general', label: 'General',  icon: Settings },
  { id: 'members', label: 'Members',  icon: Users   },
  { id: 'labels',  label: 'Labels',   icon: Tag     },
]

// ── Tab: General Settings ────────────────────────────────────────────────────
function GeneralTab({ project, onArchive }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      name:        project.name,
      description: project.description || '',
      categoryId:  project.categoryId  || '',
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
  })

  const saveMutation = useMutation({
    mutationFn: (data) => projectService.updateProject(project.id, {
      ...data,
      // Send 0 to explicitly remove category, or the selected id
      categoryId: data.categoryId ? Number(data.categoryId) : 0,
    }),
    onSuccess: () => {
      toast.success('Project updated!')
      queryClient.invalidateQueries(['project', String(project.id)])
      queryClient.invalidateQueries(['projects'])
      queryClient.invalidateQueries(['categories'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Project Details</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project Name *
          </label>
          <input {...register('name', { required: true })} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Key Prefix
          </label>
          <input
            value={project.keyPrefix}
            disabled
            className="input bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Key cannot be changed after creation</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            className="input min-h-[100px] resize-none"
            placeholder="Describe what this project is about..."
          />
        </div>

        {/* Category assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select {...register('categoryId')} className="input">
            <option value="">— Uncategorized —</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          {project.categoryName && (
            <p className="text-xs text-gray-400 mt-1">
              Currently in: <span className="font-medium">{project.categoryIcon} {project.categoryName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className={`badge text-xs ${
              project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              project.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' :
              'bg-yellow-100 text-yellow-700'
            }`}>{project.status}</span>
            <span className="text-xs text-gray-400">
              Owner: {project.owner?.firstName
                ? `${project.owner.firstName} ${project.owner.lastName}`
                : project.owner?.username}
            </span>
          </div>
          <button
            type="submit"
            disabled={!isDirty || saveMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {saveMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <><Save className="h-4 w-4" /> Save Changes</>
            }
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="card p-5 border-red-200 dark:border-red-900/40">
        <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Archive this project</p>
            <p className="text-xs text-gray-500">Archived projects are hidden from active lists</p>
          </div>
          <button
            onClick={onArchive}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-red-300
              text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400
              dark:hover:bg-red-900/20 transition-colors"
          >
            <Archive className="h-4 w-4" /> Archive
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Members Management ───────────────────────────────────────────────────
function MembersTab({ project }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [addSearch, setAddSearch] = useState('')

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
  })

  // Re-fetch the latest project data to get updated member list
  const { data: freshProject } = useQuery({
    queryKey: ['project', String(project.id)],
    queryFn: () => projectService.getProject(project.id),
  })
  const members = freshProject?.members || project.members || []
  const memberIds = new Set(members.map(m => m.id))

  // Users not yet in the project
  const addCandidates = allUsers
    .filter(u => !memberIds.has(u.id))
    .filter(u => {
      if (!addSearch) return true
      const q = addSearch.toLowerCase()
      return (
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q)
      )
    })

  // Filter displayed members
  const displayedMembers = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.username?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.firstName?.toLowerCase().includes(q) ||
      m.lastName?.toLowerCase().includes(q)
    )
  })

  const addMutation = useMutation({
    mutationFn: (uid) => projectService.addMember(project.id, uid),
    onSuccess: () => {
      toast.success('Member added!')
      queryClient.invalidateQueries(['project', String(project.id)])
      setAddSearch('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add member'),
  })

  const removeMutation = useMutation({
    mutationFn: (uid) => projectService.removeMember(project.id, uid),
    onSuccess: () => {
      toast.success('Member removed')
      queryClient.invalidateQueries(['project', String(project.id)])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot remove this member'),
  })

  return (
    <div className="max-w-2xl space-y-5">
      {/* Add member */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary-600" /> Add Members
        </h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            placeholder="Search by name, username or email..."
            className="input pl-9"
          />
        </div>

        {addSearch && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            {addCandidates.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                {allUsers.length === members.length
                  ? 'All users are already members'
                  : 'No users match your search'}
              </div>
            ) : addCandidates.map(u => (
              <div key={u.id}
                className="flex items-center justify-between px-4 py-3
                  hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100
                  dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full
                    bg-primary-100 text-primary-700 text-xs font-semibold
                    dark:bg-primary-900/30 dark:text-primary-400">
                    {getInitials(u.fullName || u.username)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
                    </p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => addMutation.mutate(u.id)}
                  disabled={addMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                    bg-primary-50 text-primary-700 hover:bg-primary-100
                    dark:bg-primary-900/20 dark:text-primary-400 font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current members list */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            Project Members
            <span className="text-xs text-gray-400 font-normal">({members.length})</span>
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter members..."
              className="input pl-8 text-sm h-8 w-44"
            />
          </div>
        </div>

        <div className="space-y-2">
          {displayedMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No members found</p>
          ) : displayedMembers.map(m => (
            <div key={m.id}
              className="flex items-center justify-between rounded-xl border
                border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full
                  bg-primary-100 text-primary-700 text-sm font-semibold
                  dark:bg-primary-900/30 dark:text-primary-400">
                  {getInitials(m.fullName || m.username)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.firstName ? `${m.firstName} ${m.lastName}` : m.username}
                    </p>
                    {m.id === (freshProject?.owner?.id || project.owner?.id) && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5
                        rounded-full bg-yellow-50 text-yellow-600
                        dark:bg-yellow-900/20 dark:text-yellow-400 font-medium">
                        <Crown className="h-2.5 w-2.5" /> Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Role badge */}
                <div className="flex gap-1">
                  {m.roles?.slice(0, 1).map(r => (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded-full
                      bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
                {/* Remove (not for owner) */}
                {m.id !== (freshProject?.owner?.id || project.owner?.id) && (
                  <button
                    onClick={() => removeMutation.mutate(m.id)}
                    disabled={removeMutation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-lg
                      text-gray-300 hover:bg-red-50 hover:text-red-500
                      dark:hover:bg-red-900/20 transition-colors"
                    title="Remove from project"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Labels Management ────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#EF4444','#F97316','#F59E0B','#10B981','#3B82F6',
  '#8B5CF6','#EC4899','#6B7280','#14B8A6','#84CC16',
]

function LabelsTab({ project }) {
  const queryClient = useQueryClient()
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3B82F6' })
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState({})

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ['labels', project.id],
    queryFn: () => projectService.getProjectLabels(project.id),
  })

  const createMutation = useMutation({
    mutationFn: () => projectService.createLabel(project.id, { name: newLabel.name, color: newLabel.color }),
    onSuccess: () => {
      toast.success('Label created!')
      queryClient.invalidateQueries(['labels', project.id])
      setNewLabel({ name: '', color: '#3B82F6' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create label'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/labels/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Label deleted'); queryClient.invalidateQueries(['labels', project.id]) },
    onError: () => toast.error('Failed to delete label'),
  })

  return (
    <div className="max-w-xl space-y-5">
      {/* Create new label */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary-600" /> Create Label
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Label Name *
            </label>
            <input
              value={newLabel.name}
              onChange={e => setNewLabel(v => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Bug, Feature, Urgent..."
              className="input"
              onKeyDown={e => {
                if (e.key === 'Enter' && newLabel.name.trim()) createMutation.mutate()
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newLabel.color}
                onChange={e => setNewLabel(v => ({ ...v, color: e.target.value }))}
                className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <button
                onClick={() => newLabel.name.trim() && createMutation.mutate()}
                disabled={!newLabel.name.trim() || createMutation.isPending}
                className="btn-primary disabled:opacity-50 h-9"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Color presets */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewLabel(v => ({ ...v, color: c }))}
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                newLabel.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Existing labels */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary-600" />
          Project Labels
          <span className="text-xs text-gray-400 font-normal">({labels.length})</span>
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : labels.length === 0 ? (
          <div className="py-8 text-center">
            <Tag className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No labels yet</p>
            <p className="text-xs text-gray-300">Create labels above to categorize tickets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.map(label => (
              <div key={label.id}
                className="flex items-center justify-between rounded-xl border
                  border-gray-100 dark:border-gray-800 px-4 py-2.5
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: label.color }} />
                  <span
                    className="badge text-xs font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(label.id)}
                  disabled={deleteMutation.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg
                    text-gray-300 hover:bg-red-50 hover:text-red-500
                    dark:hover:bg-red-900/20 transition-colors"
                  title="Delete label"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ProjectSettings component ───────────────────────────────────────────
export default function ProjectSettings({ project, onArchive }) {
  const [activeTab, setActiveTab] = useState('general')
  const { user } = useSelector(s => s.auth)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && <GeneralTab project={project} onArchive={onArchive} />}
      {activeTab === 'members' && <MembersTab project={project} />}
      {activeTab === 'labels'  && <LabelsTab  project={project} />}
    </motion.div>
  )
}
