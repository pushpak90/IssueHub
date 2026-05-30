import api from './api'

export const commitService = {
  getCommits: async (ticketId) => {
    const res = await api.get(`/tickets/${ticketId}/commits`)
    return res.data.data
  },

  addCommit: async (ticketId, data) => {
    const res = await api.post(`/tickets/${ticketId}/commits`, data)
    return res.data.data
  },

  removeCommit: async (ticketId, commitId) => {
    const res = await api.delete(`/tickets/${ticketId}/commits/${commitId}`)
    return res.data
  },
}
