import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { issuesApi, Issue, IssueListParams, WarrantyStatus } from '../services/issues'
import { useFilterStore } from '../stores/filter'
import IssueForm from '../components/IssueForm'
import FilterPanel from '../components/FilterPanel'
import KanbanBoard from '../features/kanban/KanbanBoard'
import { getWarrantyStatus } from '../utils/warranty'

type ViewMode = 'list' | 'kanban'

type SortField = 'id' | 'title' | 'status' | 'priority' | 'category' | 'created_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'

export default function Issues() {
  const navigate = useNavigate()
  const filter = useFilterStore()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [viewMode] = useState<ViewMode>('list')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [sortField, setSortField] = useState<SortField | null>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Record<number, Issue | undefined>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null)

  useEffect(() => {
    loadIssues()
  }, [page, filter.status, filter.priority, filter.category, filter.source, filter.assigneeId, filter.search, filter.dateFrom, filter.dateTo, sortField, sortOrder])
  
  // URL 參數同步（深連結支援）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    // 從 URL 讀取篩選參數
    if (params.get('status')) {
      filter.setStatus(params.get('status')!.split(','))
    }
    if (params.get('priority')) {
      filter.setPriority(params.get('priority')!.split(','))
    }
    if (params.get('category')) {
      filter.setCategory(params.get('category')!.split(','))
    }
    if (params.get('source')) {
      filter.setSource(params.get('source')!.split(','))
    }
    if (params.get('assignee_id')) {
      filter.setAssigneeId(Number(params.get('assignee_id')))
    }
    if (params.get('from')) {
      filter.setDateRange(params.get('from')!, filter.dateTo)
    }
    if (params.get('to')) {
      filter.setDateRange(filter.dateFrom, params.get('to')!)
    }
    if (params.get('q')) {
      filter.setSearch(params.get('q')!)
    }
    if (params.get('page')) {
      setPage(Number(params.get('page')))
    }
    if (params.get('ordering')) {
      const ordering = params.get('ordering')!
      if (ordering.startsWith('-')) {
        setSortField(ordering.slice(1) as SortField)
        setSortOrder('desc')
      } else {
        setSortField(ordering as SortField)
        setSortOrder('asc')
      }
    }
  }, [])
  
  // 同步篩選參數到 URL
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (filter.status.length > 0) {
      params.set('status', filter.status.join(','))
    }
    if (filter.priority.length > 0) {
      params.set('priority', filter.priority.join(','))
    }
    if (filter.category.length > 0) {
      params.set('category', filter.category.join(','))
    }
    if (filter.source.length > 0) {
      params.set('source', filter.source.join(','))
    }
    if (filter.assigneeId) {
      params.set('assignee_id', String(filter.assigneeId))
    }
    if (filter.dateFrom) {
      params.set('from', filter.dateFrom)
    }
    if (filter.dateTo) {
      params.set('to', filter.dateTo)
    }
    if (filter.search) {
      params.set('q', filter.search)
    }
    if (page > 1) {
      params.set('page', String(page))
    }
    if (sortField) {
      params.set('ordering', sortOrder === 'desc' ? `-${sortField}` : sortField)
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [filter, page, sortField, sortOrder])

  const loadIssues = async () => {
    setLoading(true)
    try {
        const params: IssueListParams = {
          page,
          page_size: 10,
      }

      // 應用篩選條件
      if (filter.status.length > 0) {
        params.status = filter.status
      }
      if (filter.priority.length > 0) {
        params.priority = filter.priority
      }
      if (filter.category.length > 0) {
        params.category = filter.category
      }
      if (filter.source.length > 0) {
        params.source = filter.source
      }
      if (filter.assigneeId) {
        params.assignee_id = filter.assigneeId
      }
      if (filter.search) {
        params.q = filter.search
      }
      if (filter.dateFrom) {
        params.from = filter.dateFrom
      }
      if (filter.dateTo) {
        params.to = filter.dateTo
      }
      
      // 排序參數
      if (sortField) {
        params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField
      }

      const res = await issuesApi.list(params)
      setIssues(res.data.results)
      setTotal(res.data.count)
    } catch (error) {
      console.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIssue = async (id: number) => {
    if (!confirm('確定要刪除這筆 Issue 嗎？')) return

    try {
      await issuesApi.delete(id)
      setSelectedIds((prev) => prev.filter((issueId) => issueId !== id))
      loadIssues()
    } catch (error: any) {
      console.error('Failed to delete issue:', error)
      alert('刪除失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 切換排序順序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 新欄位，預設降序
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleIssueDetail = async (issueId: number) => {
    if (expandedIssue === issueId) {
      setExpandedIssue(null)
      return
    }

    if (!expandedDetails[issueId]) {
      setLoadingDetailId(issueId)
      try {
        const res = await issuesApi.get(issueId)
        setExpandedDetails((prev) => ({ ...prev, [issueId]: res.data }))
      } catch (error) {
        console.error('Failed to load issue detail:', error)
      } finally {
        setLoadingDetailId(null)
      }
    }

    setExpandedIssue(issueId)
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(issues.map(issue => issue.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
    }
  }
  
  const handleBatchUpdate = async (field: 'status' | 'assignee', value: string | number) => {
    if (selectedIds.length === 0) {
      alert('請先選擇要更新的 Issue')
      return
    }
    
    try {
      const data = field === 'status' 
        ? { status: value as string }
        : { assignee_id: value as number }
      
      const response = await issuesApi.batchUpdate(selectedIds, data)
      
      if (response.data.success) {
        alert(`批次更新成功！已更新 ${response.data.updated_count} 筆`)
        setSelectedIds([])
        loadIssues()
      }
    } catch (error: any) {
      console.error('Failed to batch update:', error)
      alert('批次更新失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    if (sortOrder === 'asc') {
      return (
        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  type WarrantyStatusLike = Pick<WarrantyStatus, 'state' | 'color'> | ReturnType<typeof getWarrantyStatus> | undefined | null

  const getWarrantyBadge = (status: WarrantyStatusLike) => {
    const state = status?.state
    if (state === 'expired') {
      return { label: '已過保', className: 'bg-danger-100 text-danger-700' }
    }
    if (state === 'none' || !state) {
      return { label: '未設定', className: 'bg-gray-100 text-gray-600' }
    }
    if (state === 'expiring') {
      return { label: '保固中', className: 'bg-warning-100 text-warning-700' }
    }
    return { label: '保固中', className: 'bg-success-100 text-success-700' }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Issues</h2>
          <p className="mt-1 text-sm text-gray-500">檢視並管理所有問題</p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilterDrawer(true)}
            className="btn-secondary lg:hidden"
          >
            篩選
          </button>
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
              <span className="text-sm text-primary-700 font-medium">
                已選擇 {selectedIds.length} 筆
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchUpdate('status', e.target.value)
                    e.target.value = ''
                  }
                }}
                className="text-sm border border-primary-300 rounded px-2 py-1 bg-white"
              >
                <option value="">批次變更狀態</option>
                <option value="Open">待處理</option>
                <option value="In Progress">處理中</option>
                <option value="Closed">已完成</option>
                <option value="Pending">暫停</option>
              </select>
              <button
                onClick={() => {
                  const assigneeId = prompt('請輸入負責人 ID（或留空取消）')
                  if (assigneeId) {
                    handleBatchUpdate('assignee', Number(assigneeId))
                  }
                }}
                className="text-sm btn-secondary px-2 py-1"
              >
                批次指派
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowForm(true)}
            className="btn-success"
          >
            + 新增 Issue
          </button>
        </div>
      </div>

      <FilterPanel variant="toolbar" />

      {viewMode === 'kanban' ? (
        <KanbanBoard />
      ) : (
        <>
          {loading ? (
            <div className="text-center py-12">載入中...</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="min-w-full table-auto divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-sm font-medium text-gray-500 tracking-wide">
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === issues.length && issues.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center space-x-1 text-gray-600">
                            <span>客戶</span>
                            {getSortIcon('title')}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center justify-center space-x-1 text-gray-600">
                            <span>狀態</span>
                            {getSortIcon('status')}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('priority')}
                        >
                          <div className="flex items-center justify-center space-x-1 text-gray-600">
                            <span>優先級</span>
                            {getSortIcon('priority')}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center justify-center space-x-1 text-gray-600">
                            <span>類別</span>
                            {getSortIcon('category')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-gray-600 font-normal">負責人</th>
                        <th className="px-4 py-3 text-left text-gray-600 font-normal">保固狀態</th>
                        <th
                          className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center justify-center space-x-1 text-gray-600">
                            <span>建立時間</span>
                            {getSortIcon('created_at')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-gray-600 font-normal">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                              {issues.map((issue) => {
                                const hardwareStatus =
                                  issue.hardware_warranty_status ||
                                  (issue.customer_warranty_due ? getWarrantyStatus(issue.customer_warranty_due) : undefined)
                                const softwareStatus = issue.software_warranty_status
                                const hardwareBadge = getWarrantyBadge(hardwareStatus)
                                const softwareBadge = getWarrantyBadge(softwareStatus)
                                const rowBadgeState = hardwareStatus?.state || softwareStatus?.state
                                const isSelected = selectedIds.includes(issue.id)
                                const rowClass = isSelected
                                  ? 'bg-primary-50'
                                  : rowBadgeState === 'expired'
                                    ? 'bg-danger-50 hover:bg-danger-100'
                                    : rowBadgeState === 'expiring'
                                      ? 'bg-warning-50 hover:bg-warning-100'
                                      : 'hover:bg-gray-50'
                                const createdDate = new Date(issue.created_at).toLocaleDateString('zh-TW')

                return (
                  <Fragment key={issue.id}>
                    <tr
                      className={`transition-colors ${rowClass}`}
                    >
                      <td className="px-3 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(issue.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-gray-900">
                        <div className="font-medium text-base leading-snug truncate">{issue.customer_name || issue.title || '-'}</div>
                        {issue.project_name && (
                          <div className="mt-0.5 text-xs text-gray-500 leading-snug truncate" title={issue.project_name}>
                            {issue.project_name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {issue.status === 'Open' && <span className="status-open">待處理</span>}
                        {issue.status === 'In Progress' && <span className="status-in-progress">處理中</span>}
                        {issue.status === 'Closed' && <span className="status-closed">已完成</span>}
                        {issue.status === 'Pending' && <span className="status-pending">暫停</span>}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {issue.priority === 'High' && <span className="priority-high">高</span>}
                        {issue.priority === 'Medium' && <span className="priority-medium">中</span>}
                        {issue.priority === 'Low' && <span className="priority-low">低</span>}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-sm text-gray-600">
                        <span className="inline-block max-w-[6rem] truncate" title={issue.category}>
                          {issue.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-sm text-gray-600">
                        {issue.assignee_name || '-'}
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-gray-700">
                        <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-2">
                          <span className="text-xs text-gray-500 text-right pr-1">硬體</span>
                          <span className={`inline-flex min-w-[64px] justify-center items-center rounded-full px-2 py-0.5 text-xs font-medium ${hardwareBadge.className}`}>
                            {hardwareBadge.label}
                          </span>
                          <span className="text-xs text-gray-500 text-right pr-1">軟體</span>
                          <span className={`inline-flex min-w-[64px] justify-center items-center rounded-full px-2 py-0.5 text-xs font-medium ${softwareBadge.className}`}>
                            {softwareBadge.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-sm text-gray-600">
                        {createdDate}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => navigate(`/issues/${issue.id}`)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => toggleIssueDetail(issue.id)}
                            className="text-slate-500 hover:text-slate-700 font-medium"
                          >
                            描述
                          </button>
                          <button
                            onClick={() => handleDeleteIssue(issue.id)}
                            className="text-danger-600 hover:text-danger-800 font-medium"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedIssue === issue.id && (
                      <tr className="bg-primary-50/40">
                        <td colSpan={9} className="px-6 pb-6 pt-3">
                          <div className="rounded-xl border border-primary-100 bg-white shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900">問題描述</h4>
                              {loadingDetailId === issue.id && (
                                <span className="text-xs text-gray-500">載入中...</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {expandedDetails[issue.id]?.description || issue.description || '尚未提供描述'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
                    </tbody>
              </table>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700">
                顯示 {issues.length} / {total} 筆
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  上一頁
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={issues.length < 10}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">新增 Issue</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <IssueForm
                onSuccess={() => {
                  setShowForm(false)
                  loadIssues()
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showFilterDrawer && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setShowFilterDrawer(false)}
          />
          <div className="w-80 max-w-full bg-white shadow-card flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">篩選器</h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

