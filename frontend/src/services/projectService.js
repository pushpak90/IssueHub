import api from './api'

export const projectService = {
  createProject: async (data) => {
    const res = await api.post('/projects', data)
    return res.data.data
  },

  getAllProjects: async (params = {}) => {
    const res = await api.get('/projects', { params })
    return res.data.data
  },

  getMyProjects: async (params = {}) => {
    const res = await api.get('/projects/my', { params })
    return res.data.data
  },

  getProject: async (id) => {
    const res = await api.get(`/projects/${id}`)
    return res.data.data
  },

  updateProject: async (id, data) => {
    const res = await api.put(`/projects/${id}`, data)
    return res.data.data
  },

  addMember: async (projectId, userId) => {
    const res = await api.post(`/projects/${projectId}/members/${userId}`)
    return res.data
  },

  removeMember: async (projectId, userId) => {
    const res = await api.delete(`/projects/${projectId}/members/${userId}`)
    return res.data
  },

  deleteProject: async (id) => {
    const res = await api.delete(`/projects/${id}`)
    return res.data
  },

  archiveProject: async (id) => {
    const res = await api.patch(`/projects/${id}/archive`)
    return res.data
  },

  getProjectLabels: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/labels`)
    return res.data.data
  },

  createLabel: async (projectId, data) => {
    const res = await api.post(`/projects/${projectId}/labels`, data)
    return res.data.data
  },
}
