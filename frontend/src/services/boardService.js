import api from './api'

export const boardService = {
  getAllBoards: async () => {
    const res = await api.get('/boards')
    return res.data.data
  },

  getBoard: async (id) => {
    const res = await api.get(`/boards/${id}`)
    return res.data.data
  },

  createBoard: async (data) => {
    const res = await api.post('/boards', data)
    return res.data.data
  },

  updateBoard: async (id, data) => {
    const res = await api.put(`/boards/${id}`, data)
    return res.data.data
  },

  deleteBoard: async (id) => {
    const res = await api.delete(`/boards/${id}`)
    return res.data
  },

  addProject: async (boardId, projectId) => {
    const res = await api.post(`/boards/${boardId}/projects/${projectId}`)
    return res.data.data
  },

  removeProject: async (boardId, projectId) => {
    const res = await api.delete(`/boards/${boardId}/projects/${projectId}`)
    return res.data.data
  },

  getBoardTickets: async (boardId, params = {}) => {
    const res = await api.get(`/boards/${boardId}/tickets`, { params })
    return res.data.data
  },
}
