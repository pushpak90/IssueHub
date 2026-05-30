import api from './api'

export const categoryService = {
  getAll: async () => {
    const res = await api.get('/categories')
    return res.data.data
  },

  create: async (data) => {
    const res = await api.post('/categories', data)
    return res.data.data
  },

  update: async (id, data) => {
    const res = await api.put(`/categories/${id}`, data)
    return res.data.data
  },

  delete: async (id) => {
    const res = await api.delete(`/categories/${id}`)
    return res.data
  },

  assignProject: async (projectId, categoryId) => {
    const res = await api.patch(`/categories/projects/${projectId}/assign/${categoryId}`)
    return res.data
  },

  unassignProject: async (projectId) => {
    const res = await api.patch(`/categories/projects/${projectId}/unassign`)
    return res.data
  },
}
