import { useState, useEffect } from 'react'
import { issuesApi, Issue, WarrantyStatus } from '../services/issues'
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

interface CustomerWarranty {
  id?: number
  type: 'hardware' | 'software'
  title: string
  end_date?: string | null
  status?: WarrantyStatus
  notes?: string
  created_at?: string
}

interface WarrantySummary {
  count: number
  next_id?: number | null
  next_title?: string | null
  next_due_date?: string | null
  status: WarrantyStatus
}

interface CustomerOption {
  id: number
  name: string
  warranties?: CustomerWarranty[]
  hardware_summary?: WarrantySummary
  software_summary?: WarrantySummary
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
  const formatDateLocal = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const tzOffset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - tzOffset * 60000)
    return localDate.toISOString().slice(0, 10)
  }
  const [createdAt, setCreatedAt] = useState<string>(() =>
    formatDateLocal(issue?.created_at) || formatDateLocal(new Date().toISOString())
  )
  
  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(issue?.customer)
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<number | null>(() => issue?.warranty ?? null)
  const [hasManualWarrantySelection, setHasManualWarrantySelection] = useState(false)
  
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
          const normalized = res.data.map((customer: CustomerOption) => ({
            ...customer,
            warranties: customer.warranties
              ? [...customer.warranties].sort((a, b) => {
                  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
                  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
                  return bTime - aTime
                })
              : [],
          }))
          setCustomers(normalized)
        }
      })
      .catch((err) => {
        console.error('Failed to load customers:', err)
      })
  }, [])
  
  // 當選擇客戶時，自動填充標題並預選保固
  useEffect(() => {
    if (!selectedCustomerId) {
      if (selectedWarrantyId !== null) {
        setSelectedWarrantyId(null)
      }
      return
    }

    const customer = customers.find((c) => c.id === selectedCustomerId)
    if (!customer) return

    setFormData((prev) => ({ ...prev, title: customer.name }))

    const hardwareWarranties = customer.warranties?.filter((w) => w.type === 'hardware') || []
    const summaryDefaultId =
      customer.hardware_summary?.next_id &&
      hardwareWarranties.some((w) => w.id === customer.hardware_summary?.next_id)
        ? customer.hardware_summary?.next_id
        : undefined

    const currentExists =
      selectedWarrantyId !== null && hardwareWarranties.some((w) => w.id === selectedWarrantyId)

    if (hasManualWarrantySelection) {
      if (selectedWarrantyId !== null && !currentExists) {
        setHasManualWarrantySelection(false)
        setSelectedWarrantyId(null)
      }
      return
    }

    if (hardwareWarranties.length === 0) {
      if (selectedWarrantyId !== null) {
        setSelectedWarrantyId(null)
      }
      return
    }

    const defaultWarrantyId =
      (currentExists
        ? selectedWarrantyId
        : summaryDefaultId ?? hardwareWarranties[0]?.id) ?? null

    if (defaultWarrantyId !== selectedWarrantyId) {
      setSelectedWarrantyId(defaultWarrantyId)
    }
  }, [selectedCustomerId, customers, selectedWarrantyId, hasManualWarrantySelection])

  useEffect(() => {
    setHasManualWarrantySelection(false)
  }, [selectedCustomerId])

  useEffect(() => {
    setCreatedAt(formatDateLocal(issue?.created_at) || formatDateLocal(new Date().toISOString()))
  }, [issue?.created_at])

  const selectedCustomer = selectedCustomerId
    ? customers.find(c => c.id === selectedCustomerId)
    : undefined
  const hardwareWarranties = selectedCustomer?.warranties?.filter(w => w.type === 'hardware') || []
  const softwareWarranties = selectedCustomer?.warranties?.filter(w => w.type === 'software') || []
  const selectedWarranty =
    selectedWarrantyId !== null
      ? hardwareWarranties.find((w) => w.id === selectedWarrantyId) || null
      : null

  const baseFieldClass =
    'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 placeholder:text-gray-400'
  const selectClass = `${baseFieldClass}`

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

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('zh-TW')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // 类型转换以符合 API 要求
      const submitData: any = {
        ...formData,
        priority: formData.priority as 'Low' | 'Medium' | 'High',
        status: formData.status as 'Open' | 'In Progress' | 'Closed' | 'Pending',
        customer: selectedCustomerId, // 關聯客戶
        warranty: selectedWarrantyId ?? null,
      }
      const createdAtIso = createdAt ? new Date(createdAt).toISOString() : null
      if (createdAtIso) {
        submitData.created_at = createdAtIso
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
          className={`mt-1 ${selectClass}`}
        >
          <option value="">請選擇客戶</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCustomer && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">保固資訊</h4>
            {selectedCustomer.hardware_summary?.next_due_date && (
              <span className="text-xs text-gray-500">
                最近到期：{formatDate(selectedCustomer.hardware_summary.next_due_date)}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                硬體保固批次
              </label>
              {hardwareWarranties.length > 0 ? (
                <select
                  value={selectedWarrantyId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setHasManualWarrantySelection(true)
                    setSelectedWarrantyId(value ? Number(value) : null)
                  }}
                  className={`${selectClass}`}
                >
                  <option value="">無（不指定硬體批次）</option>
                  {hardwareWarranties.map((warranty) => (
                    <option key={warranty.id} value={warranty.id}>
                      {warranty.title}（到期 {formatDate(warranty.end_date)}）
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-500">尚未設定硬體保固</p>
              )}

              {selectedWarranty ? (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full ${getStatusBadgeClass(selectedWarranty.status)}`}>
                    {getWarrantyLabel(selectedWarranty.status)}
                  </div>
                  <div>到期日：{formatDate(selectedWarranty.end_date)}</div>
                  {selectedWarranty.notes && <div>備註：{selectedWarranty.notes}</div>}
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">目前未指定硬體保固。</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                軟體保固
              </label>
              {softwareWarranties.length > 0 ? (
                <ul className="space-y-2 text-xs text-gray-600">
                  {softwareWarranties.map((warranty) => (
                    <li key={warranty.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <div className="text-gray-700">{warranty.title}</div>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClass(warranty.status)}`}>
                        {getWarrantyLabel(warranty.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">尚未設定軟體保固</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          描述 <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={6}
          className="mt-1 block w-full rounded-lg border border-primary-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-3"
          placeholder="輸入 Issue 詳細描述"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          建立日期 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          required
          value={createdAt}
          onChange={(e) => setCreatedAt(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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
            className={`mt-1 ${selectClass}`}
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
            className={`mt-1 ${selectClass}`}
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
            className={`mt-1 ${selectClass}`}
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
            className={`mt-1 ${selectClass}`}
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
          className={`mt-1 ${selectClass}`}
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

