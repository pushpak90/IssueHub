import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Ticket, Users, UsersRound,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Zap, ShieldCheck, LayoutGrid
} from 'lucide-react'
import { toggleSidebar } from '../../store/slices/uiSlice'
import { logoutUser } from '../../store/slices/authSlice'
import { cn, getInitials, isAdmin, isManager } from '../../utils/helpers'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'  },
  { to: '/boards',    icon: LayoutGrid,      label: 'Boards'    },
  { to: '/tickets',   icon: Ticket,          label: 'Tickets'   },
  { to: '/teams',     icon: UsersRound,      label: 'Teams'     },
  { to: '/reports',   icon: BarChart3,       label: 'Reports'   },
]

const managerItems = [
  { to: '/users',    icon: Users,    label: 'Users' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const adminOnlyItems = [
  { to: '/admin-settings', icon: ShieldCheck, label: 'Admin Config' },
]

export default function Sidebar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { sidebarCollapsed } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 dark:border-gray-800 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-gray-900 dark:text-white text-sm whitespace-nowrap overflow-hidden"
              >
                Ticket Portal
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={sidebarCollapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              'sidebar-item group relative',
              isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}

        {isManager(user) && (
          <>
            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            {managerItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  'sidebar-item',
                  isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm truncate">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </>
        )}

        {/* Admin-only section */}
        {isAdmin(user) && (
          <>
            <div className="my-2 border-t border-red-100 dark:border-red-900/30" />
            {adminOnlyItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  'sidebar-item',
                  isActive
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/10'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm truncate font-medium">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold dark:bg-primary-900/30 dark:text-primary-400">
            {getInitials(user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username)}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
