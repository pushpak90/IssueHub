import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search, UserCheck, UserX, ChevronLeft, ChevronRight,
  Settings, X, Shield, Users as UsersIcon, CheckCircle2
} from 'lucide-react'
import { userService } from '../services/userService'
import { adminService } from '../services/adminService'
import api from '../services/api'
import { getInitials, formatDate, timeAgo } from '../utils/helpers'
import toast from 'react-hot-toast'

const ROLE_STYLES = {
  ROLE_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ROLE_MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ROLE_DEVELOPER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ROLE_TESTER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const formatRoleLabel = (roleName) => {
  if (!roleName) return 'Role'
  return roleName
    .replace(/^ROLE_/, '')
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const normalizeRole = (role) => ({
  value: role.name,
  label: role.label || formatRoleLabel(role.name),
  desc: role.description || 'Custom role',
  color: ROLE_STYLES[role.name] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
})

function RoleBadge({ role, roles = [] }) {
  const config = roles.find(r => r.value === role) || {
    label: formatRoleLabel(role),
    color: ROLE_STYLES[role] || 'bg-gray-100 text-gray-600',
  }
  return <span className={`badge text-xs ${config.color}`}>{config.label}</span>
}

// ── Manage User Modal ────────────────────────────────────────────────────────
function ManageUserModal({ user, roles, rolesLoading, onClose }) {
  const queryClient = useQueryClient()

  // All teams to show team assignment
  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data.data),
  })

  const currentRole = user.roles?.[0] || 'ROLE_DEVELOPER'
  const [selectedRole, setSelectedRole] = useState(currentRole)

  const roleMutation = useMutation({
    mutationFn: (role) => api.patch(`/users/${user.id}/role`, { role }).then(r => r.data),
    onSuccess: () => { toast.success('Role updated!'); queryClient.invalidateQueries(['users']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update role'),
  })

  const addToTeamMutation = useMutation({
    mutationFn: (teamId) => api.post(`/teams/${teamId}/members/${user.id}`).then(r => r.data),
    onSuccess: () => { toast.success('Added to team!'); queryClient.invalidateQueries(['teams']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add to team'),
  })

  const removeFromTeamMutation = useMutation({
    mutationFn: (teamId) => api.delete(`/teams/${teamId}/members/${user.id}`).then(r => r.data),
    onSuccess: () => { toast.success('Removed from team'); queryClient.invalidateQueries(['teams']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to remove from team'),
  })

  const userTeamIds = new Set(
    allTeams.filter(t => t.members?.some(m => m.id === user.id)).map(t => t.id)
  )

  const handleSaveRole = () => {
    if (selectedRole !== currentRole) {
      roleMutation.mutate(selectedRole)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold dark:bg-primary-900/30 dark:text-primary-400">
              {getInitials(user.fullName || user.username)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Role Management ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assign Role</h3>
            </div>
            {rolesLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No roles available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {roles.map(role => (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      selectedRole === role.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selectedRole === role.value ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                    }`}>
                      {selectedRole === role.value && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${selectedRole === role.value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {role.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{role.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedRole !== currentRole && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2.5">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Changing role from <strong>{currentRole.replace('ROLE_', '')}</strong> → <strong>{selectedRole.replace('ROLE_', '')}</strong>
                </p>
                <button onClick={handleSaveRole} disabled={roleMutation.isPending}
                  className="btn-primary text-xs px-3 py-1.5 h-auto ml-3">
                  {roleMutation.isPending ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            )}
            {selectedRole === currentRole && (
              <p className="text-xs text-gray-400 mt-2 text-center">Current role is already selected</p>
            )}
          </div>

          {/* ── Team Assignment ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UsersIcon className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Team Assignment</h3>
            </div>

            {allTeams.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No teams created yet</p>
            ) : (
              <div className="space-y-2">
                {allTeams.map(team => {
                  const isMember = userTeamIds.has(team.id)
                  return (
                    <div key={team.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-2 w-2 rounded-full ${isMember ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                          <p className="text-xs text-gray-500">
                            {team.projectName} · {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => isMember
                          ? removeFromTeamMutation.mutate(team.id)
                          : addToTeamMutation.mutate(team.id)
                        }
                        disabled={addToTeamMutation.isPending || removeFromTeamMutation.isPending}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          isMember
                            ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                            : 'text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                        }`}
                      >
                        {isMember ? 'Remove' : 'Add to Team'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Users Page ──────────────────────────────────────────────────────────
export default function Users() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [managingUser, setManagingUser] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => userService.getAllUsers({ page, size: 15, search }),
  })

  const { data: rolesData = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminService.getRoles,
  })

  const toggleMutation = useMutation({
    mutationFn: userService.toggleUserStatus,
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries(['users']) },
  })

  const users = data?.content || []
  const roles = rolesData.map(normalizeRole)

  return (
    <div className="space-y-4">
      {managingUser && (
        <ManageUserModal
          user={managingUser}
          roles={roles}
          rolesLoading={rolesLoading}
          onClose={() => setManagingUser(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.totalElements || 0} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or username..." className="input pl-9" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              {['User', 'Email', 'Role', 'Teams', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                  </td>
                ))}</tr>
              ))
            ) : users.map(user => (
              <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                {/* User */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
                      {getInitials(user.fullName || user.username)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                      </p>
                      <p className="text-xs text-gray-400">@{user.username}</p>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{user.email}</td>

                {/* Role */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map(r => <RoleBadge key={r} role={r} roles={roles} />)}
                  </div>
                </td>

                {/* Teams - inline from query */}
                <td className="px-4 py-3">
                  <TeamsBadges userId={user.id} />
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Last Login */}
                <td className="px-4 py-3 text-xs text-gray-400">
                  {user.lastLogin ? timeAgo(user.lastLogin) : 'Never'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* Manage role + team */}
                    <button onClick={() => setManagingUser(user)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 transition-colors font-medium">
                      <Settings className="h-3.5 w-3.5" /> Manage
                    </button>
                    {/* Toggle active */}
                    <button onClick={() => toggleMutation.mutate(user.id)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
                        user.active
                          ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20'
                          : 'text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20'
                      }`}>
                      {user.active
                        ? <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                        : <><UserCheck className="h-3.5 w-3.5" /> Activate</>}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
            <span className="text-xs text-gray-500">Page {data.page + 1} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={data.first}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.last}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small inline component to show user's teams ───────────────────────────────
function TeamsBadges({ userId }) {
  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data.data),
    staleTime: 30000,
  })
  const userTeams = allTeams.filter(t => t.members?.some(m => m.id === userId))
  if (userTeams.length === 0) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {userTeams.slice(0, 2).map(t => (
        <span key={t.id} className="badge text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
          {t.name}
        </span>
      ))}
      {userTeams.length > 2 && (
        <span className="badge text-[10px] bg-gray-100 text-gray-500">+{userTeams.length - 2}</span>
      )}
    </div>
  )
}
