import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import CommandPalette from './components/common/CommandPalette'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Tickets from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import Users from './pages/Users'
import Teams from './pages/Teams'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import AdminSettings from './pages/AdminSettings'
import Boards from './pages/Boards'
import BoardDetail from './pages/BoardDetail'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }) {
  const { token } = useSelector((state) => state.auth)
  return token ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { token } = useSelector((state) => state.auth)
  return token ? <Navigate to="/dashboard" replace /> : children
}

function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false)
  const { token } = useSelector(s => s.auth)

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (token) setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [token])

  return (
    <>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CommandPaletteProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="teams" element={<Teams />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin-settings" element={<AdminSettings />} />
          <Route path="boards" element={<Boards />} />
          <Route path="boards/:id" element={<BoardDetail />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </CommandPaletteProvider>
    </BrowserRouter>
  )
}
