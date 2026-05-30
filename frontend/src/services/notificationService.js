import api from './api'

export const notificationService = {
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params })
    return res.data.data
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count')
    return res.data.data.count
  },

  markAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`)
    return res.data
  },

  markAllAsRead: async () => {
    const res = await api.patch('/notifications/read-all')
    return res.data
  },
}
