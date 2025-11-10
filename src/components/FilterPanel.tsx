import { useState, useEffect } from 'react'
import { useFilterStore } from '../stores/filter'
import api from '../services/api'

interface Dictionary {
  value: string
  label: string
}

interface FilterPanelProps {
  variant?: 'sidebar' | 'toolbar'
  className?: string
}

export default function FilterPanel({ variant = 'sidebar', className }: FilterPanelProps) {
  const filter = useFilterStore()
  const [dictionaries, setDictionaries] = useState<{
    status?: Dictionary[]
    priority?: Dictionary[]
    category?: Dictionary[]
    source?: Dictionary[]
  } | null>(null)
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([])
  const [showAdvanced, setShowAdvanced] = useState(variant === 'toolbar' ? false : true)

  useEffect(() => {
    api.get('/settings/dictionaries/')
      .then((res) => {
        setDictionaries(res.data)
      })
      .catch((err) => {
        console.error('Failed to load dictionaries:', err)
      })

    api.get('/users/')
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setUsers(res.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load users:', err)
      })
  }, [])

  const handleStatusChange = (value: string, checked: boolean) => {
    if (checked) {
      filter.setStatus([...filter.status, value])
    } else {
      filter.setStatus(filter.status.filter((s) => s !== value))
    }
  }

  const handlePriorityChange = (value: string, checked: boolean) => {
    if (checked) {
      filter.setPriority([...filter.priority, value])
    } else {
      filter.setPriority(filter.priority.filter((p) => p !== value))
    }
  }

  const handleCategoryChange = (value: string, checked: boolean) => {
    if (checked) {
      filter.setCategory([...filter.category, value])
    } else {
      filter.setCategory(filter.category.filter((c) => c !== value))
    }
  }

  const handleSourceChange = (value: string, checked: boolean) => {
    if (checked) {
      filter.setSource([...filter.source, value])
    } else {
      filter.setSource(filter.source.filter((s) => s !== value))
    }
  }

  const renderCheckboxGrid = (
    items: Dictionary[] | undefined,
    checkedValues: string[],
    onChange: (value: string, checked: boolean) => void,
  ) => {
    if (!items) return null
    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <label
            key={item.value}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:border-primary-300 hover:bg-primary-50/40 transition"
          >
            <span className="text-sm text-gray-700 pr-3">{item.label}</span>
            <input
              type="checkbox"
              checked={checkedValues.includes(item.value)}
              onChange={(e) => onChange(item.value, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        ))}
      </div>
    )
  }

  const renderChipGroup = (
    items: Dictionary[] | undefined,
    checkedValues: string[],
    onChange: (value: string, checked: boolean) => void,
  ) => {
    if (!items) return null
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = checkedValues.includes(item.value)
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value, !isActive)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'toolbar') {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-card ${className || ''}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">搜尋</label>
            <input
              type="text"
              value={filter.search || ''}
              onChange={(e) => filter.setSearch(e.target.value)}
              placeholder="輸入關鍵字..."
              className="w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary-400 focus:ring-primary-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">日期</label>
            <input
              type="date"
              value={filter.dateFrom || ''}
              onChange={(e) => filter.setDateRange(e.target.value, filter.dateTo)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary-400 focus:ring-primary-300"
            />
            <span className="text-xs text-gray-400">至</span>
            <input
              type="date"
              value={filter.dateTo || ''}
              onChange={(e) => filter.setDateRange(filter.dateFrom, e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary-400 focus:ring-primary-300"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => filter.reset()}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              清除
            </button>
            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600"
            >
              {showAdvanced ? '收合' : '更多條件'}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">狀態</div>
              {renderChipGroup(dictionaries?.status, filter.status, handleStatusChange)}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">優先級</div>
              {renderChipGroup(dictionaries?.priority, filter.priority, handlePriorityChange)}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">類別</div>
                {renderChipGroup(dictionaries?.category, filter.category, handleCategoryChange)}
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">來源</div>
                {renderChipGroup(dictionaries?.source, filter.source, handleSourceChange)}
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">負責人</div>
                <select
                  value={filter.assigneeId || ''}
                  onChange={(e) => filter.setAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary-400 focus:ring-primary-300"
                >
                  <option value="">全部</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800">篩選器</h3>
            <p className="mt-1 text-xs text-gray-500">調整條件以縮小結果</p>
          </div>
          <button
            onClick={() => filter.reset()}
            className="text-xs font-medium text-primary-600 hover:text-primary-800"
          >
            清除
          </button>
        </div>

        <div className="space-y-5 text-sm text-gray-700">
          <div className="space-y-2">
            <label className="font-medium text-gray-600">搜尋</label>
            <input
              type="text"
              value={filter.search || ''}
              onChange={(e) => filter.setSearch(e.target.value)}
              placeholder="輸入關鍵字..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-inner focus:border-primary-400 focus:ring-primary-300"
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">日期區間</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filter.dateFrom || ''}
                onChange={(e) => filter.setDateRange(e.target.value, filter.dateTo)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-inner focus:border-primary-400 focus:ring-primary-300"
              />
              <input
                type="date"
                value={filter.dateTo || ''}
                onChange={(e) => filter.setDateRange(filter.dateFrom, e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-inner focus:border-primary-400 focus:ring-primary-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">狀態</label>
            {renderCheckboxGrid(dictionaries?.status, filter.status, handleStatusChange)}
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">優先級</label>
            {renderCheckboxGrid(dictionaries?.priority, filter.priority, handlePriorityChange)}
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">類別</label>
            {renderCheckboxGrid(dictionaries?.category, filter.category, handleCategoryChange)}
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">來源</label>
            {renderCheckboxGrid(dictionaries?.source, filter.source, handleSourceChange)}
          </div>

          <div className="space-y-2">
            <label className="font-medium text-gray-600">負責人</label>
            <select
              value={filter.assigneeId || ''}
              onChange={(e) => filter.setAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-inner focus:border-primary-400 focus:ring-primary-300"
            >
              <option value="">全部</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

