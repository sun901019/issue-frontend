import { useState, useEffect } from 'react'
import api from '../services/api'
import { getWarrantyStatus } from '../utils/warranty'

interface WarrantyStatus {
  state: 'none' | 'active' | 'expiring' | 'expired'
  label: string
  days_left?: number | null
  color: 'gray' | 'success' | 'warning' | 'danger'
}

interface WarrantySummary {
  count: number
  next_id?: number | null
  next_title?: string | null
  next_due_date?: string | null
  status: WarrantyStatus
}

interface CustomerWarranty {
  id?: number
  type: 'hardware' | 'software'
  title: string
  end_date?: string | null
  notes?: string
  status?: WarrantyStatus
  created_at?: string
}

interface Customer {
  id: number
  name: string
  code?: string
  contact_person?: string
  contact_email?: string
  business_owner?: string
  handover_completed: boolean
  training_completed: boolean
  internal_network_connected: boolean
  warranties?: CustomerWarranty[]
  hardware_summary?: WarrantySummary
  software_summary?: WarrantySummary
  created_at: string
  updated_at: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [warrantyFilter, setWarrantyFilter] = useState<'active' | 'expired'>('active')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [expandedHardwareCustomers, setExpandedHardwareCustomers] = useState<number[]>([])
  const [expandedSoftwareCustomers, setExpandedSoftwareCustomers] = useState<number[]>([])
type WarrantyFormItem = {
  id?: number
  type: 'hardware' | 'software'
  title: string
  end_date?: string
  notes?: string
  created_at?: string
}

  const [formData, setFormData] = useState({
    name: '',
    business_owner: '',
    handover_completed: false,
    training_completed: false,
    internal_network_connected: false,
    warranties: [] as WarrantyFormItem[],
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [warrantyFilter])

  const defaultHardwareStatus = getWarrantyStatus(undefined)

  const deriveHardwareStatus = (customer: Customer) => {
    const summary = customer.hardware_summary
    const status = summary?.status || defaultHardwareStatus
    const dueDate = summary?.next_due_date ? new Date(summary.next_due_date) : null
    return {
      status,
      dueDate,
    }
  }

  const getBadgeClass = (status: { color: string }) => {
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

  const formatDateText = (value?: string | Date | null) => {
    if (!value) return '-'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('zh-TW')
  }

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customers/')
      const sorted = res.data.map((customer: Customer) => ({
        ...customer,
        warranties: customer.warranties
          ? [...customer.warranties].sort((a, b) => {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
              return bTime - aTime
            })
          : [],
      }))
      setCustomers(sorted)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleCreate = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      business_owner: '',
      handover_completed: false,
      training_completed: false,
      internal_network_connected: false,
      warranties: [],
    })
    setShowForm(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    const warranties =
      customer.warranties
        ?.slice()
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        })
        .map((warranty) => ({
          id: warranty.id,
          type: warranty.type,
          title: warranty.title,
          end_date: warranty.end_date || undefined,
          notes: warranty.notes || '',
          created_at: warranty.created_at || undefined,
        })) || []
    setFormData({
      name: customer.name,
      business_owner: customer.business_owner || '',
      handover_completed: customer.handover_completed,
      training_completed: customer.training_completed,
      internal_network_connected: customer.internal_network_connected,
      warranties,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除此客戶嗎？')) return
    
    try {
      await api.delete(`/customers/${id}/`)
      loadCustomers()
      alert('刪除成功')
    } catch (error: any) {
      console.error('Failed to delete customer:', error)
      alert('刪除失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // 準備提交數據（將日期格式化）
      const submitData: any = {
        name: formData.name,
        business_owner: formData.business_owner || '',
        handover_completed: formData.handover_completed,
        training_completed: formData.training_completed,
        internal_network_connected: formData.internal_network_connected,
        warranties: formData.warranties.map((warranty) => ({
          id: warranty.id,
          type: warranty.type,
          title: warranty.title,
          end_date: warranty.end_date || null,
          notes: warranty.notes || '',
        })),
      }
      
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}/`, submitData)
        alert('更新成功')
      } else {
        await api.post('/customers/', submitData)
        alert('創建成功')
      }
      setShowForm(false)
      loadCustomers()
    } catch (error: any) {
      console.error('Failed to save customer:', error)
      alert('儲存失敗：' + (error.response?.data?.error || error.response?.data?.detail || '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }

  const addWarranty = (type: 'hardware' | 'software') => {
    setFormData((prev) => ({
      ...prev,
      warranties: [
        {
          type,
          title: '',
          end_date: undefined,
          notes: '',
          created_at: new Date().toISOString(),
        },
        ...prev.warranties,
      ],
    }))
  }

  const updateWarrantyField = (index: number, field: keyof WarrantyFormItem, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.warranties]
      updated[index] = {
        ...updated[index],
        [field]: value as any,
      }
      return {
        ...prev,
        warranties: updated,
      }
    })
  }

  const removeWarranty = (index: number) => {
    setFormData((prev) => {
      const updated = [...prev.warranties]
      updated.splice(index, 1)
      return {
        ...prev,
        warranties: updated,
      }
    })
  }

  const toggleHardwareDetails = (customerId: number) => {
    setExpandedHardwareCustomers((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    )
  }

  const toggleSoftwareDetails = (customerId: number) => {
    setExpandedSoftwareCustomers((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    )
  }

  const activeCustomers = customers.filter((customer) => {
    const { status } = deriveHardwareStatus(customer)
    return status.state !== 'expired'
  })

  const expiredCustomers = customers.filter((customer) => {
    const { status } = deriveHardwareStatus(customer)
    return status.state === 'expired'
  })

  const filteredCustomers = warrantyFilter === 'expired' ? expiredCustomers : activeCustomers
  const activeCount = activeCustomers.length
  const expiredCount = expiredCustomers.length
  const paginatedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1

  if (loading && customers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">客戶管理</h2>
          <p className="mt-1 text-sm text-gray-500">管理客戶資訊與狀態</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-success"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增客戶
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white w-full sm:w-auto">
          <button
            onClick={() => setWarrantyFilter('active')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-1 ${
              warrantyFilter === 'active'
                ? 'bg-success-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>保固中</span>
            <span className="text-xs opacity-80">({activeCount})</span>
          </button>
          <button
            onClick={() => setWarrantyFilter('expired')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-1 ${
              warrantyFilter === 'expired'
                ? 'bg-danger-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>已過保</span>
            <span className="text-xs opacity-80">({expiredCount})</span>
          </button>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span className="inline-block w-3 h-3 rounded-full bg-success-400" />
            <span>保固中</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-3 h-3 rounded-full bg-warning-400" />
            <span>15 天內到期</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-3 h-3 rounded-full bg-danger-400" />
            <span>已過保</span>
          </div>
        </div>
      </div>

      {/* 客戶列表 */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司名稱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所屬業務</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">點交驗收</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教育訓練</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接回內網</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">硬體保固</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">軟體保固</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCustomers.map((customer) => {
              const { status: hardwareStatus } = deriveHardwareStatus(customer)
              const hardwareBadgeClass = getBadgeClass(hardwareStatus)
              const softwareSummary = customer.software_summary
              const softwareStatus = softwareSummary?.status
              const softwareBadgeClass = softwareStatus ? getBadgeClass(softwareStatus) : 'bg-gray-100 text-gray-600'
              const hardwareWarranties = (customer.warranties || []).filter((warranty) => warranty.type === 'hardware')
              const softwareWarranties = (customer.warranties || []).filter((warranty) => warranty.type === 'software')
              const canToggleHardware = hardwareWarranties.length > 1
              const canToggleSoftware = softwareWarranties.length > 1
              const hardwareExpanded =
                hardwareWarranties.length === 0
                  ? false
                  : canToggleHardware
                    ? expandedHardwareCustomers.includes(customer.id)
                    : true
              const softwareExpanded =
                softwareWarranties.length === 0
                  ? false
                  : canToggleSoftware
                    ? expandedSoftwareCustomers.includes(customer.id)
                    : true
              const rowClass =
                hardwareStatus.state === 'expired'
                  ? 'bg-danger-50 hover:bg-danger-100'
                  : hardwareStatus.state === 'expiring'
                    ? 'bg-warning-50 hover:bg-warning-100'
                    : 'hover:bg-gray-50'

              return (
              <tr key={customer.id} className={`transition-colors ${rowClass}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.business_owner || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.handover_completed ? (
                    <span className="text-success-600">✓ 已完成</span>
                  ) : (
                    <span className="text-gray-400">未完成</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.training_completed ? (
                    <span className="text-success-600">✓ 已完成</span>
                  ) : (
                    <span className="text-gray-400">未完成</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.internal_network_connected ? (
                    <span className="text-success-600">✓ 已連接</span>
                  ) : (
                    <span className="text-gray-400">未連接</span>
                  )}
                </td>
                <td className="px-6 py-4 align-top text-sm">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${hardwareBadgeClass}`}>
                      <span>{hardwareStatus.label}</span>
                    </div>
                    {canToggleHardware && (
                      <div className="flex items-center gap-2 text-xs text-primary-600">
                        <button
                          type="button"
                          onClick={() => toggleHardwareDetails(customer.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-white px-2.5 py-1 font-medium hover:bg-primary-50 transition"
                        >
                          <svg className={`h-3.5 w-3.5 transition-transform ${hardwareExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 011.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                          </svg>
                          {hardwareExpanded ? '收合批次' : `查看批次 (${hardwareWarranties.length})`}
                        </button>
                      </div>
                    )}
                    {hardwareExpanded && (
                      <div className="space-y-2">
                        {hardwareWarranties.map((warranty) => (
                          <div
                            key={warranty.id}
                            className="rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2 text-xs text-primary-700 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{warranty.title || '未命名批次'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getBadgeClass(warranty.status || { color: 'gray' })}`}>
                                {warranty.status?.label || hardwareStatus.label}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-primary-500">
                              到期 {warranty.end_date ? formatDateText(warranty.end_date) : '未設定'}
                            </div>
                            {warranty.notes && (
                              <div className="mt-1 text-[11px] text-primary-400">
                                備註：{warranty.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {hardwareWarranties.length === 0 && <div className="text-xs text-gray-400">尚未設定硬體保固</div>}
                  </div>
                </td>
                <td className="px-6 py-4 align-top text-sm">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${softwareBadgeClass}`}>
                      <span>{softwareStatus?.label || '未設定'}</span>
                    </div>
                    {canToggleSoftware && (
                      <div className="flex items-center gap-2 text-xs text-success-600">
                        <button
                          type="button"
                          onClick={() => toggleSoftwareDetails(customer.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-white px-2.5 py-1 font-medium hover:bg-success-50 transition"
                        >
                          <svg className={`h-3.5 w-3.5 transition-transform ${softwareExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 011.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                          </svg>
                          {softwareExpanded ? '收合批次' : `查看批次 (${softwareWarranties.length})`}
                        </button>
                      </div>
                    )}
                    {softwareExpanded && (
                      <div className="space-y-2">
                        {softwareWarranties.map((warranty) => (
                          <div
                            key={warranty.id}
                            className="rounded-lg border border-success-100 bg-success-50/60 px-3 py-2 text-xs text-success-700 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{warranty.title || '未命名批次'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getBadgeClass(warranty.status || { color: 'gray' })}`}>
                                {warranty.status?.label || softwareStatus?.label || '未設定'}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-success-500">
                              到期 {warranty.end_date ? formatDateText(warranty.end_date) : '未設定'}
                            </div>
                            {warranty.notes && (
                              <div className="mt-1 text-[11px] text-success-400">
                                備註：{warranty.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {softwareWarranties.length === 0 && <div className="text-xs text-gray-400">尚未設定軟體保固</div>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="text-primary-600 hover:text-primary-800 font-medium mr-4"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="text-danger-600 hover:text-danger-800 font-medium"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-500">尚無客戶資料</div>
        )}
      </div>

      {filteredCustomers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-700">
            顯示 {paginatedCustomers.length} / {filteredCustomers.length} 筆
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              上一頁
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              第 {page} / {totalPages} 頁
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      )}

      {/* 表單 Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCustomer ? '編輯客戶' : '新增客戶'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司名稱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    placeholder="輸入公司名稱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所屬業務 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_owner}
                    onChange={(e) => setFormData({ ...formData, business_owner: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    placeholder="輸入所屬業務"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="handover_completed"
                      checked={formData.handover_completed}
                      onChange={(e) => setFormData({ ...formData, handover_completed: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="handover_completed" className="ml-2 text-sm text-gray-700">
                      點交驗收完成
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="training_completed"
                      checked={formData.training_completed}
                      onChange={(e) => setFormData({ ...formData, training_completed: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="training_completed" className="ml-2 text-sm text-gray-700">
                      教育訓練完成
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="internal_network_connected"
                      checked={formData.internal_network_connected}
                      onChange={(e) => setFormData({ ...formData, internal_network_connected: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="internal_network_connected" className="ml-2 text-sm text-gray-700">
                      接回內網
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">保固批次</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addWarranty('hardware')}
                        className="text-xs px-3 py-1 rounded-full border border-primary-200 text-primary-600 hover:bg-primary-50 transition"
                      >
                        + 新增硬體保固
                      </button>
                      <button
                        type="button"
                        onClick={() => addWarranty('software')}
                        className="text-xs px-3 py-1 rounded-full border border-success-200 text-success-600 hover:bg-success-50 transition"
                      >
                        + 新增軟體保固
                      </button>
                    </div>
                  </div>

                  {formData.warranties.length === 0 && (
                    <p className="text-xs text-gray-500">
                      尚未新增保固資料。可針對不同批次或軟體保固建立多筆紀錄。
                    </p>
                  )}

                  <div className="space-y-3">
                    {formData.warranties.map((warranty, index) => (
                      <div key={warranty.id ?? index} className="rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">保固批次 #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeWarranty(index)}
                            className="text-xs text-danger-500 hover:text-danger-700"
                          >
                            移除
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">類型</label>
                            <select
                              value={warranty.type}
                              onChange={(e) => updateWarrantyField(index, 'type', e.target.value as 'hardware' | 'software')}
                              className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 text-sm"
                            >
                              <option value="hardware">硬體</option>
                              <option value="software">軟體</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">保固名稱 / 說明</label>
                            <input
                              type="text"
                              required
                              value={warranty.title}
                              onChange={(e) => updateWarrantyField(index, 'title', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 text-sm"
                              placeholder="例如：主系統 + 3 感測器"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">保固到期日</label>
                            <input
                              type="date"
                              value={warranty.end_date || ''}
                              onChange={(e) => updateWarrantyField(index, 'end_date', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">備註</label>
                          <textarea
                            value={warranty.notes || ''}
                            onChange={(e) => updateWarrantyField(index, 'notes', e.target.value)}
                            rows={2}
                            className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 text-sm"
                            placeholder="可選填"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? '儲存中...' : '儲存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

