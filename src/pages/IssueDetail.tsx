import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { issuesApi, Issue } from '../services/issues'
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

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<IssueDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (id) {
      loadIssue()
    }
  }, [id])

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

  const warrantyStatus = getWarrantyStatus(issue.customer_warranty_due)
  const warrantyBadgeClass =
    warrantyStatus.color === 'success'
      ? 'bg-success-100 text-success-700'
      : warrantyStatus.color === 'warning'
        ? 'bg-warning-100 text-warning-700'
        : warrantyStatus.color === 'danger'
          ? 'bg-danger-100 text-danger-700'
          : 'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => navigate('/issues')}
            className="text-primary-600 hover:text-primary-800 font-medium mb-2 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回列表
          </button>
          <h2 className="text-3xl font-bold text-gray-900">Issue #{issue.id}</h2>
          <h3 className="text-xl text-gray-700 mt-1">{issue.title}</h3>
          <div className="flex items-center flex-wrap gap-2 mt-3">
            {issue.customer_name && (
              <span className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {issue.customer_name}
              </span>
            )}
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${warrantyBadgeClass}`}>
              {warrantyStatus.label}
            </span>
            {warrantyStatus.dueDate && (
              <span className="text-xs text-gray-500">
                到期日 {warrantyStatus.dueDate.toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowEditForm(true)}
            className="btn-secondary"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            編輯
          </button>
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

          {/* Comments */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                評論 ({issue.comments?.length || 0})
              </h4>
              <button
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="btn-primary text-sm"
              >
                {showCommentForm ? '取消' : '新增評論'}
              </button>
            </div>

            {/* 評論表單 */}
            {showCommentForm && (
              <div className="mb-4 pb-4 border-b">
                <CommentForm
                  onSubmit={handleAddComment}
                  onCancel={() => setShowCommentForm(false)}
                />
              </div>
            )}

            {/* 評論列表 */}
            {issue.comments && issue.comments.length > 0 ? (
              <div className="space-y-4">
                {issue.comments.map((comment: any) => (
                  <div key={comment.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-gray-900">
                          {comment.author_name || '未知用戶'}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(comment.created_at).toLocaleString('zh-TW')}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              !showCommentForm && <p className="text-gray-500">尚無評論</p>
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

          {/* Status History */}
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">活動紀錄</h4>
            {issue.status_history && issue.status_history.length > 0 ? (
              <div className="space-y-3">
                {issue.status_history.map((history: any) => (
                  <div key={history.id} className="flex items-center text-sm">
                    <span className="text-gray-500">
                      {new Date(history.changed_at).toLocaleString('zh-TW')}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-gray-700">
                      {history.from_status} → {history.to_status}
                    </span>
                    {history.changed_by_name && (
                      <span className="text-gray-500 ml-2">
                        (by {history.changed_by_name})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">尚無活動紀錄</p>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">狀態資訊</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">狀態</span>
                <div className="mt-1">
                  {issue.status === 'Open' && <span className="status-open">待處理</span>}
                  {issue.status === 'In Progress' && <span className="status-in-progress">處理中</span>}
                  {issue.status === 'Closed' && <span className="status-closed">已完成</span>}
                  {issue.status === 'Pending' && <span className="status-pending">暫停</span>}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">優先級</span>
                <div className="mt-1">
                  {issue.priority === 'High' && <span className="priority-high">高</span>}
                  {issue.priority === 'Medium' && <span className="priority-medium">中</span>}
                  {issue.priority === 'Low' && <span className="priority-low">低</span>}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">類別</span>
                <div className="mt-1 text-gray-900">{issue.category}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">來源</span>
                <div className="mt-1 text-gray-900">{issue.source}</div>
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
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${warrantyBadgeClass}`}>
                    {warrantyStatus.label}
                  </span>
                  {warrantyStatus.dueDate && (
                    <span className="text-xs text-gray-500">
                      到期日 {warrantyStatus.dueDate.toLocaleDateString('zh-TW')}
                    </span>
                  )}
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

