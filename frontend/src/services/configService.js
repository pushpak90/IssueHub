import api from './api'

export const configService = {
  // ── Public read (any authenticated user) ──────────────────────────────────

  /** Get statuses for a specific project (falls back to global if none defined) */
  getStatuses: (projectId) =>
    api.get('/config/statuses', { params: projectId ? { projectId } : {} })
       .then(r => r.data.data),

  /** Get all active priorities (global) */
  getPriorities: () =>
    api.get('/config/priorities').then(r => r.data.data),

  /** Get all active ticket types (global) */
  getTypes: () =>
    api.get('/config/types').then(r => r.data.data),

  // ── Admin: Status management ───────────────────────────────────────────────

  /** Get all statuses (including inactive) — admin only */
  adminGetStatuses: (projectId) =>
    api.get('/admin/config/statuses', { params: projectId ? { projectId } : {} })
       .then(r => r.data.data),

  createStatus: (data) =>
    api.post('/admin/config/statuses', data).then(r => r.data.data),

  updateStatus: (id, data) =>
    api.put(`/admin/config/statuses/${id}`, data).then(r => r.data.data),

  deleteStatus: (id) =>
    api.delete(`/admin/config/statuses/${id}`).then(r => r.data),

  reorderStatuses: (projectId, orderedIds) =>
    api.put('/admin/config/statuses/reorder', orderedIds, {
      params: projectId ? { projectId } : {},
    }).then(r => r.data.data),

  // ── Admin: Priority management ─────────────────────────────────────────────

  adminGetPriorities: () =>
    api.get('/admin/config/priorities').then(r => r.data.data),

  createPriority: (data) =>
    api.post('/admin/config/priorities', data).then(r => r.data.data),

  updatePriority: (id, data) =>
    api.put(`/admin/config/priorities/${id}`, data).then(r => r.data.data),

  deletePriority: (id) =>
    api.delete(`/admin/config/priorities/${id}`).then(r => r.data),

  // ── Admin: Type management ─────────────────────────────────────────────────

  adminGetTypes: () =>
    api.get('/admin/config/types').then(r => r.data.data),

  createType: (data) =>
    api.post('/admin/config/types', data).then(r => r.data.data),

  updateType: (id, data) =>
    api.put(`/admin/config/types/${id}`, data).then(r => r.data.data),

  deleteType: (id) =>
    api.delete(`/admin/config/types/${id}`).then(r => r.data),
}
