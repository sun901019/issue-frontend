import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { issuesApi, Issue, WarrantyStatus, IssueRelation } from '../services/issues'
import CommentForm from '../components/CommentForm'
import api from '../services/api'
import IssueForm from '../components/IssueForm'
import { getWarrantyStatus } from '../utils/warranty'

interface Attachment {
  id: number
  filename: string
  file: string
  file_url: string
  file_size: number
  uploaded_by_name?: string
  created_at: string
}

interface IssueDetailData extends Issue {
  subtasks?: any[]
  relations?: any[]
  comments?: any[]
  status_history?: any[]
  attachments_count?: number
}

type IssueStatusValue = Issue['status']
type IssuePriorityValue = Issue['priority']

const STATUS_OPTIONS: Array<{
  value: IssueStatusValue
  label: string
  className: string
  description: string
}> = [
  {
    value: 'Open',
    label: '待處理',
    className: 'status-open',
    description: '尚未開始處理',
  },
  {
    value: 'In Progress',
    label: '處理中',
    className: 'status-in-progress',
    description: '正在處理這個 Issue',
  },
  {
    value: 'Pending',
    label: '暫停',
    className: 'status-pending',
    description: '暫時延後，等待進一步動作',
  },
  {
    value: 'Closed',
    label: '已完成',
    className: 'status-closed',
    description: '已完成並結案',
  },
]

const PRIORITY_OPTIONS: Array<{
  value: IssuePriorityValue
  label: string
  className: string
  description: string
}> = [
  {
    value: 'High',
    label: '高',
    className: 'priority-high',
    description: '需要優先處理的事項',
  },
  {
    value: 'Medium',
    label: '中',
    className: 'priority-medium',
    description: '維持一般處理順序',
  },
  {
    value: 'Low',
    label: '低',
    className: 'priority-low',
    description: '允許延後處理的事項',
  },
]

const RELATION_TYPE_OPTIONS: Array<{
  value: 'relates' | 'duplicates'
  label: string
  description: string
}> = [
  { value: 'relates', label: '相關', description: '兩筆工單之間存在關聯' },
  { value: 'duplicates', label: '重複', description: '新的工單與舊工單內容重複' },
]

const RELATION_TYPE_LABEL: Record<'relates' | 'duplicates', string> = {
  relates: '相關',
  duplicates: '重複',
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<IssueDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCommentBody, setEditingCommentBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [activePicker, setActivePicker] = useState<'status' | 'priority' | null>(null)
  const [updatingField, setUpdatingField] = useState<'status' | 'priority' | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const [showRelationForm, setShowRelationForm] = useState(false)
  const [relationType, setRelationType] = useState<'relates' | 'duplicates'>('relates')
  const [relatedIssueId, setRelatedIssueId] = useState('')
  const [relationError, setRelationError] = useState('')
  const [relationSearching, setRelationSearching] = useState(false)
  const [relationSearchTerm, setRelationSearchTerm] = useState('')
  const [relationSearchResults, setRelationSearchResults] = useState<Issue[]>([])

  useEffect(() => {
    if (id) {
      loadIssue()
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setActivePicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadIssue = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await issuesApi.get(Number(id))
      setIssue(res.data)
      
      // 載入附件
      if (id) {
        try {
          const attRes = await issuesApi.getAttachments(Number(id))
          setAttachments(attRes.data)
        } catch (err) {
          console.error('Failed to load attachments:', err)
        }
      }
    } catch (err: any) {
      console.error('Failed to load issue:', err)
      setError('載入 Issue 失敗')
    } finally {
      setLoading(false)
    }
  }
  
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    
    setUploading(true)
    try {
      const res = await issuesApi.uploadAttachment(Number(id), file)
      setAttachments([...attachments, res.data])
      alert('附件上傳成功')
    } catch (error: any) {
      console.error('Failed to upload attachment:', error)
      alert('上傳失敗：' + (error.response?.data?.error || '未知錯誤'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!id || !confirm('確定要刪除此附件嗎？')) return
    
    try {
      await issuesApi.deleteAttachment(Number(id), attachmentId)
      setAttachments(attachments.filter(att => att.id !== attachmentId))
      alert('附件刪除成功')
    } catch (error: any) {
      console.error('Failed to delete attachment:', error)
      alert('刪除失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleAddComment = async (body: string) => {
    if (!id) return
    
    try {
      await api.post(`/issues/${id}/comments/`, { body })
      setShowCommentForm(false)
      await loadIssue() // 重新載入 Issue 以取得最新評論
    } catch (error) {
      throw error
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!id) return
    if (!confirm('確定要刪除此紀錄嗎？')) return

    try {
      await api.delete(`/issues/${id}/comments/${commentId}/`)
      if (editingCommentId === commentId) {
        setEditingCommentId(null)
        setEditingCommentBody('')
      }
      await loadIssue()
    } catch (error: any) {
      console.error('Failed to delete comment:', error)
      alert('刪除失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleSaveComment = async () => {
    if (!id || editingCommentId === null) return
    const trimmed = editingCommentBody.trim()
    if (!trimmed) {
      alert('內容不可為空白')
      return
    }
    try {
      await api.put(`/issues/${id}/comments/${editingCommentId}/`, { body: trimmed })
      setEditingCommentId(null)
      setEditingCommentBody('')
      await loadIssue()
    } catch (error: any) {
      console.error('Failed to update comment:', error)
      alert('更新失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleStartEditComment = (comment: any) => {
    setEditingCommentId(comment.id)
    setEditingCommentBody(comment.body || '')
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentBody('')
  }

  const handleCreateRelation = async () => {
    if (!id) return
    if (!relatedIssueId.trim()) {
      setRelationError('請輸入關聯工單 ID')
      return
    }
    setRelationError('')
    setRelationSearching(true)
    try {
      await issuesApi.createRelation(Number(id), {
        related_issue: Number(relatedIssueId.trim()),
        relation_type: relationType,
      })
      setShowRelationForm(false)
      setRelatedIssueId('')
      setRelationSearchTerm('')
      setRelationSearchResults([])
      await loadIssue()
    } catch (error: any) {
      console.error('Failed to create relation:', error)
      setRelationError(error.response?.data?.error || '建立關聯失敗，請確認工單 ID 是否正確')
    } finally {
      setRelationSearching(false)
    }
  }

  const handleDeleteRelation = async (relationId: number) => {
    if (!id) return
    if (!confirm('確定要移除此關聯嗎？')) return
    try {
      await issuesApi.deleteRelation(Number(id), relationId)
      await loadIssue()
    } catch (error: any) {
      console.error('Failed to delete relation:', error)
      alert('移除失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleSearchRelations = async () => {
    if (!relationSearchTerm.trim()) {
      setRelationSearchResults([])
      return
    }
    if (!id) return
    setRelationSearching(true)
    try {
      const res = await issuesApi.list({ q: relationSearchTerm.trim(), page_size: 5 })
      setRelationSearchResults(res.data.results.filter((item) => item.id !== Number(id)))
    } catch (error) {
      console.error('Failed to search issues:', error)
    } finally {
      setRelationSearching(false)
    }
  }

  const handleQuickUpdate = async (
    field: 'status' | 'priority',
    value: IssueStatusValue | IssuePriorityValue
  ) => {
    if (!issue) return

    if (field === 'status' && value === issue.status) {
      setActivePicker(null)
      return
    }
    if (field === 'priority' && value === issue.priority) {
      setActivePicker(null)
      return
    }

    setUpdatingField(field)
    try {
      if (field === 'status') {
        const res = await issuesApi.updateStatus(issue.id, value as IssueStatusValue)
        setIssue((prev) => (prev ? ({ ...prev, ...res.data } as IssueDetailData) : prev))
      } else {
        const payload = { priority: value as IssuePriorityValue }
        const res = await issuesApi.update(issue.id, payload)
        setIssue((prev) => (prev ? ({ ...prev, ...res.data } as IssueDetailData) : prev))
      }
      setActivePicker(null)
    } catch (error: any) {
      console.error('Failed to update issue quickly:', error)
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '更新失敗，請稍後再試'
      alert(message)
    } finally {
      setUpdatingField(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error || 'Issue 不存在'}</div>
        <button
          onClick={() => navigate('/issues')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          返回列表
        </button>
      </div>
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

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('zh-TW')
  }

  const getStatusBadgeClass = (status?: WarrantyStatus) => {
    if (!status) return 'bg-gray-100 text-gray-600'
    switch (status.color) {
      case 'success':
        return 'bg-success-100 text-success-700'
      case 'warning':
        return 'bg-warning-100 text-warning-700'
      case 'danger':
        return 'bg-danger-100 text-danger-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getWarrantyLabel = (status?: WarrantyStatus) => {
    if (!status || status.state === 'none') return '未設定'
    return status.state === 'expired' ? '已過保' : '保固中'
  }

  const hardwareStatus =
    issue.hardware_warranty_status ||
    (issue.customer_warranty_due ? getWarrantyStatus(issue.customer_warranty_due) : undefined)
  const softwareStatus = issue.software_warranty_status
  const hardwareBadge = getWarrantyBadge(hardwareStatus)
  const softwareBadge = getWarrantyBadge(softwareStatus)
  const currentStatusOption = STATUS_OPTIONS.find((item) => item.value === issue.status)
  const currentPriorityOption = PRIORITY_OPTIONS.find((item) => item.value === issue.priority)

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/issues')}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-primary-50/60 to-white px-6 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-primary-100 blur-3xl opacity-60" />
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 relative">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-primary-600 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7" />
                </svg>
                {issue.customer_name || '未指定客戶'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-gray-500 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h6" />
                </svg>
                ID {issue.id}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 tracking-tight">{issue.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {currentStatusOption && (
                <span className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-sm font-medium shadow-sm ${currentStatusOption.className}`}>
                  <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  </svg>
                  {currentStatusOption.label}
                </span>
              )}
              {currentPriorityOption && (
                <span className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-sm font-medium shadow-sm ${currentPriorityOption.className}`}>
                  <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6l3 6h-6l3 6" />
                  </svg>
                  優先級 {currentPriorityOption.label}
                </span>
              )}
              <span className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-sm font-medium shadow-sm ${hardwareBadge.className}`}>
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M9 7v-2a3 3 0 016 0v2" />
                </svg>
                硬體 {hardwareBadge.label}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-sm font-medium shadow-sm ${softwareBadge.className}`}>
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 11-4 0M6 10v10h12V10" />
                </svg>
                軟體 {softwareBadge.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 shadow-sm transition-colors hover:bg-primary-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編輯
            </button>
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-right text-xs text-gray-500 shadow-sm">
              <div>建立於 {new Date(issue.created_at).toLocaleString('zh-TW')}</div>
              <div>更新於 {new Date(issue.updated_at).toLocaleString('zh-TW')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">編輯 Issue</h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <IssueForm
                issue={issue as Issue}
                onSuccess={() => {
                  setShowEditForm(false)
                  loadIssue() // 重新載入 Issue 資料
                }}
                onCancel={() => setShowEditForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">描述</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Debug Records */}
          <div className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                除錯紀錄 ({issue.comments?.length || 0})
              </h4>
              <button
                onClick={() => {
                  setShowCommentForm(!showCommentForm)
                  if (!showCommentForm) {
                    setEditingCommentId(null)
                    setEditingCommentBody('')
                  }
                }}
                className="btn-primary text-sm self-start md:self-auto"
              >
                {showCommentForm ? '取消' : '新增紀錄'}
              </button>
            </div>

            {showCommentForm && (
              <div className="mb-4 pb-4 border-b">
                <CommentForm
                  onSubmit={handleAddComment}
                  onCancel={() => setShowCommentForm(false)}
                />
              </div>
            )}

            {issue.comments && issue.comments.length > 0 ? (
              <div className="space-y-4">
                {issue.comments.map((comment: any) => {
                  const isEditing = editingCommentId === comment.id
                  return (
                    <div key={comment.id} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                          <span className="font-semibold text-gray-800">
                            {comment.author_name || '未知用戶'}
                          </span>
                          <span className="text-xs">
                            {new Date(comment.created_at).toLocaleString('zh-TW')}
                          </span>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editingCommentBody}
                            onChange={(e) => setEditingCommentBody(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-primary-200 bg-white px-3 py-3 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        ) : (
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {comment.body}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveComment}
                                className="px-3 py-1.5 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                              >
                                儲存
                              </button>
                              <button
                                onClick={handleCancelEditComment}
                                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEditComment(comment)}
                                className="px-3 py-1.5 rounded-md border border-primary-200 text-sm font-medium text-primary-600 hover:bg-primary-50"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="px-3 py-1.5 rounded-md border border-danger-200 text-sm font-medium text-danger-600 hover:bg-danger-50"
                              >
                                刪除
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              !showCommentForm && <p className="text-gray-500">尚無除錯紀錄</p>
            )}
          </div>

          {/* Relations */}
          <div className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  關聯工單 ({issue.relations?.length || 0})
                </h4>
                <p className="mt-1 text-xs text-gray-500">用來追蹤同一客戶的相關/重複工單，建立後可快速互跳查閱歷程。</p>
              </div>
              <button
                onClick={() => {
                  const nextShow = !showRelationForm
                  setShowRelationForm(nextShow)
                  setRelationError('')
                  if (!nextShow) {
                    setRelatedIssueId('')
                    setRelationSearchTerm('')
                    setRelationSearchResults([])
                  }
                }}
                className="btn-primary text-sm self-start md:self-auto"
              >
                {showRelationForm ? '取消' : '新增關聯'}
              </button>
            </div>

            {showRelationForm && (
              <div className="mb-4 border border-primary-100 rounded-xl bg-primary-50/40 p-4 space-y-3">
                {relationError && (
                  <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                    {relationError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-primary-600">關聯類型</label>
                    <select
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value as typeof relationType)}
                      className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      {RELATION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-primary-500">
                      {RELATION_TYPE_OPTIONS.find((opt) => opt.value === relationType)?.description}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-primary-600">關聯工單 ID</label>
                    <input
                      type="number"
                      value={relatedIssueId}
                      onChange={(e) => setRelatedIssueId(e.target.value)}
                      min={1}
                      className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="輸入工單 ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-primary-600">快速搜尋工單</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={relationSearchTerm}
                      onChange={(e) => setRelationSearchTerm(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="輸入關鍵字或客戶名稱"
                    />
                    <button
                      type="button"
                      onClick={handleSearchRelations}
                      className="px-3 py-2 rounded-md border border-primary-200 text-sm font-medium text-primary-600 hover:bg-primary-50"
                      disabled={relationSearching}
                    >
                      {relationSearching ? '搜尋中...' : '搜尋'}
                    </button>
                  </div>
                  {relationSearchResults.length > 0 && (
                    <div className="rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm text-primary-700 space-y-1 max-h-40 overflow-y-auto">
                      {relationSearchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setRelatedIssueId(String(item.id))
                            setRelationSearchTerm(item.title)
                          }}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-primary-50"
                        >
                          <span className="truncate text-left">
                            #{item.id} {item.title}
                          </span>
                          <span className="text-xs text-primary-400">選擇</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCreateRelation}
                    className="px-3 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                    disabled={relationSearching}
                  >
                    建立關聯
                  </button>
                </div>
              </div>
            )}

            {issue.relations && issue.relations.length > 0 ? (
              <div className="space-y-3">
                {issue.relations.map((relation: IssueRelation) => (
                  <div key={relation.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-800">
                        #{relation.related_issue} {relation.related_issue_title || '—'}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-600">
                          {RELATION_TYPE_LABEL[relation.relation_type as 'relates' | 'duplicates']}
                        </span>
                        <span>{new Date(relation.created_at).toLocaleString('zh-TW')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/issues/${relation.related_issue}`)}
                        className="px-3 py-1.5 rounded-md border border-primary-200 text-sm font-medium text-primary-600 hover:bg-primary-50"
                      >
                        查看工單
                      </button>
                      <button
                        onClick={() => handleDeleteRelation(relation.id)}
                        className="px-3 py-1.5 rounded-md border border-danger-200 text-sm font-medium text-danger-600 hover:bg-danger-50"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showRelationForm && <p className="text-gray-500">尚無關聯工單</p>
            )}
          </div>

          {/* Attachments */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                附件 ({attachments.length})
              </h4>
              <label className="btn-primary text-sm cursor-pointer">
                <input
                  type="file"
                  onChange={handleUploadAttachment}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? '上傳中...' : '上傳附件'}
              </label>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3 flex-1">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 truncate block"
                        >
                          {attachment.filename}
                        </a>
                        <div className="text-xs text-gray-500">
                          {attachment.file_size} KB · {new Date(attachment.created_at).toLocaleString('zh-TW')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="ml-2 text-danger-600 hover:text-danger-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚無附件</p>
            )}
          </div>

        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card" ref={pickerRef}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">狀態資訊</h4>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  </svg>
                  狀態
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker(activePicker === 'status' ? null : 'status')}
                  className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-primary-100 bg-white/80 px-3 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:bg-primary-50"
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                      currentStatusOption?.className || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span>{currentStatusOption?.label || '未設定'}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${activePicker === 'status' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  {currentStatusOption?.description || '設定處理狀態，方便追蹤案件進度'}
                </p>
                {activePicker === 'status' && (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleQuickUpdate('status', option.value)}
                        className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition hover:bg-primary-50 ${
                          issue.status === option.value ? 'bg-primary-50' : ''
                        } ${updatingField === 'status' ? 'pointer-events-none opacity-70' : ''}`}
                      >
                        <span className="flex w-full items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{option.label}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${option.className}`}>
                            {option.label}
                          </span>
                        </span>
                        <span className="mt-1 text-[11px] text-gray-500">{option.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8l3 8H9l3-8z" />
                  </svg>
                  優先級
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker(activePicker === 'priority' ? null : 'priority')}
                  className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-primary-100 bg-white/80 px-3 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:bg-primary-50"
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                      currentPriorityOption?.className || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span>{currentPriorityOption?.label || '未設定'}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${activePicker === 'priority' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  {currentPriorityOption?.description || '設定優先級，讓團隊知道先後順序'}
                </p>
                {activePicker === 'priority' && (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl">
                    {PRIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleQuickUpdate('priority', option.value)}
                        className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition hover:bg-primary-50 ${
                          issue.priority === option.value ? 'bg-primary-50' : ''
                        } ${updatingField === 'priority' ? 'pointer-events-none opacity-70' : ''}`}
                      >
                        <span className="flex w-full items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">優先級 {option.label}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${option.className}`}>
                            {option.label}
                          </span>
                        </span>
                        <span className="mt-1 text-[11px] text-gray-500">{option.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  </svg>
                  類別
                </span>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {issue.category || '-'}
                </div>
              </div>
              <div>
                <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l6 6-6 6M21 7l-6 6 6 6" />
                  </svg>
                  來源
                </span>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {issue.source || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">詳細資訊</h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">負責人</span>
                <div className="mt-1 text-gray-900">{issue.assignee_name || '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">回報人</span>
                <div className="mt-1 text-gray-900">{issue.reporter_name || '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">專案</span>
                <div className="mt-1 text-gray-900">{issue.project_name || '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">客戶</span>
                <div className="mt-1 text-gray-900">{issue.customer_name || '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">保固狀態</span>
                <div className="mt-2 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">硬體</span>
                      <span className={`px-2 inline-flex text-xs font-medium rounded-full ${hardwareBadge.className}`}>
                        {hardwareBadge.label}
                      </span>
                    </div>
                    {issue.hardware_warranties && issue.hardware_warranties.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-xs text-gray-600">
                        {issue.hardware_warranties.map((warranty) => {
                          const isSelected = issue.warranty_info?.id === warranty.id
                          return (
                            <li
                              key={`hardware-${warranty.id}`}
                              className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                                isSelected
                                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="block truncate text-sm font-medium text-gray-700">
                                  {warranty.title}
                                </span>
                                <span className="mt-1 block text-[11px] text-gray-500">
                                  到期日 {formatDate(warranty.end_date)}
                                </span>
                                {warranty.notes && (
                                  <span className="mt-1 block text-[11px] text-gray-400">
                                    備註：{warranty.notes}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                  warranty.status
                                )}`}
                              >
                                {getWarrantyLabel(warranty.status)}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">尚未設定硬體保固</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">軟體</span>
                      <span className={`px-2 inline-flex text-xs font-medium rounded-full ${softwareBadge.className}`}>
                        {softwareBadge.label}
                      </span>
                    </div>
                    {issue.software_warranties && issue.software_warranties.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-xs text-gray-600">
                        {issue.software_warranties.map((warranty) => (
                          <li
                            key={`software-${warranty.id}`}
                            className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="block truncate text-sm font-medium text-gray-700">
                                {warranty.title}
                              </span>
                              <span className="mt-1 block text-[11px] text-gray-500">
                                到期日 {formatDate(warranty.end_date)}
                              </span>
                              {warranty.notes && (
                                <span className="mt-1 block text-[11px] text-gray-400">
                                  備註：{warranty.notes}
                                </span>
                              )}
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                warranty.status
                              )}`}
                            >
                              {getWarrantyLabel(warranty.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">尚未設定軟體保固</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-gray-500">建立時間</span>
                <div className="mt-1 text-gray-900">
                  {new Date(issue.created_at).toLocaleString('zh-TW')}
                </div>
              </div>
              <div>
                <span className="text-gray-500">更新時間</span>
                <div className="mt-1 text-gray-900">
                  {new Date(issue.updated_at).toLocaleString('zh-TW')}
                </div>
              </div>
              {issue.first_response_at && (
                <div>
                  <span className="text-gray-500">首次回應時間</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(issue.first_response_at).toLocaleString('zh-TW')}
                  </div>
                </div>
              )}
              {issue.resolved_at && (
                <div>
                  <span className="text-gray-500">結案時間</span>
                  <div className="mt-1 text-gray-900">
                    {new Date(issue.resolved_at).toLocaleString('zh-TW')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subtasks */}
          {issue.subtasks && issue.subtasks.length > 0 && (
            <div className="card">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                子任務 ({issue.subtasks.length})
              </h4>
              <div className="space-y-2">
                {issue.subtasks.map((subtask: any) => (
                  <div key={subtask.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm text-gray-900">{subtask.title}</span>
                    <span className="text-xs text-gray-500">{subtask.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relations */}
          {issue.relations && issue.relations.length > 0 && (
            <div className="card">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">關聯 Issue</h4>
              <div className="space-y-2">
                {issue.relations.map((relation: any) => (
                  <div key={relation.id} className="text-sm">
                    <span className="text-gray-500">{relation.relation_type}:</span>{' '}
                    <button className="text-blue-600 hover:text-blue-800">
                      #{relation.related_issue} - {relation.related_issue_title}
                    </button>
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


