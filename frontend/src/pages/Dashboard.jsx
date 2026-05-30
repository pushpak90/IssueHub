import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Ticket, FolderKanban, Users, Activity, AlertCircle,
  CheckCircle2, Clock, TrendingUp, Calendar, ArrowRight,
  Zap, Target, Flag
} from 'lucide-react'
import { dashboardService } from '../services/dashboardService'
import { ticketService } from '../services/ticketService'
import { projectService } from '../services/projectService'
import { sprintService } from '../services/sprintService'
import { notificationService } from '../services/notificationService'
import {
  getStatusConfig, getPriorityConfig, getTypeConfig,
  timeAgo, formatDate
} from '../utils/helpers'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

const isPrivileged = (user) =>
  user?.roles?.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER')

// ── Shared: small stat card ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

// ── ADMIN / MANAGER Dashboard ─────────────────────────────────────────────────
function AdminDashboard({ user }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getStats,
  })

  const statusChartData = stats?.ticketsByStatus
    ? Object.entries(stats.ticketsByStatus)
        .map(([name, value]) => ({ name: getStatusConfig(name).label, value: Number(value) }))
        .filter(d => d.value > 0)
    : []

  if (isLoading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good day, {user?.firstName || user?.username} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening across all projects</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Ticket}       label="Total Tickets"    value={stats?.totalTickets}      color="bg-blue-100 text-blue-600"   />
        <StatCard icon={Activity}     label="In Progress"      value={stats?.inProgressTickets} color="bg-purple-100 text-purple-600" />
        <StatCard icon={CheckCircle2} label="Resolved"         value={stats?.resolvedTickets}   color="bg-green-100 text-green-600"  />
        <StatCard icon={AlertCircle}  label="Overdue"          value={stats?.overdueTickets}    color="bg-red-100 text-red-600"      />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={FolderKanban} label="Active Projects" value={stats?.activeProjects}  color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Users}        label="Total Users"     value={stats?.totalUsers}      color="bg-teal-100 text-teal-600"     />
        <StatCard icon={Clock}        label="Open Tickets"    value={stats?.openTickets}     color="bg-yellow-100 text-yellow-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tickets by Status</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent + My Tickets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TicketListCard
          title="Recent Tickets"
          tickets={stats?.recentTickets?.slice(0,6)}
          linkTo="/tickets"
          linkLabel="View all"
        />
        <TicketListCard
          title="My Assigned Tickets"
          tickets={stats?.myAssignedTickets}
          linkTo="/tickets"
          linkLabel="View all"
          emptyText="No tickets assigned to you"
        />
      </div>
    </div>
  )
}

// ── Shared ticket list card ───────────────────────────────────────────────────
function TicketListCard({ title, tickets = [], linkTo, linkLabel, emptyText = 'No tickets yet' }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <Link to={linkTo} className="text-xs text-primary-600 hover:underline dark:text-primary-400">{linkLabel}</Link>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {tickets?.length > 0 ? tickets.map(ticket => (
          <Link to={`/tickets/${ticket.id}`} key={ticket.id}
            className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <span className="text-lg shrink-0">{getTypeConfig(ticket.type).icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</p>
              <p className="text-xs text-gray-400">{ticket.ticketNumber} · {ticket.projectName} · {timeAgo(ticket.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`badge text-xs ${getStatusConfig(ticket.status).className}`}>
                {getStatusConfig(ticket.status).label}
              </span>
              <div className={`h-2 w-2 rounded-full ${getPriorityConfig(ticket.priority).dot}`} />
            </div>
          </Link>
        )) : (
          <div className="py-8 text-center text-sm text-gray-400">{emptyText}</div>
        )}
      </div>
    </div>
  )
}

// ── DEVELOPER / TESTER Dashboard ──────────────────────────────────────────────
function DevDashboard({ user }) {
  const isDev = user?.roles?.some(r => r === 'ROLE_DEVELOPER')

  // My assigned tickets
  const { data: myTicketsData } = useQuery({
    queryKey: ['my-tickets-dashboard'],
    queryFn: () => ticketService.getMyTickets({ page: 0, size: 50 }),
  })
  const myTickets = myTicketsData?.content || []

  // My projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects-my'],
    queryFn: () => projectService.getMyProjects({ size: 20 }),
  })
  const myProjects = projectsData?.content || []

  // Recent notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications({ size: 5 }),
  })
  const notifications = notifData?.content || []

  // Active sprint from first project
  const firstProjectId = myProjects[0]?.id
  const { data: activeSprint } = useQuery({
    queryKey: ['active-sprint', firstProjectId],
    queryFn: () => sprintService.getActiveSprint(firstProjectId),
    enabled: !!firstProjectId,
  })

  // Compute stats from my tickets
  const openTickets     = myTickets.filter(t => t.status === 'TODO').length
  const inProgress      = myTickets.filter(t => t.status === 'IN_PROGRESS').length
  const inReview        = myTickets.filter(t => t.status === 'IN_REVIEW').length
  const done            = myTickets.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const overdue         = myTickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() &&
                            !['DONE','CLOSED','CANCELLED'].includes(t.status)).length
  const upcoming        = myTickets
    .filter(t => t.dueDate && new Date(t.dueDate) >= new Date() && !['DONE','CLOSED'].includes(t.status))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4)

  // Sprint tickets assigned to me
  const { data: sprintTickets = [] } = useQuery({
    queryKey: ['sprint-tickets', activeSprint?.id],
    queryFn: () => sprintService.getSprintTickets(activeSprint.id),
    enabled: !!activeSprint?.id,
  })
  const mySprintTickets  = sprintTickets.filter(t =>
    t.assignee?.id === user?.id || t.assignee?.username === user?.username
  )
  const sprintDone       = mySprintTickets.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length
  const sprintProgress   = mySprintTickets.length > 0
    ? Math.round((sprintDone / mySprintTickets.length) * 100) : 0

  const statusData = [
    { name: 'To Do',       value: openTickets, fill: '#6B7280' },
    { name: 'In Progress', value: inProgress,  fill: '#3B82F6' },
    { name: 'In Review',   value: inReview,    fill: '#8B5CF6' },
    { name: 'Done',        value: done,        fill: '#10B981' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName || user?.username} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDev ? 'Developer' : 'Tester'} dashboard — your work at a glance
        </p>
      </div>

      {/* My personal stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Ticket}       label="My Open"       value={openTickets} color="bg-gray-100 text-gray-600"    sub="waiting to start" />
        <StatCard icon={Activity}     label="In Progress"   value={inProgress}  color="bg-blue-100 text-blue-600"    sub="currently working" />
        <StatCard icon={CheckCircle2} label="Done"          value={done}        color="bg-green-100 text-green-600"  sub="completed" />
        <StatCard icon={AlertCircle}  label="Overdue"       value={overdue}     color="bg-red-100 text-red-600"      sub={overdue > 0 ? '⚠ needs attention' : 'all on time'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Sprint progress */}
        <div className="lg:col-span-1 space-y-4">
          {activeSprint ? (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Active Sprint</h3>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{activeSprint.name}</p>
              {activeSprint.goal && (
                <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                  <Target className="h-3 w-3 shrink-0 mt-0.5" /> {activeSprint.goal}
                </p>
              )}
              {(activeSprint.startDate || activeSprint.endDate) && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {activeSprint.startDate && formatDate(activeSprint.startDate)}
                  {activeSprint.startDate && activeSprint.endDate && ' – '}
                  {activeSprint.endDate && formatDate(activeSprint.endDate)}
                </p>
              )}
              {mySprintTickets.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">My progress</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {sprintDone}/{mySprintTickets.length} done
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${sprintProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{sprintProgress}% complete</p>
                </div>
              )}
              {mySprintTickets.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 italic">No tickets assigned to you in this sprint</p>
              )}
              <Link to={`/projects/${firstProjectId}`}
                className="mt-3 flex items-center gap-1 text-xs text-primary-600 hover:underline dark:text-primary-400">
                Open sprint board <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-500 text-sm">No Active Sprint</h3>
              </div>
              <p className="text-xs text-gray-400">
                No sprint is currently running. Ask your manager to start one.
              </p>
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" /> Upcoming Deadlines
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No upcoming due dates</p>
            ) : upcoming.map(t => {
              const daysLeft = Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <Link key={t.id} to={`/tickets/${t.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 rounded transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400">{t.ticketNumber}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                    daysLeft <= 1 ? 'bg-red-100 text-red-700' :
                    daysLeft <= 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* My Projects */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary-500" /> My Projects
            </h3>
            {myProjects.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Not assigned to any project yet</p>
            ) : myProjects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100 text-primary-700 text-[9px] font-bold dark:bg-primary-900/30 dark:text-primary-400">
                    {p.keyPrefix}
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{p.name}</span>
                </div>
                <span className="text-[10px] text-gray-400">{p.openTickets} open</span>
              </Link>
            ))}
          </div>
        </div>

        {/* My Tickets + Chart */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status mini chart */}
          {statusData.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">My Ticket Status Overview</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* My all tickets */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                My Tickets
                <span className="ml-2 text-xs font-normal text-gray-400">({myTickets.length} total)</span>
              </h3>
              <Link to="/tickets" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {myTickets.length === 0 ? (
                <div className="py-10 text-center">
                  <Ticket className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No tickets assigned to you yet</p>
                  <p className="text-xs text-gray-300 mt-1">Ask your manager to assign tasks</p>
                </div>
              ) : myTickets.slice(0, 10).map(ticket => {
                const status   = getStatusConfig(ticket.status)
                const priority = getPriorityConfig(ticket.priority)
                const type     = getTypeConfig(ticket.type)
                const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() &&
                  !['DONE','CLOSED','CANCELLED'].includes(ticket.status)
                return (
                  <Link key={ticket.id} to={`/tickets/${ticket.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-base shrink-0">{type.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-400">
                        {ticket.ticketNumber} · {ticket.projectName}
                        {isOverdue && <span className="text-red-500 ml-2">⚠ Overdue</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-xs ${status.className}`}>{status.label}</span>
                      <div className={`h-2 w-2 rounded-full ${priority.dot}`} title={priority.label} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent notifications */}
          {notifications.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {notifications.map(n => (
                  <div key={n.id} className={`px-5 py-3 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useSelector(s => s.auth)

  return isPrivileged(user)
    ? <AdminDashboard user={user} />
    : <DevDashboard user={user} />
}
