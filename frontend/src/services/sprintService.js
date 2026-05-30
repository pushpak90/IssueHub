import api from './api'

export const sprintService = {
  getProjectSprints: async (projectId) => {
    const res = await api.get(`/sprints/project/${projectId}`)
    return res.data.data
  },

  getActiveSprint: async (projectId) => {
    const res = await api.get(`/sprints/project/${projectId}/active`)
    return res.data.data
  },

  createSprint: async (projectId, data) => {
    const res = await api.post(`/sprints/project/${projectId}`, data)
    return res.data.data
  },

  updateSprint: async (sprintId, data) => {
    const res = await api.put(`/sprints/${sprintId}`, data)
    return res.data.data
  },

  startSprint: async (sprintId) => {
    const res = await api.patch(`/sprints/${sprintId}/start`)
    return res.data.data
  },

  completeSprint: async (sprintId) => {
    const res = await api.patch(`/sprints/${sprintId}/complete`)
    return res.data.data
  },

  deleteSprint: async (sprintId) => {
    const res = await api.delete(`/sprints/${sprintId}`)
    return res.data
  },

  getSprintTickets: async (sprintId) => {
    const res = await api.get(`/sprints/${sprintId}/tickets`)
    return res.data.data
  },

  getBacklog: async (projectId) => {
    const res = await api.get(`/sprints/project/${projectId}/backlog`)
    return res.data.data
  },

  addTicketToSprint: async (sprintId, ticketId) => {
    const res = await api.post(`/sprints/${sprintId}/tickets/${ticketId}`)
    return res.data
  },

  removeTicketFromSprint: async (sprintId, ticketId) => {
    const res = await api.delete(`/sprints/${sprintId}/tickets/${ticketId}`)
    return res.data
  },
}
