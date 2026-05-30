import api from './api'

export const ticketService = {
  createTicket: async (data) => {
    const res = await api.post('/tickets', data)
    return res.data.data
  },

  getTicket: async (id) => {
    const res = await api.get(`/tickets/${id}`)
    return res.data.data
  },

  getTicketByNumber: async (number) => {
    const res = await api.get(`/tickets/number/${number}`)
    return res.data.data
  },

  exportTickets: async (params = {}) => {
    const res = await api.get('/tickets/export', { params })
    return res.data.data   // returns enriched list with commitIds
  },

  getExplorerOptions: async () => {
    const res = await api.get('/tickets/explorer/options')
    return res.data.data
  },

  exploreTickets: async (params = {}) => {
    const res = await api.get('/tickets/explorer', { params })
    return res.data.data
  },

  exportExplorerTickets: async (params = {}) => {
    const res = await api.get('/tickets/explorer/export', { params })
    return res.data.data
  },

  getAllTickets: async (params = {}) => {
    const res = await api.get('/tickets', { params })
    return res.data.data
  },

  getProjectTickets: async (projectId, params = {}) => {
    const res = await api.get(`/tickets/project/${projectId}`, { params })
    return res.data.data
  },

  getMyTickets: async (params = {}) => {
    const res = await api.get('/tickets/my', { params })
    return res.data.data
  },

  updateTicket: async (id, data) => {
    const res = await api.put(`/tickets/${id}`, data)
    return res.data.data
  },

  deleteTicket: async (id) => {
    const res = await api.delete(`/tickets/${id}`)
    return res.data
  },

  getTicketHistory: async (id) => {
    const res = await api.get(`/tickets/${id}/history`)
    return res.data.data
  },

  getTicketAttachments: async (id) => {
    const res = await api.get(`/tickets/${id}/attachments`)
    return res.data.data
  },

  getComments: async (ticketId) => {
    const res = await api.get(`/tickets/${ticketId}/comments`)
    return res.data.data
  },

  addComment: async (ticketId, data) => {
    const res = await api.post(`/tickets/${ticketId}/comments`, data)
    return res.data.data
  },

  updateComment: async (ticketId, commentId, content) => {
    const res = await api.put(`/tickets/${ticketId}/comments/${commentId}`, { content })
    return res.data.data
  },

  deleteComment: async (ticketId, commentId) => {
    const res = await api.delete(`/tickets/${ticketId}/comments/${commentId}`)
    return res.data
  },

  uploadAttachment: async (ticketId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/files/upload/${ticketId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
}
