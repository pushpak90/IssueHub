import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { dashboardService } from '../services/dashboardService'
import { getStatusConfig, getPriorityConfig } from '../utils/helpers'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#14b8a6', '#f97316']

export default function Reports() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getStats,
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const statusData = stats?.ticketsByStatus
    ? Object.entries(stats.ticketsByStatus).map(([name, value]) => ({
        name: getStatusConfig(name).label, value: Number(value),
      })).filter(d => d.value > 0)
    : []

  const priorityData = stats?.ticketsByPriority
    ? Object.entries(stats.ticketsByPriority).map(([name, value]) => ({
        name: getPriorityConfig(name).label, value: Number(value),
      }))
    : []

  const overviewData = [
    { name: 'Total', value: stats?.totalTickets || 0 },
    { name: 'Open', value: stats?.openTickets || 0 },
    { name: 'In Progress', value: stats?.inProgressTickets || 0 },
    { name: 'Resolved', value: stats?.resolvedTickets || 0 },
    { name: 'Overdue', value: stats?.overdueTickets || 0 },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track performance and metrics across your projects</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Tickets', value: stats?.totalTickets, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Projects', value: stats?.activeProjects, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Resolved', value: stats?.resolvedTickets, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Overdue', value: stats?.overdueTickets, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ticket overview bar chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ticket Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={overviewData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {overviewData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data available</div>
          )}
        </div>

        {/* Priority distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityData.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#10b981'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project performance */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Performance</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Tickets', value: stats?.totalTickets || 0, max: stats?.totalTickets || 1, color: 'bg-blue-500' },
              { label: 'Open', value: stats?.openTickets || 0, max: stats?.totalTickets || 1, color: 'bg-yellow-500' },
              { label: 'In Progress', value: stats?.inProgressTickets || 0, max: stats?.totalTickets || 1, color: 'bg-purple-500' },
              { label: 'Done', value: stats?.resolvedTickets || 0, max: stats?.totalTickets || 1, color: 'bg-green-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
