import api from './api'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', {
      usernameOrEmail: credentials.usernameOrEmail,
      password: credentials.password,
    })
    return data.data
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout')
    return data
  },

  refreshToken: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh', { refreshToken })
    return data.data
  },
}
