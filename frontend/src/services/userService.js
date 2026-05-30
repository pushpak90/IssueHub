import api from './api'

export const userService = {
  getMe: async () => {
    const res = await api.get('/users/me')
    return res.data.data
  },

  updateMe: async (data) => {
    const res = await api.put('/users/me', data)
    return res.data.data
  },

  getAllUsers: async (params = {}) => {
    const res = await api.get('/users', { params })
    return res.data.data
  },

  getAllActiveUsers: async () => {
    const res = await api.get('/users/all')
    return res.data.data
  },

  getUserById: async (id) => {
    const res = await api.get(`/users/${id}`)
    return res.data.data
  },

  updateUser: async (id, data) => {
    const res = await api.put(`/users/${id}`, data)
    return res.data.data
  },

  toggleUserStatus: async (id) => {
    const res = await api.patch(`/users/${id}/toggle-status`)
    return res.data
  },
}
