import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { issuesApi, Issue } from '../../services/issues'
import { useFilterStore } from '../../stores/filter'

interface KanbanColumn {
  id: string
  title: string
  issues: Issue[]
}

const STATUS_COLUMNS = [
  { id: 'Open', title: '待處理', color: 'bg-gray-100', textColor: 'text-gray-800' },
  { id: 'In Progress', title: '處理中', color: 'bg-primary-100', textColor: 'text-primary-800' },
  { id: 'Pending', title: '暫停', color: 'bg-warning-100', textColor: 'text-warning-800' },
  { id: 'Closed', title: '已完成', color: 'bg-success-100', textColor: 'text-success-800' },
]

export default function KanbanBoard() {
  const filter = useFilterStore()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadIssues()
  }, [filter.status, filter.priority, filter.category, filter.source, filter.assigneeId, filter.search, filter.dateFrom, filter.dateTo])

  const loadIssues = async () => {
    setLoading(true)
    try {
      const params: any = { page_size: 1000 } // 看板需要加载所有 Issue

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

      const res = await issuesApi.list(params)
      const issues = res.data.results

      // 按狀態分組
      const groupedColumns = STATUS_COLUMNS.map(statusCol => ({
        id: statusCol.id,
        title: statusCol.title,
        issues: issues.filter(issue => issue.status === statusCol.id),
      }))

      setColumns(groupedColumns)
    } catch (error) {
      console.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) {
      return
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId)
    const destinationColumn = columns.find(col => col.id === destination.droppableId)

    if (!sourceColumn || !destinationColumn) {
      return
    }

    const issue = sourceColumn.issues[source.index]
    const newStatus = destinationColumn.id

    // 如果狀態改變，更新 Issue
    if (issue.status !== newStatus) {
      try {
        // 樂觀更新 UI
        const newColumns = columns.map(col => {
          if (col.id === source.droppableId) {
            return {
              ...col,
              issues: col.issues.filter((_, idx) => idx !== source.index),
            }
          }
          if (col.id === destination.droppableId) {
            const newIssues = [...col.issues]
            newIssues.splice(destination.index, 0, { ...issue, status: newStatus })
            return {
              ...col,
              issues: newIssues,
            }
          }
          return col
        })
        setColumns(newColumns)

        // 呼叫 API 更新狀態
        await issuesApi.updateStatus(issue.id, newStatus)
      } catch (error) {
        console.error('Failed to update issue status:', error)
        // 如果失敗，重新載入
        loadIssues()
      }
    } else {
      // 只是重新排序（同一個欄位內）
      const newColumns = columns.map(col => {
        if (col.id === source.droppableId) {
          const newIssues = [...col.issues]
          const [removed] = newIssues.splice(source.index, 1)
          newIssues.splice(destination.index, 0, removed)
          return {
            ...col,
            issues: newIssues,
          }
        }
        return col
      })
      setColumns(newColumns)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} ${column.textColor} p-4 rounded-t-lg border-b-2 border-white`}>
                <h3 className="font-semibold text-gray-900">
                  {column.title}
                </h3>
                <span className="text-sm text-gray-600">
                  {column.issues.length} 個 Issue
                </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 bg-gray-50 p-3 rounded-b-lg min-h-[400px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary-50' : ''
                    }`}
                  >
                    {column.issues.map((issue, index) => (
                      <Draggable
                        key={issue.id}
                        draggableId={String(issue.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`card mb-2 cursor-move transition-all ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              #{issue.id} {issue.title}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded ${
                                issue.priority === 'High' ? 'priority-high' :
                                issue.priority === 'Medium' ? 'priority-medium' :
                                'priority-low'
                              }`}>
                                {issue.priority}
                              </span>
                              {issue.assignee_name && (
                                <span>{issue.assignee_name}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}

