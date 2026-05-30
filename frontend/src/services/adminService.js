import api from './api'

export const adminService = {
  getSettings: async () => {
    const res = await api.get('/admin/settings/map')
    return res.data.data
  },

  updateSettings: async (updates) => {
    const res = await api.put('/admin/settings', updates)
    return res.data
  },

  getRoles: async () => {
    const res = await api.get('/admin/roles')
    return res.data.data
  },

  createRole: async (name) => {
    const res = await api.post('/admin/roles', { name })
    return res.data.data
  },

  deleteRole: async (id) => {
    const res = await api.delete(`/admin/roles/${id}`)
    return res.data
  },

  getOverview: async () => {
    const res = await api.get('/admin/overview')
    return res.data.data
  },
}
