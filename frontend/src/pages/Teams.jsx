import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Plus, Users, Trash2, UserPlus, X, Crown, Lock, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import api from '../services/api'
import { projectService } from '../services/projectService'
import { userService } from '../services/userService'
import { getInitials } from '../utils/helpers'
import toast from 'react-hot-toast'

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

// ── Create Team Modal (Admin / Manager only) ─────────────────────────────────
function CreateTeamModal({ onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getAllProjects({ size: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (data) => api.post('/teams', data).then(r => r.data),
    onSuccess: () => { toast.success('Team created!'); queryClient.invalidateQueries(['teams']); onClose() },
    onError: () => toast.error('Failed to create team'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Sanjay R" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
            <select {...register('projectId', { required: true, valueAsNumber: true })} className="input">
              <option value="">Select project</option>
              {projects?.content?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('description')} className="input resize-none min-h-[80px]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Manage Members Modal (Admin / Manager only) ───────────────────────────────
function ManageMembersModal({ team, onClose }) {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
  })

  const addMutation = useMutation({
    mutationFn: (userId) => api.post(`/teams/${team.id}/members/${userId}`).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Member added!')
      queryClient.setQueryData(['teams'], old =>
        Array.isArray(old) ? old.map(t => t.id === team.id ? data.data : t) : old
      )
      queryClient.invalidateQueries(['teams'])
      setSelectedUserId('')
    },
    onError: () => toast.error('Failed to add member'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId) => api.delete(`/teams/${team.id}/members/${userId}`).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Member removed')
      queryClient.invalidateQueries(['teams'])
    },
    onError: () => toast.error('Failed to remove member'),
  })

  // Refresh team data from query cache
  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data.data) })
  const freshTeam = teams.find(t => t.id === team.id) || team
  const memberIds = new Set(freshTeam.members?.map(m => m.id) || [])
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Members</h2>
            <p className="text-sm text-gray-500">{freshTeam.name} · {freshTeam.projectName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add member */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Member
            </label>
            <div className="flex gap-2">
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                className="input flex-1 text-sm">
                <option value="">Select a user to add...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName ? `${u.firstName} ${u.lastName}` : u.username} — {u.email}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedUserId && addMutation.mutate(Number(selectedUserId))}
                disabled={!selectedUserId || addMutation.isPending}
                className="btn-primary px-4 shrink-0 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" /> Add
              </button>
            </div>
            {availableUsers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">All users are already in this team.</p>
            )}
          </div>

          {/* Current members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Members ({freshTeam.members?.length || 0})
            </label>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {!freshTeam.members?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No members yet. Add someone above.
                </p>
              ) : freshTeam.members.map(member => (
                <div key={member.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                      {getInitials(member.fullName || member.username)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.firstName ? `${member.firstName} ${member.lastName}` : member.username}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {freshTeam.lead?.id === member.id && (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                        <Crown className="h-3 w-3" /> Lead
                      </span>
                    )}
                    <button
                      onClick={() => removeMutation.mutate(member.id)}
                      disabled={removeMutation.isPending}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-900/20"
                      title="Remove member"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button onClick={onClose} className="btn-secondary w-full">Done</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── View Members Modal (Developer / Tester — read-only) ───────────────────────
function ViewMembersModal({ team, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
            <p className="text-sm text-gray-500">{team.name} · {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 mb-4">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Read-only — only Admins and Managers can add or remove members.</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {!team.members?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No members in this team yet.</p>
            ) : team.members.map(member => (
              <div key={member.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                  {getInitials(member.fullName || member.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.firstName ? `${member.firstName} ${member.lastName}` : member.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                {team.lead?.id === member.id && (
                  <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                    <Crown className="h-3 w-3" /> Lead
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({ team, index, canManage }) {
  const queryClient = useQueryClient()
  const [showManage, setShowManage] = useState(false)
  const [showView, setShowView] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/teams/${team.id}`),
    onSuccess: () => { toast.success('Team deleted'); queryClient.invalidateQueries(['teams']) },
    onError: () => toast.error('Only Admins/Managers can delete teams'),
  })

  return (
    <>
      {showManage && canManage && <ManageMembersModal team={team} onClose={() => setShowManage(false)} />}
      {showView && !canManage && <ViewMembersModal team={team} onClose={() => setShowView(false)} />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="card p-5 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
              <p className="text-xs text-gray-500">{team.projectName || 'No project'}</p>
            </div>
          </div>
          {/* Delete only for admin/manager */}
          {canManage && (
            <button onClick={() => deleteMutation.mutate()}
              className="text-gray-300 hover:text-red-500 transition-colors" title="Delete team">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {team.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{team.description}</p>
        )}

        {/* Member avatars */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {team.members?.slice(0, 5).map(m => (
              <div key={m.id}
                title={m.firstName ? `${m.firstName} ${m.lastName}` : m.username}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold border-2 border-white dark:border-gray-900 dark:bg-primary-900/30 dark:text-primary-400">
                {getInitials(m.fullName || m.username)}
              </div>
            ))}
            {team.memberCount > 5 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold border-2 border-white dark:border-gray-800">
                +{team.memberCount - 5}
              </div>
            )}
            {team.memberCount === 0 && (
              <span className="text-xs text-gray-400 italic">No members</span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-500">
            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Action button — role-aware */}
        {canManage ? (
          <button onClick={() => setShowManage(true)} className="btn-primary w-full text-xs h-8">
            <UserPlus className="h-3.5 w-3.5" /> Manage Members
          </button>
        ) : (
          <button onClick={() => setShowView(true)} className="btn-secondary w-full text-xs h-8">
            <Eye className="h-3.5 w-3.5" /> View Members
          </button>
        )}
      </motion.div>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Teams() {
  const { user } = useSelector(s => s.auth)
  const canManage = isPrivileged(user)
  const [showCreate, setShowCreate] = useState(false)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data.data),
  })

  return (
    <div className="space-y-4">
      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Create button — admin/manager only */}
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Team
          </button>
        )}
      </div>

      {/* Role hint for developers */}
      {!canManage && (
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
          <Lock className="h-4 w-4 shrink-0" />
          You have read-only access to teams. Contact an Admin or Manager to be added to a team.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16">
          <Users className="h-12 w-12 text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No teams yet</p>
          {canManage && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus className="h-4 w-4" /> Create your first team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  )
}
