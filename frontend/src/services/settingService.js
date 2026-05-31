import api from './api'

export const settingService = {
  getSettings: async () => {
    const res = await api.get('/settings/map')
    return res.data.data
  },
}
