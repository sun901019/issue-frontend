import { useState } from 'react'

interface CommentFormProps {
  onSubmit: (data: { body: string; files: File[] }) => Promise<void>
  onCancel?: () => void
}

export default function CommentForm({ onSubmit, onCancel }: CommentFormProps) {
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      setError('請輸入紀錄內容')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onSubmit({ body: trimmed, files })
      setBody('')
      setFiles([])
    } catch (err: any) {
      setError(err.response?.data?.detail || '提交失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles])
    }
    e.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCancel = () => {
    setBody('')
    setFiles([])
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        className="w-full rounded-xl border-2 border-primary-200/80 bg-white px-4 py-3 text-sm text-gray-800 shadow-[0_1px_6px_rgba(15,23,42,0.08)] transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">附件（可選，多檔案）</label>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-gray-500 hover:text-primary-600"
              disabled={loading}
            >
              清除全部
            </button>
          )}
        </div>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={loading}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-600 hover:file:bg-primary-100"
        />
        {files.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between">
                <span className="truncate pr-3">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-xs text-danger-500 hover:text-danger-600"
                  disabled={loading}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
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

