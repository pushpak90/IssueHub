import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Search, Sun, Moon, ChevronDown, LogOut, User, Settings, Check, Loader2, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTheme } from '../../store/slices/uiSlice'
import { logoutUser } from '../../store/slices/authSlice'
import { setUnreadCount } from '../../store/slices/notificationSlice'
import { notificationService } from '../../services/notificationService'
import { ticketService } from '../../services/ticketService'
import { getStatusConfig, getInitials, timeAgo } from '../../utils/helpers'

const NOTIF_ICONS = {
  TICKET_ASSIGNED:      '🎯',
  TICKET_UPDATED:       '✏️',
  TICKET_COMMENTED:     '💬',
  TICKET_STATUS_CHANGED:'🔄',
  MENTION:              '👤',
  PROJECT_INVITATION:   '📁',
  INFO:                 'ℹ️',
  SUCCESS:              '✅',
  WARNING:              '⚠️',
  ERROR:                '❌',
}

// ── Smart search bar ─────────────────────────────────────────────────────────
function TopbarSearch() {
  const navigate   = useNavigate()
  const inputRef   = useRef(null)
  const wrapperRef = useRef(null)
  const debounce   = useRef(null)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); setNotFound(false); return }
    setLoading(true)
    setNotFound(false)
    try {
      // Try exact ticket number first (e.g. "ODB-1", "TKT-3")
      if (/^[A-Z]{2,10}-\d+$/i.test(q.trim())) {
        const ticket = await ticketService.getTicketByNumber(q.trim().toUpperCase())
        setResults([ticket])
      } else {
        // Otherwise search by title/number globally
        const data = await ticketService.getAllTickets({ search: q.trim(), size: 6 })
        setResults(data?.content || [])
        if (!data?.content?.length) setNotFound(true)
      }
    } catch {
      setResults([])
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(val), 350)
  }

  const go = (ticket) => {
    navigate(`/tickets/${ticket.id}`)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && results.length === 1) go(results[0])
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
          }}
          placeholder="Search tickets… or press Ctrl+K"
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-20 text-sm
            placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
        {loading
          ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          : <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono pointer-events-none">
              Ctrl K
            </kbd>
        }
      </div>

      <AnimatePresence>
        {open && query && (results.length > 0 || notFound) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-gray-200
              dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
          >
            {notFound && (
              <div className="px-4 py-3 text-sm text-gray-400">
                No tickets found for <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">"{query}"</span>
              </div>
            )}
            {results.map(ticket => {
              const status = getStatusConfig(ticket.status)
              return (
                <button key={ticket.id} onMouseDown={() => go(ticket)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 shrink-0">
                        {ticket.ticketNumber}
                      </span>
                      <span className={`badge text-[10px] shrink-0 ${status.className}`}>{status.label}</span>
                      <span className="text-[10px] text-gray-400 truncate">{ticket.projectName}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</p>
                  </div>
                  {ticket.assignee && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                      bg-primary-100 text-primary-700 text-[9px] font-bold dark:bg-primary-900/30">
                      {(ticket.assignee.firstName || ticket.assignee.username)?.[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
              )
            })}
            {results.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400">
                  Press <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[9px]">Enter</kbd> to open first result
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Topbar() {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { theme }   = useSelector(s => s.ui)
  const { user }    = useSelector(s => s.auth)
  const { unreadCount } = useSelector(s => s.notifications)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu,      setShowUserMenu]      = useState(false)
  const notifRef = useRef(null)
  const userRef  = useRef(null)

  // ── Fetch unread count (fast, lightweight) ────────────────────────────────
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn:  notificationService.getUnreadCount,
    refetchInterval: 20000,          // re-poll every 20 s
    staleTime:        10000,
  })

  // Sync unread count to Redux whenever the query updates
  useEffect(() => {
    if (unreadData !== undefined && unreadData !== null) {
      dispatch(setUnreadCount(Number(unreadData)))
    }
  }, [unreadData, dispatch])

  // ── Fetch notification list (only when panel is open) ─────────────────────
  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getNotifications({ page: 0, size: 15 }),
    enabled:  showNotifications,      // only fetch when open
    staleTime: 5000,
  })

  // Notifications list — safely read content array
  const notifications = notifData?.content ?? []

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    function onOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUserMenu(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead()
    queryClient.invalidateQueries(['notifications'])
    queryClient.invalidateQueries(['notifications-count'])
    dispatch(setUnreadCount(0))
  }

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif.id)
        queryClient.invalidateQueries(['notifications'])
        queryClient.invalidateQueries(['notifications-count'])
        dispatch(setUnreadCount(Math.max(0, unreadCount - 1)))
      } catch (_) { /* ignore */ }
    }
    setShowNotifications(false)
    // Navigate to ticket if applicable
    if (notif.referenceType === 'TICKET' && notif.referenceId) {
      navigate(`/tickets/${notif.referenceId}`)
    }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-6 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">

      {/* Smart Search — ticket number or title */}
      <TopbarSearch />

      <div className="flex items-center gap-2 ml-auto">

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500
            hover:bg-gray-100 hover:text-gray-700 transition-colors
            dark:hover:bg-gray-800 dark:text-gray-400"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* ── Notification bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500
              hover:bg-gray-100 hover:text-gray-700 transition-colors
              dark:hover:bg-gray-800 dark:text-gray-400"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center
                rounded-full bg-red-500 px-0.5 text-[10px] text-white font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-gray-200
                  bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full
                        bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-1">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline
                        dark:text-primary-400"
                    >
                      <Check className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[420px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Bell className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                      <p className="text-sm text-gray-400">No notifications yet</p>
                      <p className="text-xs text-gray-300">
                        You'll be notified about ticket activity here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {notifications.map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full text-left px-4 py-3.5 transition-colors
                            hover:bg-gray-50 dark:hover:bg-gray-800/70
                            ${!notif.read
                              ? 'bg-blue-50/60 dark:bg-blue-900/10'
                              : 'bg-white dark:bg-transparent'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <span className="text-base mt-0.5 shrink-0">
                              {NOTIF_ICONS[notif.type] || '🔔'}
                            </span>

                            <div className="min-w-0 flex-1">
                              {/* Title row */}
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-xs font-semibold truncate
                                  ${!notif.read
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300'
                                  }`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1" />
                                )}
                              </div>

                              {/* Message */}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5
                                line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>

                              {/* Footer */}
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[10px] text-gray-400">
                                  {timeAgo(notif.createdAt)}
                                </span>
                                {notif.referenceType === 'TICKET' && notif.referenceId && (
                                  <span className="text-[10px] text-primary-500 font-medium
                                    dark:text-primary-400">
                                    View ticket →
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer link */}
                {notifications.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      Showing latest {notifications.length} notifications
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── User menu ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full
              bg-primary-100 text-primary-700 text-xs font-semibold
              dark:bg-primary-900/30 dark:text-primary-400">
              {getInitials(user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username)}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-24 truncate">
              {user?.firstName || user?.username}
            </span>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-gray-400" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-52 rounded-xl border border-gray-200
                  bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 py-1 z-50"
              >
                <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  {user?.roles?.map(r => (
                    <span key={r} className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded
                      bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-medium">
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => { navigate('/settings'); setShowUserMenu(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm
                    text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <User className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setShowUserMenu(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm
                    text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm
                      text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  )
}
