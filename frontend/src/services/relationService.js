import api from './api'

export const relationService = {
  getRelations: async (ticketId) => {
    const res = await api.get(`/tickets/${ticketId}/relations`)
    return res.data.data
  },
  addRelation: async (ticketId, relationType, targetTicketId) => {
    const res = await api.post(`/tickets/${ticketId}/relations`, { relationType, targetTicketId })
    return res.data.data
  },
  removeRelation: async (ticketId, relationId) => {
    const res = await api.delete(`/tickets/${ticketId}/relations/${relationId}`)
    return res.data
  },
}
