import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { ArrowLeft, Edit2, Trash2, Clock, User, Calendar, Send, MessageSquare, AtSign, Check, Link2, Timer, Plus, X, Copy, Database, Code2, GitCommit, FileText, Download } from 'lucide-react'
import { ticketService } from '../services/ticketService'
import { userService } from '../services/userService'
import { relationService } from '../services/relationService'
import { timeLogService } from '../services/timeLogService'
import { ticketScriptService } from '../services/ticketScriptService'
import { commitService } from '../services/commitService'
import { getStatusConfig, getPriorityConfig, getTypeConfig, formatDate, timeAgo, getInitials } from '../utils/helpers'
import TicketForm from '../components/tickets/TicketForm'
import MentionTextarea from '../components/common/MentionTextarea'
import CommentText from '../components/common/CommentText'
import toast from 'react-hot-toast'

// ── Tabbed bottom panel (replaces stacked sections) ──────────────────────────
function TicketTabPanel({ ticketId, currentUser, comments, comment, setComment, addCommentMutation }) {
  const [active, setActive] = useState('comments')

  const TABS = [
    { id: 'comments',    label: `Comments`,     icon: '💬', badge: comments.length },
    { id: 'commits',     label: 'Commits',      icon: '🔀' },
    { id: 'attachments', label: 'Attachments',  icon: '📎' },
    { id: 'scripts',     label: 'DB Scripts',   icon: '💾' },
    { id: 'relations',   label: 'Relations',    icon: '🔗' },
    { id: 'timelog',     label: 'Time Log',     icon: '⏱' },
  ]

  return (
    <div className="card overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.id
                ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}>
            <span>{tab.icon}</span>
            {tab.label}
            {tab.badge > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[9px] font-bold px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Comments */}
        {active === 'comments' && (
          <div>
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
              {comments.map(c => <CommentItem key={c.id} comment={c} ticketId={ticketId} />)}
              {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No comments yet</p>}
            </div>
            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex-1">
                <MentionTextarea
                  value={comment}
                  onChange={setComment}
                  placeholder="Add a comment… @mention someone, paste images with Ctrl+V"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <AtSign className="h-3 w-3" /> Mentioned users get a notification
                  </span>
                  <button
                    onClick={() => { if (comment.trim()) { addCommentMutation.mutate(comment); setComment('') } }}
                    disabled={!comment.trim() || addCommentMutation.isPending}
                    className="btn-primary text-xs px-3 py-1.5 h-auto disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {addCommentMutation.isPending ? 'Sending…' : 'Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === 'commits'     && <CommitsViewSection   ticketId={ticketId} currentUser={currentUser} />}
        {active === 'attachments' && <AttachmentsSection   ticketId={ticketId} />}
        {active === 'scripts'     && <TicketScriptsSection ticketId={ticketId} currentUser={currentUser} />}
        {active === 'relations'   && <RelationsSection     ticketId={ticketId} currentUser={currentUser} />}
        {active === 'timelog'     && <TimeLogSection       ticketId={ticketId} currentUser={currentUser} />}
      </div>
    </div>
  )
}

// ── Ticket Relations ──────────────────────────────────────────────────────────
const RELATION_LABELS = {
  BLOCKS:       { label: 'Blocks',        color: 'bg-red-100 text-red-700'    },
  BLOCKED_BY:   { label: 'Blocked by',    color: 'bg-orange-100 text-orange-700' },
  RELATES_TO:   { label: 'Relates to',    color: 'bg-blue-100 text-blue-700'  },
  DUPLICATES:   { label: 'Duplicates',    color: 'bg-yellow-100 text-yellow-700' },
  DUPLICATED_BY:{ label: 'Duplicated by', color: 'bg-gray-100 text-gray-600'  },
}

function RelationsSection({ ticketId }) {
  const queryClient = useQueryClient()
  const [showForm,   setShowForm]   = useState(false)
  const [targetNum,  setTargetNum]  = useState('')
  const [relType,    setRelType]    = useState('RELATES_TO')
  const [searching,  setSearching]  = useState(false)
  const [foundTicket, setFoundTicket] = useState(null)

  const { data: relations = [] } = useQuery({
    queryKey: ['relations', ticketId],
    queryFn: () => relationService.getRelations(ticketId),
    enabled: !!ticketId,
  })

  const addMutation = useMutation({
    mutationFn: () => relationService.addRelation(ticketId, relType, foundTicket.id),
    onSuccess: () => {
      toast.success('Relation added')
      queryClient.invalidateQueries(['relations', ticketId])
      setShowForm(false); setTargetNum(''); setFoundTicket(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const removeMutation = useMutation({
    mutationFn: (relId) => relationService.removeRelation(ticketId, relId),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries(['relations', ticketId]) },
  })

  const searchTicket = async () => {
    if (!targetNum.trim()) return
    setSearching(true)
    try {
      const t = await ticketService.getTicketByNumber(targetNum.trim().toUpperCase())
      setFoundTicket(t)
    } catch { toast.error('Ticket not found'); setFoundTicket(null) }
    finally { setSearching(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-blue-500" /> Relations
          {relations.length > 0 && <span className="text-xs text-gray-400">({relations.length})</span>}
        </h3>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 font-medium transition-colors">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Link Ticket'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Relation Type</label>
              <select value={relType} onChange={e => setRelType(e.target.value)} className="input text-xs h-8">
                {Object.entries(RELATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ticket Number</label>
              <div className="flex gap-1">
                <input value={targetNum} onChange={e => setTargetNum(e.target.value)}
                  placeholder="ODB-1" className="input text-xs h-8 flex-1 font-mono"
                  onKeyDown={e => e.key === 'Enter' && searchTicket()} />
                <button onClick={searchTicket} disabled={searching}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300 transition-colors">
                  {searching ? <div className="h-3 w-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : '🔍'}
                </button>
              </div>
            </div>
          </div>
          {foundTicket && (
            <div className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
              <div>
                <span className="text-xs font-mono font-bold text-primary-600">{foundTicket.ticketNumber}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">{foundTicket.title}</span>
              </div>
              <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}
                className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                {addMutation.isPending ? '...' : 'Link'}
              </button>
            </div>
          )}
        </div>
      )}

      {relations.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-3">No linked tickets</p>
      ) : (
        <div className="space-y-1.5">
          {relations.map(r => {
            const cfg = RELATION_LABELS[r.relationType] || { label: r.relationType, color: 'bg-gray-100 text-gray-600' }
            const status = getStatusConfig(r.otherTicketStatus)
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`badge text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  <Link to={`/tickets/${r.otherTicketId}`} className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 hover:underline shrink-0">
                    {r.otherTicketNumber}
                  </Link>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{r.otherTicketTitle}</span>
                  <span className={`badge text-[10px] shrink-0 ${status.className}`}>{status.label}</span>
                </div>
                <button onClick={() => removeMutation.mutate(r.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Time Log Section ──────────────────────────────────────────────────────────
function TimeLogSection({ ticketId, currentUser }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ hoursSpent: '', description: '', logDate: '' })

  const { data: logData } = useQuery({
    queryKey: ['timelogs', ticketId],
    queryFn: () => timeLogService.getLogs(ticketId),
    enabled: !!ticketId,
  })

  const logs       = logData?.logs || []
  const totalHours = logData?.totalHours || 0

  const addMutation = useMutation({
    mutationFn: () => timeLogService.addLog(ticketId, { ...form, hoursSpent: Number(form.hoursSpent) }),
    onSuccess: () => {
      toast.success('Time logged!')
      queryClient.invalidateQueries(['timelogs', ticketId])
      setForm({ hoursSpent: '', description: '', logDate: '' }); setShowForm(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (logId) => timeLogService.deleteLog(ticketId, logId),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries(['timelogs', ticketId]) },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4 text-teal-500" /> Time Logged
          {totalHours > 0 && (
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
              {totalHours}h total
            </span>
          )}
        </h3>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 font-medium transition-colors">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Log Time'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hours Spent *</label>
              <input type="number" step="0.5" min="0.5"
                value={form.hoursSpent}
                onChange={e => setForm(f => ({ ...f, hoursSpent: e.target.value }))}
                placeholder="e.g. 2.5" className="input text-xs h-8" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={form.logDate}
                onChange={e => setForm(f => ({ ...f, logDate: e.target.value }))}
                className="input text-xs h-8" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">What did you work on?</label>
            <input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description..." className="input text-xs h-8" />
          </div>
          <button onClick={() => form.hoursSpent && addMutation.mutate()}
            disabled={!form.hoursSpent || addMutation.isPending}
            className="btn-primary text-xs h-7 px-3 w-full disabled:opacity-50">
            {addMutation.isPending ? 'Saving...' : '⏱ Log Work'}
          </button>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-3">No time logged yet</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 text-xs font-bold shrink-0">
                  {l.hoursSpent}h
                </span>
                <div className="min-w-0">
                  {l.description && <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{l.description}</p>}
                  <p className="text-[10px] text-gray-400">
                    {l.user} · {l.logDate ? formatDate(l.logDate) : timeAgo(l.createdAt)}
                  </p>
                </div>
              </div>
              {l.userId === currentUser?.id && (
                <button onClick={() => deleteMutation.mutate(l.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Commits Section
function CommitsViewSection({ ticketId, currentUser }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [commitHash, setCommitHash] = useState('')

  const { data: commits = [] } = useQuery({
    queryKey: ['commits', ticketId],
    queryFn: () => commitService.getCommits(ticketId),
    enabled: !!ticketId,
  })

  const addMutation = useMutation({
    mutationFn: () => commitService.addCommit(ticketId, {
      commitHash: commitHash.trim(),
    }),
    onSuccess: () => {
      toast.success('Commit linked')
      queryClient.invalidateQueries(['commits', ticketId])
      queryClient.invalidateQueries(['history', ticketId])
      setCommitHash('')
      setShowForm(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to link commit'),
  })

  const removeMutation = useMutation({
    mutationFn: (cid) => commitService.removeCommit(ticketId, cid),
    onSuccess: () => {
      toast.success('Commit removed')
      queryClient.invalidateQueries(['commits', ticketId])
      queryClient.invalidateQueries(['history', ticketId])
    },
  })

  const handleAdd = () => {
    const hash = commitHash.trim()
    if (!hash) return
    if (commits.some(c => c.commitHash === hash)) {
      toast.error('Commit already linked')
      return
    }
    addMutation.mutate()
  }

  const copy = (hash) => { navigator.clipboard.writeText(hash); toast.success('Copied!') }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
          <GitCommit className="h-4 w-4 text-orange-500" />
          Git Commits
          {commits.length > 0 && <span className="text-xs text-gray-400">({commits.length})</span>}
        </h3>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 font-medium transition-colors">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Add Commit'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
          <label className="block text-xs text-gray-500 mb-1">Commit ID *</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={commitHash}
              onChange={e => setCommitHash(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              placeholder="Paste full commit ID"
              className="input h-9 flex-1 font-mono text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={!commitHash.trim() || addMutation.isPending}
              className="btn-primary h-9 px-4 text-xs disabled:opacity-50 sm:w-32"
            >
              {addMutation.isPending ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {commits.length === 0 ? (
        <div className="text-center py-5">
          <GitCommit className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No commits linked yet</p>
          <p className="text-xs text-gray-300 mt-1">Add commit IDs that belong to this ticket</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commits.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <code className="min-w-0 break-all rounded bg-orange-50 px-2 py-1 font-mono text-xs font-bold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                  {c.commitHash}
                </code>
                <span className="text-[10px] text-gray-400 shrink-0">by {c.addedBy}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => copy(c.commitHash)}
                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors" title="Copy hash">
                  <Copy className="h-3 w-3" />
                </button>
                {c.addedById === currentUser?.id && (
                  <button onClick={() => removeMutation.mutate(c.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Attachments Section ───────────────────────────────────────────────────────
function AttachmentsSection({ ticketId }) {
  const queryClient  = useQueryClient()
  const fileInputRef = useRef(null)
  const [uploading,  setUploading]  = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', ticketId],
    queryFn: () => ticketService.getTicketAttachments(ticketId),
    enabled: !!ticketId,
  })

  const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', '')

  const getIcon = (a) => {
    const n = (a.originalName || a.fileName || a.name || '').toLowerCase()
    if (n.endsWith('.pdf'))                           return '📄'
    if (n.match(/\.(png|jpg|jpeg|gif|webp)$/))        return '🖼️'
    if (n.match(/\.(doc|docx)$/))                     return '📝'
    if (n.match(/\.(xls|xlsx|csv)$/))                 return '📊'
    if (n.match(/\.(sql|sh|py|js|ts|java)$/))         return '💻'
    if (n.match(/\.(zip|rar|tar|gz)$/))               return '🗜️'
    if (n.match(/\.(mp4|mov|avi)$/))                  return '🎬'
    return '📎'
  }

  const fmt = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024)        return bytes + ' B'
    if (bytes < 1024*1024)   return (bytes/1024).toFixed(1) + ' KB'
    return (bytes/(1024*1024)).toFixed(1) + ' MB'
  }

  const upload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    let count = 0
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} exceeds 20MB limit`); continue }
      try { await ticketService.uploadAttachment(ticketId, file); count++ }
      catch { toast.error(`Failed to upload ${file.name}`) }
    }
    if (count > 0) {
      toast.success(`${count} file${count > 1 ? 's' : ''} uploaded`)
      queryClient.invalidateQueries(['attachments', ticketId])
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const deleteAttach = useMutation({
    mutationFn: (id) => import('../services/api').then(m => m.default.delete(`/files/${id}`)),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries(['attachments', ticketId]) },
    onError: () => toast.error('Failed to remove'),
  })

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); upload(Array.from(e.dataTransfer.files)) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-5 ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
        }`}
      >
        {uploading ? (
          <>
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-blue-600 font-medium">Uploading…</p>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-2xl">
              📎
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to upload or drag &amp; drop
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                PDF, Images, Word, Excel, SQL, ZIP — max 20MB each
              </p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.sql,.zip,.rar"
          onChange={e => upload(Array.from(e.target.files))}
        />
      </div>

      {/* Existing files */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {attachments.map(a => {
            const url = `${BASE}/api${a.downloadUrl || `/files/download/${a.fileName}`}`
            return (
              <div key={a.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5 group">
                <span className="text-lg shrink-0">{getIcon(a)}</span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {a.originalName || a.fileName}
                  </p>
                  {a.fileSize && <p className="text-[10px] text-gray-400">{fmt(a.fileSize)}</p>}
                </a>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={url} download target="_blank" rel="noopener noreferrer"
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Download">
                    <Download className="h-3 w-3" />
                  </a>
                  <button onClick={() => deleteAttach.mutate(a.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 text-center">No files attached yet</p>
      )}
    </div>
  )
}

// ── Ticket DB Scripts / Patches ───────────────────────────────────────────────
const SCRIPT_TYPES = [
  { value: 'SQL',       label: '📋 SQL Query'         },
  { value: 'PROCEDURE', label: '⚙️ Stored Procedure'  },
  { value: 'MIGRATION', label: '🔄 Migration Script'  },
  { value: 'OTHER',     label: '📝 Other'             },
]

function TicketScriptsSection({ ticketId, currentUser }) {
  const queryClient = useQueryClient()
  const [showForm,  setShowForm]  = useState(false)
  const [form, setForm] = useState({ title: '', description: '', scriptType: 'SQL', sqlContent: '' })
  const [expanded, setExpanded] = useState(null)   // id of expanded script

  const { data: scripts = [] } = useQuery({
    queryKey: ['scripts', ticketId],
    queryFn: () => ticketScriptService.getScripts(ticketId),
    enabled: !!ticketId,
  })

  const addMutation = useMutation({
    mutationFn: () => ticketScriptService.addScript(ticketId, form),
    onSuccess: () => {
      toast.success('Script added!')
      queryClient.invalidateQueries(['scripts', ticketId])
      setForm({ title: '', description: '', scriptType: 'SQL', sqlContent: '' })
      setShowForm(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (scriptId) => ticketScriptService.deleteScript(ticketId, scriptId),
    onSuccess: () => { toast.success('Removed'); queryClient.invalidateQueries(['scripts', ticketId]) },
  })

  const copySQL = (sql) => {
    navigator.clipboard.writeText(sql)
    toast.success('SQL copied!')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-violet-500" />
          DB Scripts / Patches
          {scripts.length > 0 && (
            <span className="text-xs text-gray-400">({scripts.length})</span>
          )}
        </h3>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 font-medium transition-colors">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Add Script'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title *</label>
              <input value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Add sprint_id column"
                className="input text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={form.scriptType}
                onChange={e => setForm(f => ({ ...f, scriptType: e.target.value }))}
                className="input text-sm h-8">
                {SCRIPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this script do?"
              className="input text-sm h-8" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">SQL / Script Content *</label>
            <textarea
              value={form.sqlContent}
              onChange={e => setForm(f => ({ ...f, sqlContent: e.target.value }))}
              rows={6}
              spellCheck={false}
              className="input w-full text-xs font-mono resize-y min-h-[120px]"
              placeholder={`-- Example:\nALTER TABLE tickets ADD COLUMN sprint_id BIGINT;\nCREATE INDEX idx_sprint ON tickets(sprint_id);\n\n-- Stored procedure:\nCREATE PROCEDURE GetTicketStats(IN proj_id INT) BEGIN ... END;`}
            />
          </div>
          <button
            onClick={() => form.title.trim() && form.sqlContent.trim() && addMutation.mutate()}
            disabled={!form.title.trim() || !form.sqlContent.trim() || addMutation.isPending}
            className="btn-primary text-xs h-8 px-4 w-full disabled:opacity-50"
          >
            {addMutation.isPending ? 'Saving...' : '💾 Save Script to Ticket'}
          </button>
        </div>
      )}

      {/* Scripts list */}
      {scripts.length === 0 ? (
        <div className="text-center py-5">
          <Code2 className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No DB scripts linked yet</p>
          <p className="text-xs text-gray-300 mt-1">Add SQL patches, migrations, or stored procedures you wrote for this ticket</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {scripts.map(script => (
            <div key={script.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Script header */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setExpanded(expanded === script.id ? null : script.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">
                    {SCRIPT_TYPES.find(t => t.value === script.scriptType)?.label.split(' ')[0] || '📝'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{script.title}</span>
                  <span className="badge text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 shrink-0">
                    {script.scriptType}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-gray-400">{script.addedBy} · {script.createdAt ? timeAgo(script.createdAt) : ''}</span>
                  <button onClick={(e) => { e.stopPropagation(); copySQL(script.sqlContent) }}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
                    title="Copy SQL">
                    <Copy className="h-3 w-3" />
                  </button>
                  {script.addedById === currentUser?.id && (
                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(script.id) }}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded SQL */}
              {expanded === script.id && (
                <div>
                  {script.description && (
                    <p className="text-xs text-gray-500 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                      {script.description}
                    </p>
                  )}
                  <div className="bg-gray-900 dark:bg-gray-950">
                    <pre className="text-xs text-green-400 font-mono p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {script.sqlContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline-editable Details sidebar ─────────────────────────────────────────
function DetailsSidebar({ ticket, users, onUpdate }) {
  const [editingField, setEditingField] = useState(null)
  const [draftHours, setDraftHours] = useState('')

  const Field = ({ icon: Icon, label, children, fieldKey }) => (
    <div className={`flex items-start justify-between gap-2 py-2
      border-b border-gray-50 dark:border-gray-800 last:border-0
      ${fieldKey ? 'group cursor-pointer' : ''}`}
      onClick={() => fieldKey && setEditingField(fieldKey)}>
      <span className="text-xs text-gray-500 flex items-center gap-1.5 shrink-0 pt-0.5">
        <Icon className="h-3.5 w-3.5" />{label}
      </span>
      <div className="text-right min-w-0">
        {children}
      </div>
    </div>
  )

  return (
    <div className="card p-4 space-y-0">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Details
        <span className="ml-1 font-normal normal-case text-gray-400">(click to edit)</span>
      </h3>

      {/* Status */}
      <Field icon={Check} label="Status" fieldKey="status">
        {editingField === 'status' ? (
          <select autoFocus defaultValue={ticket.status}
            className="input text-xs h-7 text-right"
            onChange={e => { onUpdate({ status: e.target.value }); setEditingField(null) }}
            onBlur={() => setEditingField(null)}>
            {['TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE','CLOSED','ON_HOLD','CANCELLED'].map(s => (
              <option key={s} value={s}>{getStatusConfig(s).label}</option>
            ))}
          </select>
        ) : (
          <span className={`badge text-xs ${getStatusConfig(ticket.status).className}`}>
            {getStatusConfig(ticket.status).label}
          </span>
        )}
      </Field>

      {/* Priority */}
      <Field icon={ArrowLeft} label="Priority" fieldKey="priority">
        {editingField === 'priority' ? (
          <select autoFocus defaultValue={ticket.priority}
            className="input text-xs h-7"
            onChange={e => { onUpdate({ priority: e.target.value }); setEditingField(null) }}
            onBlur={() => setEditingField(null)}>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => (
              <option key={p} value={p}>{getPriorityConfig(p).label}</option>
            ))}
          </select>
        ) : (
          <span className={`badge text-xs ${getPriorityConfig(ticket.priority).className}`}>
            {getPriorityConfig(ticket.priority).label}
          </span>
        )}
      </Field>

      {/* Assignee */}
      <Field icon={User} label="Assignee" fieldKey="assignee">
        {editingField === 'assignee' ? (
          <select autoFocus
            defaultValue={ticket.assignee?.id || ''}
            className="input text-xs h-7 max-w-[160px]"
            onChange={e => {
              onUpdate({ assigneeId: e.target.value ? Number(e.target.value) : null })
              setEditingField(null)
            }}
            onBlur={() => setEditingField(null)}>
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            {ticket.assignee
              ? (ticket.assignee.firstName
                  ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                  : ticket.assignee.username)
              : <span className="text-gray-400 italic">Unassigned</span>
            }
          </span>
        )}
      </Field>

      {/* Reporter — read only */}
      <Field icon={User} label="Reporter">
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          {ticket.reporter?.firstName
            ? `${ticket.reporter.firstName} ${ticket.reporter.lastName}`
            : ticket.reporter?.username || '—'}
        </span>
      </Field>

      {/* Due Date */}
      <Field icon={Calendar} label="Due Date" fieldKey="dueDate">
        {editingField === 'dueDate' ? (
          <input autoFocus type="date"
            defaultValue={ticket.dueDate || ''}
            className="input text-xs h-7"
            onChange={e => { onUpdate({ dueDate: e.target.value || null }); setEditingField(null) }}
            onBlur={() => setEditingField(null)} />
        ) : (
          <span className={`text-xs font-medium ${ticket.dueDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}`}>
            {ticket.dueDate ? formatDate(ticket.dueDate) : 'No date'}
          </span>
        )}
      </Field>

      {/* Est. Hours */}
      <Field icon={Clock} label="Est. Hours" fieldKey="estHours">
        {editingField === 'estHours' ? (
          <input autoFocus type="number" min="0"
            defaultValue={ticket.estimatedHours || ''}
            className="input text-xs h-7 w-20"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onUpdate({ estimatedHours: Number(e.target.value) || null })
                setEditingField(null)
              } else if (e.key === 'Escape') setEditingField(null)
            }}
            onBlur={e => { onUpdate({ estimatedHours: Number(e.target.value) || null }); setEditingField(null) }} />
        ) : (
          <span className={`text-xs font-medium ${ticket.estimatedHours ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}`}>
            {ticket.estimatedHours ? `${ticket.estimatedHours}h` : 'Not set'}
          </span>
        )}
      </Field>

      {/* Created */}
      <Field icon={Clock} label="Created">
        <span className="text-xs text-gray-400">{timeAgo(ticket.createdAt)}</span>
      </Field>
    </div>
  )
}

function CommentItem({ comment, ticketId }) {
  const queryClient = useQueryClient()
  const { user } = useSelector(s => s.auth)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(comment.content)

  const deleteMutation = useMutation({
    mutationFn: () => ticketService.deleteComment(ticketId, comment.id),
    onSuccess: () => { toast.success('Comment deleted'); queryClient.invalidateQueries(['comments', ticketId]) },
  })

  const updateMutation = useMutation({
    mutationFn: (c) => ticketService.updateComment(ticketId, comment.id, c),
    onSuccess: () => { toast.success('Updated'); setEditing(false); queryClient.invalidateQueries(['comments', ticketId]) },
  })

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
        {getInitials(comment.author?.fullName || comment.author?.username)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {comment.author?.firstName ? `${comment.author.firstName} ${comment.author.lastName}` : comment.author?.username}
          </span>
          {comment.edited && <span className="text-xs text-gray-400">(edited)</span>}
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        {editing ? (
          <div className="space-y-2">
            <MentionTextarea
              value={content}
              onChange={setContent}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => updateMutation.mutate(content)} className="btn-primary text-xs px-3 py-1 h-auto">Save</button>
              <button onClick={() => { setEditing(false); setContent(comment.content) }} className="btn-secondary text-xs px-3 py-1 h-auto">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <CommentText text={comment.content} />
            </p>
          </div>
        )}
        {comment.author?.id === user?.id && !editing && (
          <div className="flex gap-2 mt-1">
            <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
            <button onClick={() => deleteMutation.mutate()} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSelector(s => s.auth)
  const [showEdit, setShowEdit] = useState(false)
  const [comment, setComment] = useState('')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicket(id),
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => ticketService.getComments(id),
    enabled: !!id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['history', id],
    queryFn: () => ticketService.getTicketHistory(id),
    enabled: !!id,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
    staleTime: 60000,
  })


  const addCommentMutation = useMutation({
    mutationFn: (content) => ticketService.addComment(id, { content }),
    onSuccess: () => { toast.success('Comment added'); setComment(''); queryClient.invalidateQueries(['comments', id]) },
  })

  const deleteMutation = useMutation({
    mutationFn: () => ticketService.deleteTicket(id),
    onSuccess: () => { toast.success('Ticket deleted'); navigate(-1) },
  })

  // Inline field update — auto-saves on change
  const updateField = useMutation({
    mutationFn: (patch) => ticketService.updateTicket(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id])
      queryClient.invalidateQueries(['history', id])
      toast.success('Updated')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-64 bg-gray-200 rounded" /><div className="h-96 bg-gray-200 rounded-xl" /></div>
  }

  if (!ticket) return <div className="text-center py-12 text-gray-400">Ticket not found</div>

  const status = getStatusConfig(ticket.status)
  const priority = getPriorityConfig(ticket.priority)
  const type = getTypeConfig(ticket.type)

  return (
    <div className="space-y-3 max-w-full">
      {showEdit && <TicketForm existingTicket={ticket} projectId={ticket.projectId} onClose={() => setShowEdit(false)} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back</button>
        <span>/</span>
        <Link to={`/projects/${ticket.projectId}`} className="hover:text-gray-700">{ticket.projectName}</Link>
        <span>/</span>
        <span className="font-mono text-gray-400">{ticket.ticketNumber}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-2xl mt-0.5">{type.icon}</span>
                <div className="min-w-0">
                  <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{ticket.title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowEdit(true)} className="btn-secondary text-xs px-3 py-1.5 h-auto">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => deleteMutation.mutate()} className="btn-danger text-xs px-3 py-1.5 h-auto">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`badge ${status.className}`}>{status.label}</span>
              <span className={`badge ${priority.className}`}>{priority.label}</span>
              <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{type.label}</span>
              {ticket.labels?.map(l => (
                <span key={l.id} className="badge text-white text-xs" style={{ backgroundColor: l.color || '#6b7280' }}>{l.name}</span>
              ))}
            </div>

            {ticket.description ? (
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided</p>
            )}
          </div>

          {/* ── Tabbed bottom panel ── */}
          <TicketTabPanel
            ticketId={id}
            currentUser={user}
            comments={comments}
            comment={comment}
            setComment={setComment}
            addCommentMutation={addCommentMutation}
          />
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-3">

          {/* Inline-editable Details card */}
          <DetailsSidebar ticket={ticket} users={users} onUpdate={(patch) => updateField.mutate(patch)} />

          {/* Activity/History */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Activity
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
              ) : history.map(h => {
                const who = h.changedBy?.firstName
                  ? `${h.changedBy.firstName} ${h.changedBy.lastName}`
                  : h.changedBy?.username || 'Someone'
                return (
                  <div key={h.id} className="flex gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                      bg-gray-100 dark:bg-gray-800 text-[9px] font-semibold text-gray-600 dark:text-gray-400">
                      {getInitials(who)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {h.changeType === 'CREATED' ? (
                          <><span className="font-semibold text-gray-900 dark:text-white">{who}</span> created this ticket</>
                        ) : (
                          <>
                            <span className="font-semibold text-gray-900 dark:text-white">{who}</span>
                            {' changed '}<span className="font-medium text-gray-700 dark:text-gray-300">{h.fieldName}</span>
                            {h.oldValue && (
                              <> from <span className="line-through text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">{h.oldValue}</span></>
                            )}
                            {h.newValue && (
                              <> to <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1 rounded font-medium">{h.newValue}</span></>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(h.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
