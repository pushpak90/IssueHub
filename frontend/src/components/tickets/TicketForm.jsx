import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { X, Loader2, FolderKanban, Plus, Paperclip, FileText } from 'lucide-react'
import { ticketService } from '../../services/ticketService'
import { userService } from '../../services/userService'
import { projectService } from '../../services/projectService'
import MentionTextarea from '../common/MentionTextarea'
import toast from 'react-hot-toast'

export default function TicketForm({ projectId: initialProjectId, onClose, existingTicket }) {
  const queryClient = useQueryClient()

  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId || existingTicket?.projectId || null
  )

  // ── File / PDF attachment state ───────────────────────────────────────────
  const fileInputRef = useRef(null)
  const [pendingFiles,   setPendingFiles]   = useState([])   // files to upload after save
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const { data: existingAttachments = [] } = useQuery({
    queryKey: ['attachments', existingTicket?.id],
    queryFn:  () => ticketService.getTicketAttachments(existingTicket.id),
    enabled: !!existingTicket?.id,
  })

  const removeAttachMutation = useMutation({
    mutationFn: (attachId) => import('../../services/api').then(m => m.default.delete(`/files/${attachId}`)),
    onSuccess: () => { toast.success('Attachment removed'); queryClient.invalidateQueries(['attachments', existingTicket?.id]) },
  })

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 20 * 1024 * 1024)  // 20MB max
    if (valid.length < files.length) toast.error('Files over 20MB were skipped')
    setPendingFiles(prev => [...prev, ...valid])
    e.target.value = ''
  }

  const removePendingFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx))

  const uploadPendingFiles = async (ticketId) => {
    if (pendingFiles.length === 0) return
    setUploadingFiles(true)
    for (const file of pendingFiles) {
      try { await ticketService.uploadAttachment(ticketId, file) }
      catch { /* individual upload failure — continue */ }
    }
    setPendingFiles([])
    setUploadingFiles(false)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (file) => {
    const type = file.type || file.contentType || ''
    const name = file.name || file.originalName || ''
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📄'
    if (type.includes('image')) return '🖼️'
    if (name.match(/\.(sql|sh|py|js|ts|java)$/i)) return '💻'
    if (name.match(/\.(zip|rar|tar|gz)$/i)) return '🗜️'
    if (name.match(/\.(doc|docx)$/i)) return '📝'
    if (name.match(/\.(xls|xlsx|csv)$/i)) return '📊'
    return '📎'
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: existingTicket ? {
      title:          existingTicket.title          || '',
      description:    existingTicket.description    || '',
      type:           existingTicket.type           || 'TASK',
      priority:       existingTicket.priority       || 'MEDIUM',
      status:         existingTicket.status         || 'TODO',
      assigneeId:     existingTicket.assignee?.id != null ? String(existingTicket.assignee.id) : '',
      dueDate:        existingTicket.dueDate         || '',
      estimatedHours: existingTicket.estimatedHours  ?? '',
      resolutionNote: existingTicket.resolutionNote  || '',
      labelIds:       existingTicket.labels?.map(l => String(l.id)) || [],
    } : { priority: 'MEDIUM', type: 'TASK', labelIds: [] }
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-all-small'],
    queryFn: () => projectService.getAllProjects({ size: 200 }),
    staleTime: 30000,
    enabled: !existingTicket,
  })
  const allProjects = projectsData?.content || []

  const { data: users = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: userService.getAllActiveUsers,
  })

  const { data: projectLabels = [] } = useQuery({
    queryKey: ['labels', selectedProjectId],
    queryFn: () => projectService.getProjectLabels(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  const selectedLabelIds = watch('labelIds') || []

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        labelIds: (data.labelIds || []).map(Number),
      }
      // 1. Update / create ticket
      const result = existingTicket
        ? await ticketService.updateTicket(existingTicket.id, payload)
        : await ticketService.createTicket({ ...payload, projectId: selectedProjectId })

      const ticketId = existingTicket?.id || result?.id
      if (!ticketId) return result

      // 2. Upload pending file attachments
      if (pendingFiles.length > 0) {
        await uploadPendingFiles(ticketId)
      }

      return result
    },
    onSuccess: () => {
      toast.success(existingTicket ? 'Ticket updated!' : 'Ticket created!')
      queryClient.invalidateQueries(['tickets'])
      queryClient.invalidateQueries(['history',      existingTicket?.id])
      queryClient.invalidateQueries(['attachments',  existingTicket?.id])
      queryClient.invalidateQueries(['tickets',  'project', selectedProjectId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save ticket'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl mb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {existingTicket ? 'Edit Ticket' : 'Create New Ticket'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => {
          if (!existingTicket && !selectedProjectId) { toast.error('Please select a project'); return }
          mutation.mutate(data)
        })} className="p-6 space-y-4">

          {/* Project info */}
          {!existingTicket ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><FolderKanban className="h-4 w-4 text-primary-500" /> Project *</span>
              </label>
              <select
                value={selectedProjectId || ''}
                onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                className={`input ${!selectedProjectId ? 'border-orange-300 ring-1 ring-orange-200' : ''}`}
              >
                <option value="">— Select a project —</option>
                {allProjects.map(p => <option key={p.id} value={p.id}>[{p.keyPrefix}] {p.name}</option>)}
              </select>
              {!selectedProjectId && <p className="text-xs text-orange-500 mt-1">A project is required</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
              <FolderKanban className="h-4 w-4 text-primary-500" />
              <span className="font-medium">{existingTicket.projectName}</span>
              <span className="text-gray-400">· {existingTicket.ticketNumber}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
            <input {...register('title', { required: 'Title is required' })} className="input"
              placeholder="Brief description of the issue or task" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description — supports image paste, drag-drop, @mention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <Controller
              name="description"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <MentionTextarea
                  value={field.value || ''}
                  onChange={field.onChange}
                  rows={4}
                  placeholder="Describe the ticket… paste images with Ctrl+V, @mention team members"
                  className="text-sm"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
              <select {...register('type')} className="input">
                {[['BUG','🐛 Bug'],['FEATURE','✨ Feature'],['TASK','✅ Task'],['IMPROVEMENT','⚡ Improvement'],
                  ['EPIC','🔮 Epic'],['STORY','📖 Story'],['TEST','🧪 Test'],['DOCUMENTATION','📄 Docs']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <select {...register('priority')} className="input">
                {[['CRITICAL','🔴 Critical'],['HIGH','🟠 High'],['MEDIUM','🟡 Medium'],['LOW','🟢 Low']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assignee</label>
              <select {...register('assigneeId')} className="input">
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
              <input {...register('dueDate')} type="date" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estimated Hours</label>
              <input {...register('estimatedHours', { valueAsNumber: true })} type="number" min="0" className="input" placeholder="0" />
            </div>
            {existingTicket && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <select {...register('status')} className="input">
                  {['TODO','IN_PROGRESS','IN_REVIEW','TESTING','DONE','CLOSED','ON_HOLD','CANCELLED'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedProjectId && projectLabels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags / Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {projectLabels.map(label => {
                  const checked = selectedLabelIds.includes(String(label.id))
                  return (
                    <label
                      key={label.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={String(label.id)}
                        {...register('labelIds')}
                        className="sr-only"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: label.color || '#6B7280' }}
                      />
                      {label.name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Attachments for new tickets. Existing ticket files are managed from the Attachments tab. */}
          {!existingTicket && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Paperclip className="h-4 w-4 text-blue-500" />
                Attachments
                {(existingAttachments.length + pendingFiles.length) > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold dark:bg-blue-900/20 dark:text-blue-400">
                    {existingAttachments.length + pendingFiles.length}
                  </span>
                )}
              </label>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 font-medium transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add File
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.sql,.zip"
                onChange={handleFileSelect} />
            </div>

            {/* Existing attachments (edit only) */}
            {existingAttachments.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{getFileIcon(a)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{a.originalName}</p>
                    <p className="text-[10px] text-gray-400">{a.fileSize ? formatFileSize(a.fileSize) : ''} · saved</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={a.downloadUrl} target="_blank" rel="noopener noreferrer"
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Download">
                    <FileText className="h-3.5 w-3.5" />
                  </a>
                  <button type="button" onClick={() => removeAttachMutation.mutate(a.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Pending new files */}
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{getFileIcon(f)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">{formatFileSize(f.size)} · will upload on save</p>
                  </div>
                </div>
                <button type="button" onClick={() => removePendingFile(i)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {existingAttachments.length === 0 && pendingFiles.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1 italic">
                No attachments. Supports PDF, images, Office files, SQL scripts (max 20MB each)
              </p>
            )}

            {uploadingFiles && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading files…
              </div>
            )}
          </div>
          )}
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                : existingTicket ? 'Update Ticket' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
