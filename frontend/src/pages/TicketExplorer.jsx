import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, Filter,
  Loader2, Save, Search, SlidersHorizontal, Star, Trash2, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ticketService } from '../services/ticketService'
import { ticketFilterService } from '../services/ticketFilterService'
import { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES } from '../utils/constants'
import {
  cn, formatDate, getPriorityConfig, getStatusConfig, getTypeConfig, isManager
} from '../utils/helpers'

const PROJECT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const DEFAULT_COLUMNS = [
  'ticketNumber', 'title', 'projectName', 'status', 'priority',
  'type', 'assignee', 'dueDate', 'updatedAt'
]

const FILTER_ARRAY_KEYS = [
  'projectIds', 'categoryIds', 'projectStatuses', 'statuses', 'priorities',
  'types', 'assigneeIds', 'reporterIds', 'labelIds', 'sprintIds'
]

const FILTER_STRING_KEYS = [
  'search', 'hasAttachments', 'hasComments', 'hasCommits',
  'dueFrom', 'dueTo', 'createdFrom', 'createdTo',
  'updatedFrom', 'updatedTo', 'resolvedFrom', 'resolvedTo',
  'estimatedMin', 'estimatedMax', 'actualMin', 'actualMax'
]

const FILTER_BOOLEAN_KEYS = ['backlog', 'overdue', 'unassigned']

const EXPORT_HEADERS = [
  ['ticketNumber', 'Ticket #'],
  ['title', 'Title'],
  ['status', 'Status'],
  ['priority', 'Priority'],
  ['type', 'Type'],
  ['projectName', 'Project'],
  ['assignee', 'Assignee'],
  ['reporter', 'Reporter'],
  ['dueDate', 'Due Date'],
  ['estimatedHours', 'Estimated Hours'],
  ['actualHours', 'Actual Hours'],
  ['labels', 'Labels'],
  ['commentCount', 'Comments'],
  ['attachmentCount', 'Attachments'],
  ['commitIds', 'Commit IDs'],
  ['createdAt', 'Created At'],
  ['updatedAt', 'Updated At'],
  ['resolvedAt', 'Resolved At'],
]

function createEmptyFilters() {
  return {
    search: '',
    projectIds: [],
    categoryIds: [],
    projectStatuses: [],
    statuses: [],
    priorities: [],
    types: [],
    assigneeIds: [],
    reporterIds: [],
    labelIds: [],
    sprintIds: [],
    backlog: false,
    overdue: false,
    unassigned: false,
    hasAttachments: '',
    hasComments: '',
    hasCommits: '',
    dueFrom: '',
    dueTo: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    resolvedFrom: '',
    resolvedTo: '',
    estimatedMin: '',
    estimatedMax: '',
    actualMin: '',
    actualMax: '',
  }
}

function normalizeFilters(value) {
  const next = { ...createEmptyFilters(), ...(value || {}) }
  FILTER_ARRAY_KEYS.forEach(key => {
    next[key] = Array.isArray(next[key]) ? next[key].map(String) : []
  })
  FILTER_STRING_KEYS.forEach(key => {
    next[key] = next[key] === null || next[key] === undefined ? '' : String(next[key])
  })
  FILTER_BOOLEAN_KEYS.forEach(key => {
    next[key] = Boolean(next[key])
  })
  return next
}

function toParams(filters, paging) {
  const params = { ...(paging || {}) }
  FILTER_ARRAY_KEYS.forEach(key => {
    if (filters[key]?.length) params[key] = filters[key].join(',')
  })
  FILTER_STRING_KEYS.forEach(key => {
    if (filters[key] !== '') params[key] = filters[key]
  })
  FILTER_BOOLEAN_KEYS.forEach(key => {
    if (filters[key]) params[key] = true
  })
  return params
}

function countActiveFilters(filters) {
  return Object.entries(filters).reduce((count, [, value]) => {
    if (Array.isArray(value)) return count + (value.length ? 1 : 0)
    if (typeof value === 'boolean') return count + (value ? 1 : 0)
    return count + (value !== '' ? 1 : 0)
  }, 0)
}

function personName(user) {
  if (!user) return '-'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || '-'
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function downloadCsv(rows) {
  const header = EXPORT_HEADERS.map(([, label]) => escapeCsv(label)).join(',')
  const body = rows.map(row => EXPORT_HEADERS.map(([key]) => escapeCsv(row[key])).join(','))
  const csv = [header, ...body].join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ticket-explorer-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function MultiSelectFilter({ id, label, options, value, onChange, openKey, setOpenKey }) {
  const [query, setQuery] = useState('')
  const open = openKey === id
  const selected = new Set((value || []).map(String))
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  )
  const selectedLabels = options
    .filter(option => selected.has(String(option.value)))
    .map(option => option.label)

  const summary = value.length === 0
    ? `All ${label}`
    : selectedLabels.length > 0 && selectedLabels.length <= 2
      ? selectedLabels.join(', ')
      : `${value.length} selected`

  const toggle = (rawValue) => {
    const itemValue = String(rawValue)
    const next = selected.has(itemValue)
      ? value.filter(v => String(v) !== itemValue)
      : [...value, itemValue]
    onChange(next)
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpenKey(open ? null : id)}
        className={cn(
          'input flex h-9 items-center justify-between gap-2 px-2 text-left',
          selected.size && 'border-primary-300 bg-primary-50/60 dark:bg-primary-900/10'
        )}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase text-gray-400">{label}</span>
          <span className="block truncate text-xs text-gray-800 dark:text-gray-100">{summary}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="input h-8 pl-7 text-xs"
                placeholder={`Search ${label.toLowerCase()}`}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
            <span className="text-xs text-gray-400">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Clear
            </button>
          </div>
          <div className="mt-1 max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-5 text-center text-xs text-gray-400">No options</div>
            ) : filteredOptions.map(option => (
              <label
                key={`${id}-${option.value}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={selected.has(String(option.value))}
                  onChange={() => toggle(option.value)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{option.label}</span>
                {option.meta && <span className="shrink-0 text-[10px] text-gray-400">{option.meta}</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TriStateSelect({ label, value, onChange, yesLabel, noLabel }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="input h-9 text-xs">
        <option value="">Any</option>
        <option value="true">{yesLabel}</option>
        <option value="false">{noLabel}</option>
      </select>
    </label>
  )
}

function DateRangeFilter({ label, fromValue, toValue, onFromChange, onToChange }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={fromValue} onChange={e => onFromChange(e.target.value)} className="input h-9 text-xs" />
        <input type="date" value={toValue} onChange={e => onToChange(e.target.value)} className="input h-9 text-xs" />
      </div>
    </div>
  )
}

function NumberRangeFilter({ label, minValue, maxValue, onMinChange, onMaxChange }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          value={minValue}
          onChange={e => onMinChange(e.target.value)}
          placeholder="Min"
          className="input h-9 text-xs"
        />
        <input
          type="number"
          min="0"
          value={maxValue}
          onChange={e => onMaxChange(e.target.value)}
          placeholder="Max"
          className="input h-9 text-xs"
        />
      </div>
    </div>
  )
}

function ColumnPicker({ columns, visibleColumns, onChange, open, setOpen }) {
  const visible = new Set(visibleColumns)
  const toggle = (key) => {
    if (visible.has(key) && visibleColumns.length === 1) return
    onChange(visible.has(key)
      ? visibleColumns.filter(column => column !== key)
      : [...visibleColumns, key])
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-secondary h-9 px-3 text-xs">
        <Columns3 className="h-4 w-4" />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Visible columns</span>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {columns.map(column => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={visible.has(column.key)}
                  onChange={() => toggle(column.key)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-200">{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SaveFilterDialog({ onClose, onSave, saving }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shared, setShared] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), shared })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={event => event.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Save Filter</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
            <input value={name} onChange={e => setName(e.target.value)} className="input" autoFocus />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input min-h-[80px]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={shared}
              onChange={e => setShared(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Shared with Admins and Managers
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

export default function TicketExplorer() {
  const { user } = useSelector(state => state.auth)
  const managerUser = isManager(user)
  const queryClient = useQueryClient()
  const appliedDefaultRef = useRef(false)

  const [filters, setFilters] = useState(() => createEmptyFilters())
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(50)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [showFilters, setShowFilters] = useState(true)
  const [openFilter, setOpenFilter] = useState(null)
  const [showColumns, setShowColumns] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [selectedFilterId, setSelectedFilterId] = useState('')
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS)

  const { data: options = {}, isLoading: loadingOptions } = useQuery({
    queryKey: ['ticket-explorer-options'],
    queryFn: ticketService.getExplorerOptions,
    enabled: managerUser,
    staleTime: 60000,
  })

  const { data: savedFilters = [] } = useQuery({
    queryKey: ['ticket-filters'],
    queryFn: ticketFilterService.getAll,
    enabled: managerUser,
  })

  const selectedFilter = useMemo(
    () => savedFilters.find(item => String(item.id) === String(selectedFilterId)),
    [savedFilters, selectedFilterId]
  )

  const columns = useMemo(() => [
    {
      key: 'ticketNumber',
      label: 'Ticket #',
      sortKey: 'ticketNumber',
      className: 'w-[96px]',
      render: ticket => (
        <Link to={`/tickets/${ticket.id}`} className="font-mono text-[11px] font-semibold text-primary-600 hover:underline">
          {ticket.ticketNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortKey: 'title',
      className: 'min-w-[260px]',
      render: ticket => (
        <Link to={`/tickets/${ticket.id}`} className="block truncate font-medium text-gray-900 hover:text-primary-600 dark:text-white">
          {ticket.title}
        </Link>
      ),
    },
    {
      key: 'projectName',
      label: 'Project',
      className: 'min-w-[160px]',
      render: ticket => (
        <Link to={`/projects/${ticket.projectId}`} className="text-xs font-medium text-primary-600 hover:underline">
          {ticket.projectName}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortKey: 'status',
      className: 'w-[126px]',
      render: ticket => {
        const status = getStatusConfig(ticket.status)
        return <span className={cn('badge text-[11px]', status.className)}>{status.label}</span>
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      sortKey: 'priority',
      className: 'w-[106px]',
      render: ticket => {
        const priority = getPriorityConfig(ticket.priority)
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <span className={cn('h-2 w-2 rounded-full', priority.dot)} />
            {priority.label}
          </span>
        )
      },
    },
    {
      key: 'type',
      label: 'Type',
      sortKey: 'type',
      className: 'w-[116px]',
      render: ticket => <span className="text-xs text-gray-700 dark:text-gray-300">{getTypeConfig(ticket.type).label}</span>,
    },
    {
      key: 'assignee',
      label: 'Assignee',
      className: 'min-w-[150px]',
      render: ticket => <span className="text-xs text-gray-600 dark:text-gray-300">{personName(ticket.assignee)}</span>,
    },
    {
      key: 'reporter',
      label: 'Reporter',
      className: 'min-w-[150px]',
      render: ticket => <span className="text-xs text-gray-600 dark:text-gray-300">{personName(ticket.reporter)}</span>,
    },
    {
      key: 'dueDate',
      label: 'Due',
      sortKey: 'dueDate',
      className: 'w-[112px]',
      render: ticket => <span className="text-xs text-gray-600 dark:text-gray-300">{formatDate(ticket.dueDate)}</span>,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortKey: 'updatedAt',
      className: 'w-[118px]',
      render: ticket => <span className="text-xs text-gray-500">{formatDate(ticket.updatedAt, 'MMM d, HH:mm')}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortKey: 'createdAt',
      className: 'w-[118px]',
      render: ticket => <span className="text-xs text-gray-500">{formatDate(ticket.createdAt, 'MMM d, HH:mm')}</span>,
    },
    {
      key: 'resolvedAt',
      label: 'Resolved',
      sortKey: 'resolvedAt',
      className: 'w-[118px]',
      render: ticket => <span className="text-xs text-gray-500">{formatDate(ticket.resolvedAt, 'MMM d, HH:mm')}</span>,
    },
    {
      key: 'estimatedHours',
      label: 'Est.',
      className: 'w-[70px]',
      render: ticket => <span className="text-xs text-gray-600">{ticket.estimatedHours ?? '-'}</span>,
    },
    {
      key: 'actualHours',
      label: 'Actual',
      className: 'w-[76px]',
      render: ticket => <span className="text-xs text-gray-600">{ticket.actualHours ?? '-'}</span>,
    },
    {
      key: 'commentCount',
      label: 'Comments',
      className: 'w-[92px]',
      render: ticket => <span className="text-xs text-gray-600">{ticket.commentCount ?? 0}</span>,
    },
    {
      key: 'attachmentCount',
      label: 'Files',
      className: 'w-[72px]',
      render: ticket => <span className="text-xs text-gray-600">{ticket.attachmentCount ?? 0}</span>,
    },
  ], [])

  const visibleColumnDefs = useMemo(
    () => columns.filter(column => visibleColumns.includes(column.key)),
    [columns, visibleColumns]
  )

  const params = useMemo(
    () => toParams(filters, { page, size, sortBy, sortDir }),
    [filters, page, size, sortBy, sortDir]
  )

  const { data: ticketsData, isFetching } = useQuery({
    queryKey: ['ticket-explorer', params],
    queryFn: () => ticketService.exploreTickets(params),
    enabled: managerUser,
    keepPreviousData: true,
  })

  const saveMutation = useMutation({
    mutationFn: ticketFilterService.create,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['ticket-filters'] })
      setSelectedFilterId(String(data.id))
      setShowSaveDialog(false)
      toast.success('Filter saved')
    },
    onError: () => toast.error('Could not save filter'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ticketFilterService.update(id, data),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['ticket-filters'] })
      setSelectedFilterId(String(data.id))
      toast.success('Filter updated')
    },
    onError: () => toast.error('Could not update filter'),
  })

  const defaultMutation = useMutation({
    mutationFn: ticketFilterService.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-filters'] })
      toast.success('Default filter set')
    },
    onError: () => toast.error('Could not set default filter'),
  })

  const deleteMutation = useMutation({
    mutationFn: ticketFilterService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-filters'] })
      setSelectedFilterId('')
      toast.success('Filter deleted')
    },
    onError: () => toast.error('Could not delete filter'),
  })

  useEffect(() => {
    if (appliedDefaultRef.current || !savedFilters.length) return
    const defaultFilter = savedFilters.find(item => item.defaultFilter)
    if (!defaultFilter) return
    appliedDefaultRef.current = true
    setFilters(normalizeFilters(defaultFilter.filterConfig))
    setVisibleColumns(Array.isArray(defaultFilter.columnConfig) && defaultFilter.columnConfig.length
      ? defaultFilter.columnConfig
      : DEFAULT_COLUMNS)
    setSelectedFilterId(String(defaultFilter.id))
  }, [savedFilters])

  useEffect(() => {
    setPage(0)
  }, [filters, size, sortBy, sortDir])

  if (!managerUser) {
    return <Navigate to="/tickets" replace />
  }

  const setFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
  }

  const applySavedFilter = (filter) => {
    if (!filter) {
      setSelectedFilterId('')
      return
    }
    setSelectedFilterId(String(filter.id))
    setFilters(normalizeFilters(filter.filterConfig))
    setVisibleColumns(Array.isArray(filter.columnConfig) && filter.columnConfig.length
      ? filter.columnConfig
      : DEFAULT_COLUMNS)
    toast.success('Filter applied')
  }

  const clearFilters = () => {
    setFilters(createEmptyFilters())
    setSelectedFilterId('')
    setOpenFilter(null)
  }

  const activeFilterCount = countActiveFilters(filters)
  const tickets = ticketsData?.content || []
  const total = ticketsData?.totalElements || 0
  const totalPages = ticketsData?.totalPages || 0
  const optionDataLoading = loadingOptions && !Object.keys(options).length

  const projectOptions = (options.projects || []).map(project => ({
    value: String(project.id),
    label: `${project.keyPrefix ? `${project.keyPrefix} - ` : ''}${project.name}`,
    meta: project.status,
  }))
  const categoryOptions = (options.categories || []).map(category => ({
    value: String(category.id),
    label: category.name,
  }))
  const userOptions = (options.users || []).map(option => ({
    value: String(option.id),
    label: option.email ? `${option.name} (${option.email})` : option.name,
  }))
  const selectedProjectIds = new Set(filters.projectIds)
  const labelOptions = (options.labels || [])
    .filter(label => !selectedProjectIds.size || !label.projectId || selectedProjectIds.has(String(label.projectId)))
    .map(label => ({ value: String(label.id), label: label.name }))
  const sprintOptions = (options.sprints || [])
    .filter(sprint => !selectedProjectIds.size || !sprint.projectId || selectedProjectIds.has(String(sprint.projectId)))
    .map(sprint => ({ value: String(sprint.id), label: sprint.name, meta: sprint.status }))

  const handleSort = (column) => {
    if (!column.sortKey) return
    if (sortBy === column.sortKey) {
      setSortDir(direction => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column.sortKey)
      setSortDir('asc')
    }
  }

  const exportCurrentView = async () => {
    try {
      const rows = await ticketService.exportExplorerTickets(toParams(filters, { sortBy, sortDir }))
      if (!rows.length) {
        toast.error('No tickets to export')
        return
      }
      downloadCsv(rows)
      toast.success(`Downloaded ${rows.length} ticket${rows.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Export failed')
    }
  }

  const updateSelectedFilter = () => {
    if (!selectedFilter?.editable) return
    updateMutation.mutate({
      id: selectedFilter.id,
      data: {
        filterConfig: filters,
        columnConfig: visibleColumns,
        shared: selectedFilter.shared,
      },
    })
  }

  const deleteSelectedFilter = () => {
    if (!selectedFilter?.editable) return
    if (window.confirm(`Delete "${selectedFilter.name}"?`)) {
      deleteMutation.mutate(selectedFilter.id)
    }
  }

  const saveFilter = ({ name, description, shared }) => {
    saveMutation.mutate({
      name,
      description,
      shared,
      filterConfig: filters,
      columnConfig: visibleColumns,
    })
  }

  return (
    <div className="space-y-3">
      {showSaveDialog && (
        <SaveFilterDialog
          onClose={() => setShowSaveDialog(false)}
          onSave={saveFilter}
          saving={saveMutation.isPending}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Explorer</h1>
          <p className="mt-1 text-sm text-gray-500">Advanced ticket filtering, saved views, and exports</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowFilters(value => !value)} className="btn-secondary h-9 px-3 text-xs">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button type="button" onClick={exportCurrentView} className="btn-primary h-9 px-3 text-xs">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFilterId}
            onChange={event => {
              const value = event.target.value
              const filter = savedFilters.find(item => String(item.id) === String(value))
              value ? applySavedFilter(filter) : setSelectedFilterId('')
            }}
            className="input h-9 w-full text-xs sm:w-72"
          >
            <option value="">Unsaved view</option>
            {savedFilters.map(filter => (
              <option key={filter.id} value={filter.id}>
                {filter.defaultFilter ? 'Default - ' : ''}{filter.name}{filter.shared ? ' (shared)' : ''}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => setShowSaveDialog(true)} className="btn-secondary h-9 px-3 text-xs">
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={updateSelectedFilter}
            disabled={!selectedFilter?.editable || updateMutation.isPending}
            className="btn-secondary h-9 px-3 text-xs"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update
          </button>
          <button
            type="button"
            onClick={() => selectedFilter?.editable && defaultMutation.mutate(selectedFilter.id)}
            disabled={!selectedFilter?.editable || defaultMutation.isPending}
            className="btn-secondary h-9 px-3 text-xs"
          >
            <Star className="h-4 w-4" />
            Default
          </button>
          <button
            type="button"
            onClick={deleteSelectedFilter}
            disabled={!selectedFilter?.editable || deleteMutation.isPending}
            className="btn-secondary h-9 px-3 text-xs text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ColumnPicker
              columns={columns}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
              open={showColumns}
              setOpen={setShowColumns}
            />
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
              className="btn-ghost h-9 px-3 text-xs"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="grid gap-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={filters.search}
                  onChange={event => setFilter('search', event.target.value)}
                  className="input h-9 pl-8 text-xs"
                  placeholder="Search ticket number, title, or description"
                />
              </div>
              <MultiSelectFilter id="projects" label="Projects" options={projectOptions} value={filters.projectIds} onChange={value => setFilter('projectIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="categories" label="Categories" options={categoryOptions} value={filters.categoryIds} onChange={value => setFilter('categoryIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="project-statuses" label="Project Status" options={PROJECT_STATUSES} value={filters.projectStatuses} onChange={value => setFilter('projectStatuses', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="statuses" label="Ticket Status" options={TICKET_STATUSES} value={filters.statuses} onChange={value => setFilter('statuses', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="priorities" label="Priority" options={TICKET_PRIORITIES} value={filters.priorities} onChange={value => setFilter('priorities', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <MultiSelectFilter id="types" label="Type" options={TICKET_TYPES.map(({ value, label }) => ({ value, label }))} value={filters.types} onChange={value => setFilter('types', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="assignees" label="Assignees" options={userOptions} value={filters.assigneeIds} onChange={value => setFilter('assigneeIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="reporters" label="Reporters" options={userOptions} value={filters.reporterIds} onChange={value => setFilter('reporterIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="labels" label="Labels" options={labelOptions} value={filters.labelIds} onChange={value => setFilter('labelIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <MultiSelectFilter id="sprints" label="Sprints" options={sprintOptions} value={filters.sprintIds} onChange={value => setFilter('sprintIds', value)} openKey={openFilter} setOpenKey={setOpenFilter} />
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 px-2 py-2 dark:border-gray-700">
                {[
                  ['backlog', 'Backlog'],
                  ['overdue', 'Overdue'],
                  ['unassigned', 'Unassigned'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={filters[key]}
                      onChange={event => setFilter(key, event.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <TriStateSelect label="Attachments" value={filters.hasAttachments} onChange={value => setFilter('hasAttachments', value)} yesLabel="Has attachments" noLabel="No attachments" />
              <TriStateSelect label="Comments" value={filters.hasComments} onChange={value => setFilter('hasComments', value)} yesLabel="Has comments" noLabel="No comments" />
              <TriStateSelect label="Commits" value={filters.hasCommits} onChange={value => setFilter('hasCommits', value)} yesLabel="Has commits" noLabel="No commits" />
              <NumberRangeFilter label="Estimated hours" minValue={filters.estimatedMin} maxValue={filters.estimatedMax} onMinChange={value => setFilter('estimatedMin', value)} onMaxChange={value => setFilter('estimatedMax', value)} />
              <NumberRangeFilter label="Actual hours" minValue={filters.actualMin} maxValue={filters.actualMax} onMinChange={value => setFilter('actualMin', value)} onMaxChange={value => setFilter('actualMax', value)} />
              <div className="flex items-end">
                {optionDataLoading ? (
                  <div className="flex h-9 items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading options
                  </div>
                ) : (
                  <div className="flex h-9 items-center gap-2 text-xs text-gray-500">
                    <Filter className="h-4 w-4 text-gray-400" />
                    {activeFilterCount} active
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <DateRangeFilter label="Due date" fromValue={filters.dueFrom} toValue={filters.dueTo} onFromChange={value => setFilter('dueFrom', value)} onToChange={value => setFilter('dueTo', value)} />
              <DateRangeFilter label="Created date" fromValue={filters.createdFrom} toValue={filters.createdTo} onFromChange={value => setFilter('createdFrom', value)} onToChange={value => setFilter('createdTo', value)} />
              <DateRangeFilter label="Updated date" fromValue={filters.updatedFrom} toValue={filters.updatedTo} onFromChange={value => setFilter('updatedFrom', value)} onToChange={value => setFilter('updatedTo', value)} />
              <DateRangeFilter label="Resolved date" fromValue={filters.resolvedFrom} toValue={filters.resolvedTo} onFromChange={value => setFilter('resolvedFrom', value)} onToChange={value => setFilter('resolvedTo', value)} />
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total.toLocaleString()} tickets</span>
            <span>Page {totalPages ? page + 1 : 0} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rows</span>
            <select
              value={size}
              onChange={event => setSize(Number(event.target.value))}
              className="input h-8 w-20 text-xs"
            >
              {[25, 50, 100, 200].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        <div className="max-h-[calc(100vh-330px)] min-h-[360px] overflow-auto">
          <table className="min-w-full table-auto text-left text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {visibleColumnDefs.map(column => (
                  <th key={column.key} className={cn('px-2 py-2 font-semibold uppercase tracking-wide text-gray-500', column.className)}>
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className={cn('flex max-w-full items-center gap-1 truncate', column.sortKey && 'hover:text-gray-900 dark:hover:text-white')}
                      disabled={!column.sortKey}
                    >
                      <span className="truncate">{column.label}</span>
                      {sortBy === column.sortKey && (
                        <span className="text-[10px]">{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isFetching && tickets.length === 0 ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={index}>
                    {visibleColumnDefs.map(column => (
                      <td key={column.key} className="px-2 py-2">
                        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnDefs.length} className="py-16 text-center">
                    <p className="text-sm font-medium text-gray-500">No tickets found</p>
                    {activeFilterCount > 0 && (
                      <button type="button" onClick={clearFilters} className="mt-2 text-xs font-medium text-primary-600 hover:underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {visibleColumnDefs.map(column => (
                    <td key={column.key} className={cn('truncate px-2 py-2 align-middle', column.className)}>
                      {column.render(ticket)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            Showing {tickets.length ? page * size + 1 : 0}-{Math.min((page + 1) * size, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(0, current - 1))}
              disabled={ticketsData?.first || page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(current => current + 1)}
              disabled={ticketsData?.last || totalPages === 0}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
