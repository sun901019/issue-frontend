import { useState, useEffect } from 'react'
import { issuesApi, Issue } from '../services/issues'
import api from '../services/api'

interface IssueFormProps {
  issue?: Issue
  onSuccess?: () => void
  onCancel?: () => void
}

interface Dictionary {
  value: string
  label: string
}

export default function IssueForm({ issue, onSuccess, onCancel }: IssueFormProps) {
  const [formData, setFormData] = useState<{
    title: string
    description: string
    category: string
    priority: string
    status: string
    source: string
    assignee?: number
  }>({
    title: issue?.title || '',
    description: issue?.description || '',
    category: issue?.category || '',
    priority: issue?.priority || 'Medium',
    status: issue?.status || 'Open',
    source: issue?.source || '',
    assignee: issue?.assignee || undefined,
  })
  
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([])
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(issue?.customer)
  
  const [dictionaries, setDictionaries] = useState<{
    status?: Dictionary[]
    priority?: Dictionary[]
    category?: Dictionary[]
    source?: Dictionary[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // 載入字典表
    api.get('/settings/dictionaries/')
      .then((res) => {
        setDictionaries(res.data)
      })
      .catch((err) => {
        console.error('Failed to load dictionaries:', err)
      })
    
    // 載入用戶列表（用於負責人選擇）
    api.get('/users/')
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setUsers(res.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load users:', err)
        // 如果無法取得用戶列表，使用空陣列（負責人欄位改為選填）
      })
    
    // 載入客戶列表（用於標題選擇）
    api.get('/customers/')
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setCustomers(res.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load customers:', err)
      })
  }, [])
  
  // 當選擇客戶時，自動填充標題
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId)
      if (customer) {
        setFormData(prev => ({ ...prev, title: customer.name }))
      }
    }
  }, [selectedCustomerId, customers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // 类型转换以符合 API 要求
      const submitData = {
        ...formData,
        priority: formData.priority as 'Low' | 'Medium' | 'High',
        status: formData.status as 'Open' | 'In Progress' | 'Closed' | 'Pending',
        customer: selectedCustomerId, // 關聯客戶
      }
      
      if (issue) {
        // 更新
        await issuesApi.update(issue.id, submitData)
      } else {
        // 建立
        await issuesApi.create(submitData)
      }
      onSuccess?.()
    } catch (error: any) {
      console.error('Failed to save issue:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || '儲存失敗，請檢查輸入'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          客戶 <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={selectedCustomerId || ''}
          onChange={(e) => {
            const customerId = e.target.value ? Number(e.target.value) : undefined
            setSelectedCustomerId(customerId)
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        >
          <option value="">請選擇客戶</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          標題 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.title}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 cursor-not-allowed"
          placeholder="選擇客戶後自動填充"
        />
        <p className="mt-1 text-xs text-gray-500">標題將根據選擇的客戶自動填充，無法手動編輯</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述 <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          placeholder="輸入 Issue 詳細描述"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            類別 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="">請選擇類別</option>
            {dictionaries?.category?.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            優先級 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            {dictionaries?.priority?.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            狀態 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            {dictionaries?.status?.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            來源 <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="">請選擇來源</option>
            {dictionaries?.source?.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          負責人
        </label>
        <select
          value={formData.assignee || ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            assignee: e.target.value ? Number(e.target.value) : undefined 
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
        >
          <option value="">未指派</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
        {users.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            提示：如需選擇負責人，請先在 Admin 後台建立用戶
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? '儲存中...' : issue ? '更新' : '建立'}
        </button>
      </div>
    </form>
  )
}

