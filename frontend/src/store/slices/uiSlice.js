import { createSlice } from '@reduxjs/toolkit'

const savedTheme = localStorage.getItem('theme') || 'light'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    theme: savedTheme,
    activeModal: null,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed },
    setSidebarCollapsed: (state, action) => { state.sidebarCollapsed = action.payload },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', state.theme)
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    openModal: (state, action) => { state.activeModal = action.payload },
    closeModal: (state) => { state.activeModal = null },
  },
})

export const { toggleSidebar, setSidebarCollapsed, toggleTheme, openModal, closeModal } = uiSlice.actions
export default uiSlice.reducer
