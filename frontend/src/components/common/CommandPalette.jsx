import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Ticket, FolderKanban, Users, BarChart3, Settings, Loader2, ArrowRight, Hash } from 'lucide-react'
import { ticketService } from '../../services/ticketService'
import { getStatusConfig, getPriorityConfig } from '../../utils/helpers'

const QUICK_LINKS = [
  { label: 'Dashboard',    to: '/dashboard',    icon: '📊' },
  { label: 'Projects',     to: '/projects',     icon: '📁' },
  { label: 'Tickets',      to: '/tickets',      icon: '🎟' },
  { label: 'Teams',        to: '/teams',        icon: '👥' },
  { label: 'Boards',       to: '/boards',       icon: '🗂' },
  { label: 'Reports',      to: '/reports',      icon: '📈' },
  { label: 'Users',        to: '/users',        icon: '👤' },
  { label: 'Admin Config', to: '/admin-settings', icon: '⚙️' },
]

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef  = useRef(null)
  const debounce  = useRef(null)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState(0)

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      setQuery(''); setResults([]); setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      if (/^[A-Z]{2,}-\d+$/i.test(q.trim())) {
        const t = await ticketService.getTicketByNumber(q.trim().toUpperCase())
        setResults([{ type: 'ticket', ...t }])
      } else {
        const data = await ticketService.getAllTickets({ search: q.trim(), size: 8 })
        setResults((data?.content || []).map(t => ({ type: 'ticket', ...t })))
      }
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val); setSelected(0)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(val), 300)
  }

  const filteredLinks = query
    ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_LINKS

  const allItems = [...filteredLinks.map(l => ({ type: 'link', ...l })), ...results]

  const go = (item) => {
    onClose()
    if (item.type === 'link') navigate(item.to)
    else navigate(`/tickets/${item.id}`)
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter')     { if (allItems[selected]) go(allItems[selected]) }
    if (e.key === 'Escape')    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {loading
            ? <Loader2 className="h-5 w-5 text-gray-400 animate-spin shrink-0" />
            : <Search className="h-5 w-5 text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="Search tickets, navigate pages…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {/* Quick links section */}
          {filteredLinks.length > 0 && (
            <div>
              {!query && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-2 pb-1">
                  Quick Navigate
                </p>
              )}
              {filteredLinks.map((link, i) => (
                <button key={link.to} onMouseDown={() => go({ type: 'link', ...link })}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selected === i ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <span className="text-lg w-6 text-center">{link.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{link.label}</span>
                  {selected === i && <ArrowRight className="h-4 w-4 text-primary-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {/* Ticket results */}
          {results.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                Tickets
              </p>
              {results.map((ticket, i) => {
                const idx = filteredLinks.length + i
                const status   = getStatusConfig(ticket.status)
                const priority = getPriorityConfig(ticket.priority)
                return (
                  <button key={ticket.id} onMouseDown={() => go(ticket)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selected === idx ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${priority.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 shrink-0">
                          {ticket.ticketNumber}
                        </code>
                        <span className={`badge text-[9px] shrink-0 ${status.className}`}>{status.label}</span>
                        <span className="text-[10px] text-gray-400 truncate">{ticket.projectName}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                        {ticket.title}
                      </p>
                    </div>
                    {selected === idx && <ArrowRight className="h-4 w-4 text-primary-500 ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {query && !loading && results.length === 0 && filteredLinks.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">
              No results for "<span className="font-medium">{query}</span>"
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">↵</kbd> open</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">ESC</kbd> close</span>
        </div>
      </motion.div>
    </div>
  )
}
