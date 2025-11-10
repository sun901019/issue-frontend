import { useState, useEffect } from 'react'
import api from '../services/api'

interface DictionaryItem {
  value: string
  label: string
}

interface Dictionary {
  status: DictionaryItem[]
  priority: DictionaryItem[]
  category: DictionaryItem[]
  source: DictionaryItem[]
}

export default function Settings() {
  const [dictionaries, setDictionaries] = useState<Dictionary | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingDict, setEditingDict] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<DictionaryItem[]>([])

  useEffect(() => {
    loadDictionaries()
  }, [])

  const loadDictionaries = async () => {
    setLoading(true)
    try {
      const res = await api.get('/settings/dictionaries/')
      setDictionaries(res.data)
    } catch (error) {
      console.error('Failed to load dictionaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (dictType: string) => {
    if (!dictionaries) return
    setEditingDict(dictType)
    setEditingItems([...dictionaries[dictType as keyof Dictionary] || []])
  }

  const handleSave = async () => {
    if (!editingDict) return

    try {
      // 更新字典表（这里只是前端演示，实际需要后端 API 支持）
      await api.put(`/settings/dictionaries/${editingDict}/`, { items: editingItems })
      await loadDictionaries()
      setEditingDict(null)
      alert('儲存成功')
    } catch (error: any) {
      console.error('Failed to save dictionary:', error)
      alert('儲存失敗：' + (error.response?.data?.error || '未知錯誤'))
    }
  }

  const handleCancel = () => {
    setEditingDict(null)
    setEditingItems([])
  }

  const handleAddItem = () => {
    setEditingItems([...editingItems, { value: '', label: '' }])
  }

  const handleRemoveItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: 'value' | 'label', value: string) => {
    const newItems = [...editingItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditingItems(newItems)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  const dictTypes = [
    { key: 'status', label: '狀態' },
    { key: 'priority', label: '優先級' },
    { key: 'category', label: '類別' },
    { key: 'source', label: '來源' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">系統設定</h2>
          <p className="mt-1 text-sm text-gray-500">管理系統配置與字典表</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">字典表管理</h3>
        <p className="text-sm text-gray-500 mb-6">
          管理系統中使用的字典表項目。這些設定會影響 Issue 的選項。
        </p>

        <div className="space-y-6">
          {dictTypes.map((dictType) => (
            <div key={dictType.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">{dictType.label}</h4>
                {editingDict === dictType.key ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="btn-primary text-sm"
                    >
                      儲存
                    </button>
                    <button
                      onClick={handleCancel}
                      className="btn-secondary text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(dictType.key)}
                    className="btn-secondary text-sm"
                  >
                    編輯
                  </button>
                )}
              </div>

              {editingDict === dictType.key ? (
                <div className="space-y-2">
                  {editingItems.map((item, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="值 (value)"
                        value={item.value}
                        onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="text"
                        placeholder="標籤 (label)"
                        value={item.label}
                        onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddItem}
                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                  >
                    + 新增項目
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {dictionaries?.[dictType.key as keyof Dictionary]?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">{item.value}</span>
                        <span className="text-gray-500 ml-2">- {item.label}</span>
                      </span>
                    </div>
                  ))}
                  {(!dictionaries?.[dictType.key as keyof Dictionary] || 
                    dictionaries[dictType.key as keyof Dictionary].length === 0) && (
                    <p className="text-gray-400 text-sm">尚無項目</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 提示訊息 */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <p className="text-sm text-primary-800">
          <strong>注意：</strong>修改字典表可能會影響現有的 Issue。建議在修改前先備份資料。
        </p>
      </div>
    </div>
  )
}
