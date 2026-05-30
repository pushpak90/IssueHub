import api from './api'

export const ticketFilterService = {
  getAll: async () => {
    const res = await api.get('/ticket-filters')
    return res.data.data
  },

  create: async (data) => {
    const res = await api.post('/ticket-filters', data)
    return res.data.data
  },

  update: async (id, data) => {
    const res = await api.put(`/ticket-filters/${id}`, data)
    return res.data.data
  },

  setDefault: async (id) => {
    const res = await api.patch(`/ticket-filters/${id}/default`)
    return res.data.data
  },

  delete: async (id) => {
    const res = await api.delete(`/ticket-filters/${id}`)
    return res.data
  },
}
