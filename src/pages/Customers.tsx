import { useState, useEffect } from 'react'
import api from '../services/api'
import { getWarrantyStatus } from '../utils/warranty'

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
  warranty_due?: string
  created_at: string
  updated_at: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [warrantyFilter, setWarrantyFilter] = useState<'active' | 'expired'>('active')
  const [formData, setFormData] = useState({
    name: '',
    business_owner: '',
    handover_completed: false,
    training_completed: false,
    internal_network_connected: false,
    warranty_due: '' as string | undefined,
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customers/')
      setCustomers(res.data)
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
      warranty_due: undefined,
    })
    setShowForm(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      business_owner: customer.business_owner || '',
      handover_completed: customer.handover_completed,
      training_completed: customer.training_completed,
      internal_network_connected: customer.internal_network_connected,
      warranty_due: customer.warranty_due ? customer.warranty_due.split('T')[0] : undefined,
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
        warranty_due: formData.warranty_due ? `${formData.warranty_due}T00:00:00` : null,
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

  const activeCustomers = customers.filter((customer) => {
    const status = getWarrantyStatus(customer.warranty_due)
    return status.state !== 'expired'
  })

  const expiredCustomers = customers.filter((customer) => {
    const status = getWarrantyStatus(customer.warranty_due)
    return status.state === 'expired'
  })

  const filteredCustomers = warrantyFilter === 'expired' ? expiredCustomers : activeCustomers
  const activeCount = activeCustomers.length
  const expiredCount = expiredCustomers.length

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">保固狀態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">保固日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers.map((customer) => {
              const status = getWarrantyStatus(customer.warranty_due)
              const badgeClass =
                status.color === 'success'
                  ? 'bg-success-100 text-success-700'
                  : status.color === 'warning'
                    ? 'bg-warning-100 text-warning-700'
                    : status.color === 'danger'
                      ? 'bg-danger-100 text-danger-700'
                      : 'bg-gray-100 text-gray-600'
              const rowClass =
                status.state === 'expired'
                  ? 'bg-danger-50 hover:bg-danger-100'
                  : status.state === 'expiring'
                    ? 'bg-warning-50 hover:bg-warning-100'
                    : 'hover:bg-gray-50'
              const warrantyDate = customer.warranty_due ? new Date(customer.warranty_due) : null

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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {warrantyDate
                    ? warrantyDate.toLocaleDateString('zh-TW')
                    : '-'
                  }
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    placeholder="輸入所屬業務"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">保固日期</label>
                  <input
                    type="date"
                    value={formData.warranty_due || ''}
                    onChange={(e) => setFormData({ ...formData, warranty_due: e.target.value || undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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

