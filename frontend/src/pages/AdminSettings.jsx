import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Settings, Columns, Users, Save, Plus, Trash2,
  Loader2, CheckCircle2, AlertTriangle, RefreshCw, Info,
  Database, Play, XCircle
} from 'lucide-react'
import { adminService } from '../services/adminService'
import api from '../services/api'
import toast from 'react-hot-toast'

const isAdmin = (user) => user?.roles?.some(r => r === 'ROLE_ADMIN')

const ALL_STATUSES = [
  { id: 'TODO',        label: 'To Do',       color: '#6B7280' },
  { id: 'IN_PROGRESS', label: 'In Progress',  color: '#3B82F6' },
  { id: 'IN_REVIEW',   label: 'In Review',    color: '#8B5CF6' },
  { id: 'TESTING',     label: 'Testing',      color: '#F59E0B' },
  { id: 'DONE',        label: 'Done',         color: '#10B981' },
  { id: 'CLOSED',      label: 'Closed',       color: '#6B7280' },
  { id: 'ON_HOLD',     label: 'On Hold',      color: '#F97316' },
  { id: 'CANCELLED',   label: 'Cancelled',    color: '#EF4444' },
]

const ROLE_COLORS = {
  ROLE_ADMIN:     'bg-red-100 text-red-700 border-red-200',
  ROLE_MANAGER:   'bg-purple-100 text-purple-700 border-purple-200',
  ROLE_DEVELOPER: 'bg-blue-100 text-blue-700 border-blue-200',
  ROLE_TESTER:    'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const SYSTEM_ROLES = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEVELOPER', 'ROLE_TESTER']

// ── System Settings Tab ───────────────────────────────────────────────────────
function SystemSettingsTab() {
  const queryClient = useQueryClient()

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminService.getSettings,
  })

  const [draft, setDraft] = useState({})
  const merged = { ...settings, ...draft }

  const saveMutation = useMutation({
    mutationFn: () => adminService.updateSettings(draft),
    onSuccess: () => {
      toast.success('Settings saved!')
      queryClient.invalidateQueries(['admin-settings'])
      setDraft({})
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }))
  const hasChanges = Object.keys(draft).length > 0

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>

  const groups = [
    {
      title: 'Application',
      icon: '🏢',
      fields: [
        { key: 'app.name',        label: 'App Name',        type: 'text',   placeholder: 'Ticket Portal' },
        { key: 'app.description', label: 'App Description', type: 'text',   placeholder: 'Modern Project Management' },
      ],
    },
    {
      title: 'Ticket Defaults',
      icon: '🎟️',
      fields: [
        { key: 'app.default_priority', label: 'Default Priority', type: 'select',
          options: ['CRITICAL','HIGH','MEDIUM','LOW'] },
        { key: 'app.default_type', label: 'Default Type', type: 'select',
          options: ['BUG','FEATURE','TASK','IMPROVEMENT','EPIC','STORY','TEST','DOCUMENTATION'] },
        { key: 'ticket.max_attachments', label: 'Max Attachments per Ticket', type: 'number' },
        { key: 'ticket.allow_delete', label: 'Allow Ticket Deletion', type: 'toggle' },
      ],
    },
    {
      title: 'Notifications',
      icon: '🔔',
      fields: [
        { key: 'notif.email_enabled',   label: 'Email Notifications',    type: 'toggle' },
        { key: 'notif.mention_enabled', label: '@Mention Notifications', type: 'toggle' },
      ],
    },
  ]

  return (
    <div className="space-y-5 max-w-2xl">
      {groups.map(group => (
        <div key={group.title} className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>{group.icon}</span> {group.title}
          </h3>
          <div className="space-y-3">
            {group.fields.map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{field.key}</p>
                </div>
                <div className="shrink-0">
                  {field.type === 'text' && (
                    <input
                      value={merged[field.key] || ''}
                      onChange={e => set(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input text-sm h-8 w-56"
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={merged[field.key] || ''}
                      onChange={e => set(field.key, e.target.value)}
                      className="input text-sm h-8 w-24"
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      value={merged[field.key] || ''}
                      onChange={e => set(field.key, e.target.value)}
                      className="input text-sm h-8 w-44"
                    >
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {field.type === 'toggle' && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={merged[field.key] === 'true'}
                        onChange={e => set(field.key, e.target.checked ? 'true' : 'false')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer
                        peer-checked:bg-primary-600
                        after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                        after:bg-white after:rounded-full after:h-5 after:w-5
                        after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center justify-between">
        {hasChanges ? (
          <p className="text-xs text-yellow-600 flex items-center gap-1">
            <Info className="h-3.5 w-3.5" /> {Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> All settings are saved
          </p>
        )}
        <div className="flex gap-2">
          {hasChanges && (
            <button onClick={() => setDraft({})} className="btn-secondary text-sm">
              <RefreshCw className="h-4 w-4" /> Discard
            </button>
          )}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saveMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <><Save className="h-4 w-4" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Board Configuration Tab ───────────────────────────────────────────────────
function BoardConfigTab() {
  const queryClient = useQueryClient()

  const { data: settings = {} } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminService.getSettings,
  })

  const savedColumns = (settings['board.columns'] || 'TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE')
    .split(',').map(s => s.trim()).filter(Boolean)

  const [selected, setSelected] = useState(savedColumns)

  const saveMutation = useMutation({
    mutationFn: () => adminService.updateSettings({ 'board.columns': selected.join(',') }),
    onSuccess: () => {
      toast.success('Board configuration saved!')
      queryClient.invalidateQueries(['admin-settings'])
    },
  })

  const toggle = (statusId) => {
    setSelected(prev =>
      prev.includes(statusId)
        ? prev.filter(s => s !== statusId)
        : [...prev, statusId]
    )
  }

  const moveUp   = (idx) => { if (idx === 0) return; const a = [...selected]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; setSelected(a) }
  const moveDown = (idx) => { if (idx === selected.length-1) return; const a = [...selected]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; setSelected(a) }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Columns className="h-4 w-4 text-primary-600" /> Kanban Board Columns
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Choose which ticket statuses appear as columns on the Kanban board. Drag to reorder.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {ALL_STATUSES.map(status => {
            const isActive = selected.includes(status.id)
            const order = selected.indexOf(status.id)
            return (
              <div
                key={status.id}
                className={`flex items-center justify-between rounded-xl border-2 p-3 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                }`}
                onClick={() => toggle(status.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{status.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isActive && (
                    <span className="text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
                      #{order + 1}
                    </span>
                  )}
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                  }`}>
                    {isActive && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Column order */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Column Order</h3>
        <div className="space-y-2">
          {selected.map((statusId, idx) => {
            const s = ALL_STATUSES.find(x => x.id === statusId)
            if (!s) return null
            return (
              <div key={statusId} className="flex items-center justify-between rounded-xl
                border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-400 w-5 text-center">{idx + 1}</span>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">
                    ↑
                  </button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs">
                    ↓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {selected.length === 0 && (
          <p className="text-sm text-orange-500 flex items-center gap-2 mt-2">
            <AlertTriangle className="h-4 w-4" /> Select at least one column above
          </p>
        )}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={selected.length === 0 || saveMutation.isPending}
        className="btn-primary disabled:opacity-50"
      >
        {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Board Config</>}
      </button>
    </div>
  )
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────
function RolesTab() {
  const queryClient = useQueryClient()
  const [newRole, setNewRole] = useState('')
  const [showNew, setShowNew] = useState(false)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminService.getRoles,
  })

  const createMutation = useMutation({
    mutationFn: () => adminService.createRole(newRole),
    onSuccess: () => {
      toast.success('Role created!')
      queryClient.invalidateQueries(['admin-roles'])
      setNewRole('')
      setShowNew(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteRole,
    onSuccess: () => { toast.success('Role deleted'); queryClient.invalidateQueries(['admin-roles']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot delete system role'),
  })

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-600" /> System Roles
          </h3>
          <button onClick={() => setShowNew(true)} className="btn-primary text-xs px-3 h-7">
            <Plus className="h-3.5 w-3.5" /> Add Role
          </button>
        </div>

        {/* New role input */}
        {showNew && (
          <div className="flex items-center gap-2 px-5 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
            <span className="text-sm text-gray-500 font-mono shrink-0">ROLE_</span>
            <input
              autoFocus
              value={newRole}
              onChange={e => setNewRole(e.target.value.toUpperCase().replace(/\W/g,''))}
              placeholder="CUSTOM_ROLE_NAME"
              className="input text-sm h-8 flex-1"
              onKeyDown={e => { if (e.key === 'Enter' && newRole.trim()) createMutation.mutate() }}
            />
            <button onClick={() => createMutation.mutate()}
              disabled={!newRole.trim() || createMutation.isPending}
              className="btn-primary text-xs px-3 h-8 disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => { setShowNew(false); setNewRole('') }} className="btn-secondary text-xs px-3 h-8">Cancel</button>
          </div>
        )}

        {/* Role list */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {roles.map(role => {
            const isSystem = SYSTEM_ROLES.includes(role.name)
            const colorClass = ROLE_COLORS[role.name] || 'bg-gray-100 text-gray-700 border-gray-200'
            return (
              <div key={role.id}
                className="flex items-start justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-start gap-3">
                  <span className={`badge text-xs border font-semibold ${colorClass} mt-0.5`}>
                    {role.label}
                  </span>
                  <div>
                    <p className="text-xs text-gray-500 font-mono">{role.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{role.userCount}</p>
                    <p className="text-[10px] text-gray-400">users</p>
                  </div>
                  {!isSystem && (
                    <button
                      onClick={() => deleteMutation.mutate(role.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg
                        text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isSystem && (
                    <span className="text-[10px] text-gray-400 italic">system</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 px-4 py-3">
        <p className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          System roles (Admin, Manager, Developer, Tester) cannot be deleted.
          Custom roles can be assigned to users from the <strong>Users</strong> page.
        </p>
      </div>
    </div>
  )
}

// ── DB Patches Tab ────────────────────────────────────────────────────────────
function DbPatchesTab() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', sqlContent: '' })

  const { data: patches = [], isLoading } = useQuery({
    queryKey: ['db-patches'],
    queryFn: () => api.get('/admin/db-patches').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/db-patches', form).then(r => r.data),
    onSuccess: () => {
      toast.success('Patch created!')
      queryClient.invalidateQueries(['db-patches'])
      setForm({ name: '', description: '', sqlContent: '' })
      setShowCreate(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const executeMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/db-patches/${id}/execute`).then(r => r.data),
    onSuccess: (data) => {
      const status = data.data?.status
      if (status === 'APPLIED') toast.success('Patch applied successfully!')
      else toast.error('Patch failed — check execution result')
      queryClient.invalidateQueries(['db-patches'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Execution failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/db-patches/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Patch deleted'); queryClient.invalidateQueries(['db-patches']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot delete'),
  })

  const STATUS_CONFIG = {
    PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
    APPLIED: { label: 'Applied', className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
    FAILED:  { label: 'Failed',  className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <p className="text-xs text-red-700 dark:text-red-400">
          <strong>Danger Zone.</strong> SQL patches execute directly on the production database.
          Always back up your data before running structural changes (ALTER TABLE, DROP, stored procedures).
          Invalid SQL will be marked as FAILED without rolling back.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="h-4 w-4 text-primary-600" /> Database Patches
          <span className="text-xs font-normal text-gray-400">({patches.length} total)</span>
        </h3>
        <button onClick={() => setShowCreate(s => !s)} className="btn-primary text-sm">
          {showCreate ? 'Cancel' : <><Plus className="h-4 w-4" /> New Patch</>}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create Patch</h4>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Patch Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="e.g. add_sprint_index, create_audit_table" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input" placeholder="What does this patch do?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              SQL Content * <span className="font-normal text-gray-400">(multiple statements separated by semicolons)</span>
            </label>
            <textarea
              value={form.sqlContent}
              onChange={e => setForm(f => ({ ...f, sqlContent: e.target.value }))}
              className="input min-h-[160px] resize-y font-mono text-xs"
              placeholder={`-- Example:\nCREATE INDEX idx_tickets_status ON tickets(status);\n\nALTER TABLE tickets ADD COLUMN story_points INT DEFAULT NULL;\n\nCREATE PROCEDURE update_ticket_stats() BEGIN ... END;`}
              spellCheck={false}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || !form.sqlContent.trim() || createMutation.isPending}
              className="btn-primary flex-1 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Save Patch'}
            </button>
          </div>
        </div>
      )}

      {/* Patches list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : patches.length === 0 ? (
        <div className="card p-10 text-center">
          <Database className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No patches created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patches.map(patch => {
            const cfg = STATUS_CONFIG[patch.status] || STATUS_CONFIG.PENDING
            return (
              <div key={patch.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{patch.name}</span>
                      <span className={`badge text-xs ${cfg.className}`}>{cfg.label}</span>
                    </div>
                    {patch.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{patch.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      By {patch.createdBy}
                      {patch.appliedAt && ` · Applied ${new Date(patch.appliedAt).toLocaleDateString('en-IN')}`}
                      {patch.appliedBy && ` by ${patch.appliedBy}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {patch.status === 'PENDING' && (
                      <button onClick={() => executeMutation.mutate(patch.id)}
                        disabled={executeMutation.isPending}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 font-medium transition-colors disabled:opacity-50">
                        {executeMutation.isPending && executeMutation.variables === patch.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Play className="h-3.5 w-3.5" />}
                        Execute
                      </button>
                    )}
                    {patch.status === 'FAILED' && (
                      <button onClick={() => executeMutation.mutate(patch.id)}
                        disabled={executeMutation.isPending}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 font-medium transition-colors">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </button>
                    )}
                    {patch.status !== 'APPLIED' && (
                      <button onClick={() => window.confirm(`Delete "${patch.name}"?`) && deleteMutation.mutate(patch.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SQL preview */}
                <div className="rounded-lg bg-gray-900 dark:bg-gray-950 px-4 py-3 mt-2 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                    {patch.sqlContent.slice(0, 400)}{patch.sqlContent.length > 400 ? '\n...' : ''}
                  </pre>
                </div>

                {/* Execution result */}
                {patch.executionResult && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap ${
                    patch.status === 'APPLIED'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400'
                  }`}>
                    {patch.executionResult}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Admin Settings Page ──────────────────────────────────────────────────
const TABS = [
  { id: 'system',  label: 'System Settings', icon: Settings  },
  { id: 'board',   label: 'Board Config',    icon: Columns   },
  { id: 'roles',   label: 'Roles',           icon: Shield    },
  { id: 'patches', label: 'DB Patches',      icon: Database  },
]

export default function AdminSettings() {
  const { user } = useSelector(s => s.auth)
  const [activeTab, setActiveTab] = useState('system')

  if (!isAdmin(user)) return <Navigate to="/dashboard" replace />

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminService.getOverview,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
          <span className="badge text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ml-1">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Configure global application settings, board layouts, and role management
        </p>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Users',   value: overview.totalUsers,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Active Users',  value: overview.activeUsers,   color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'Total Roles',   value: overview.totalRoles,    color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Config Keys',   value: overview.settingsCount, color: 'text-gray-600',   bg: 'bg-gray-50'   },
          ].map(s => (
            <motion.div key={s.label} whileHover={{ y: -1 }}
              className={`card p-4 ${s.bg} dark:bg-opacity-10`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'system'  && <SystemSettingsTab />}
        {activeTab === 'board'   && <BoardConfigTab />}
        {activeTab === 'roles'   && <RolesTab />}
        {activeTab === 'patches' && <DbPatchesTab />}
      </motion.div>
    </div>
  )
}
