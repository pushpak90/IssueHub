import api from './api'

export const ticketScriptService = {
  getScripts: async (ticketId) => {
    const res = await api.get(`/tickets/${ticketId}/scripts`)
    return res.data.data
  },
  addScript: async (ticketId, data) => {
    const res = await api.post(`/tickets/${ticketId}/scripts`, data)
    return res.data.data
  },
  deleteScript: async (ticketId, scriptId) => {
    const res = await api.delete(`/tickets/${ticketId}/scripts/${scriptId}`)
    return res.data
  },
}
