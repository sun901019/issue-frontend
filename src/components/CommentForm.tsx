import { useState } from 'react'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
}

export default function CommentForm({ onSubmit, onCancel }: CommentFormProps) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      setError('請輸入評論內容')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onSubmit(body)
      setBody('') // 清空表單
    } catch (err: any) {
      setError(err.response?.data?.detail || '提交失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="輸入除錯紀錄..."
        rows={6}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-3 text-sm"
      />
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '提交中...' : '提交'}
        </button>
      </div>
    </form>
  )
}

