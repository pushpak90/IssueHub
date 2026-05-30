import api from './api'

export const timeLogService = {
  getLogs: async (ticketId) => {
    const res = await api.get(`/tickets/${ticketId}/timelogs`)
    return res.data.data
  },
  addLog: async (ticketId, data) => {
    const res = await api.post(`/tickets/${ticketId}/timelogs`, data)
    return res.data.data
  },
  deleteLog: async (ticketId, logId) => {
    const res = await api.delete(`/tickets/${ticketId}/timelogs/${logId}`)
    return res.data
  },
}
