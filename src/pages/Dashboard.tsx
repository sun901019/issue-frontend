import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { issuesApi, Issue } from '../services/issues'
import { reportsApi, DashboardSummary } from '../services/reports'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import MiniChart from '../components/MiniChart'
import CircularProgress from '../components/CircularProgress'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function Dashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<DashboardSummary>({
    total: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
    pending: 0,
  })
  const [recentIssues, setRecentIssues] = useState<Issue[]>([])
  const [trendData, setTrendData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // 載入 KPI 數據
      const kpiRes = await reportsApi.getDashboard()
      setKpis(kpiRes.data)

      // 載入趨勢數據（7天）
      const trendRes = await reportsApi.getTrend('day')
      setTrendData(trendRes.data)

      // 載入最近更新
      const issuesRes = await issuesApi.list({ page_size: 10 })
      setRecentIssues(issuesRes.data.results)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">查看系統整體狀況與關鍵指標</p>
        </div>
        <div className="text-xs text-gray-500">
          最後更新：{new Date().toLocaleString('zh-TW')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 總問題數 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-primary-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">總問題數</p>
              <p className="mt-2 text-3xl font-bold text-primary-600">{kpis.total}</p>
              {kpis.change_percentage !== undefined && (
                <div className="flex items-center mt-2 text-xs">
                  <span className={`flex items-center ${
                    kpis.change_percentage >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    <svg className={`w-4 h-4 mr-1 ${kpis.change_percentage < 0 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {Math.abs(kpis.change_percentage).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs 上週</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          {kpis.trend_7days && kpis.trend_7days.length > 0 && (
            <div className="mt-3 -mx-6 -mb-6">
              <MiniChart data={kpis.trend_7days} color="#3B82F6" height={50} />
            </div>
          )}
        </div>
        
        {/* 待處理 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-warning-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">待處理</p>
              <p className="mt-2 text-3xl font-bold text-warning-600">{kpis.open}</p>
              {kpis.total > 0 && (
                <div className="mt-2">
                  <CircularProgress 
                    percentage={(kpis.open / kpis.total) * 100} 
                    size={50}
                    color="#F59E0B"
                    showLabel={false}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-warning-100 to-warning-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* 處理中 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-primary-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">處理中</p>
              <p className="mt-2 text-3xl font-bold text-primary-600">{kpis.in_progress}</p>
              {kpis.total > 0 && (
                <div className="mt-2">
                  <CircularProgress 
                    percentage={(kpis.in_progress / kpis.total) * 100} 
                    size={50}
                    color="#3B82F6"
                    showLabel={false}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* 已完成 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-success-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">已完成</p>
              <p className="mt-2 text-3xl font-bold text-success-600">{kpis.closed}</p>
              {kpis.completion_rate !== undefined && (
                <div className="mt-2">
                  <CircularProgress 
                    percentage={kpis.completion_rate} 
                    size={50}
                    color="#10B981"
                    showLabel={true}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-success-100 to-success-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：左右分栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側：快速操作 */}
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">快速操作</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/issues')}
                className="w-full flex items-center space-x-3 px-4 py-3 border-2 border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-500 transition-all text-left"
              >
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span className="text-sm font-medium text-gray-700">查看問題看板</span>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-3 px-4 py-3 border-2 border-success-300 rounded-lg hover:bg-success-50 hover:border-success-500 transition-all text-left"
              >
                <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">年度報表查詢</span>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-3 px-4 py-3 border-2 border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-500 transition-all text-left"
              >
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">趨勢分析查詢</span>
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  window.open(`/api/issues/export/?${params.toString()}`, '_blank')
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-left"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">匯出報表數據</span>
              </button>
            </div>
          </div>

          {/* 系統資訊 */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">系統資訊</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">系統版本</span>
                <span className="font-medium text-gray-900">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">數據統計</span>
                <span className="font-medium text-gray-900">即時</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">總 Issue 數</span>
                <span className="font-medium text-primary-600">{kpis.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">完成率</span>
                <span className="font-medium text-success-600">
                  {kpis.completion_rate !== undefined ? `${kpis.completion_rate}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：主要內容區域 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 第一行：狀態分布圖和指標卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 狀態分布圖 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">狀態分布</h3>
              <div className="flex items-center justify-center h-48">
                <Doughnut
                  data={{
                    labels: ['待處理', '處理中', '已完成', '暫停'],
                    datasets: [
                      {
                        data: [kpis.open, kpis.in_progress, kpis.closed, kpis.pending],
                        backgroundColor: [
                          'rgba(156, 163, 175, 0.8)', // gray for Open
                          'rgba(59, 130, 246, 0.8)',  // blue for In Progress
                          'rgba(16, 185, 129, 0.8)',  // green for Closed
                          'rgba(245, 158, 11, 0.8)',  // yellow for Pending
                        ],
                        borderColor: [
                          'rgb(156, 163, 175)',
                          'rgb(59, 130, 246)',
                          'rgb(16, 185, 129)',
                          'rgb(245, 158, 11)',
                        ],
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const label = context.label || ''
                            const value = context.parsed || 0
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                            return `${label}: ${value} (${percentage}%)`
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* 指標卡片 */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card bg-gradient-to-br from-primary-50/50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">平均首次回應時間 (FRT)</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {kpis.avg_frt !== null && kpis.avg_frt !== undefined 
                    ? `${kpis.avg_frt.toFixed(1)} 小時`
                    : '無資料'}
                </p>
              </div>
              
              <div className="card bg-gradient-to-br from-success-50/50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-success-100 to-success-200 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">平均解決時間 (MTTR)</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {kpis.avg_mttr !== null && kpis.avg_mttr !== undefined 
                    ? `${kpis.avg_mttr.toFixed(1)} 小時`
                    : '無資料'}
                </p>
              </div>
            </div>
          </div>

          {/* 第二行：趨勢圖表 */}
          {trendData && trendData.data && trendData.data.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">7天趨勢分析</h3>
              <div className="h-48">
                <Line
                  data={{
                    labels: trendData.data.map((d: any) => d.period),
                    datasets: [
                      {
                        label: '建立',
                        data: trendData.data.map((d: any) => d.created),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                      },
                      {
                        label: '完成',
                        data: trendData.data.map((d: any) => d.closed),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgb(16, 185, 129)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            return `${context.dataset.label}: ${Math.round(context.parsed.y)} 個`
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                          callback: function(value: any) {
                            return Math.round(value) + ' 個'
                          },
                        },
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* 第三行：最近更新（卡片列表形式） */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">最近更新</h3>
              </div>
              <button
                onClick={() => navigate('/issues')}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                查看全部 →
              </button>
            </div>
            <div className="space-y-3">
              {recentIssues.length > 0 ? (
                recentIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-all cursor-pointer"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">{issue.title}</h4>
                        <span className="text-xs text-gray-500">{issue.category}</span>
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(issue.updated_at).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {issue.assignee_name && (
                          <span className="text-xs text-gray-500">負責人: {issue.assignee_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {issue.status === 'Open' && <span className="status-open">待處理</span>}
                      {issue.status === 'In Progress' && <span className="status-in-progress">處理中</span>}
                      {issue.status === 'Closed' && <span className="status-closed">已完成</span>}
                      {issue.status === 'Pending' && <span className="status-pending">暫停</span>}
                      {issue.priority === 'High' && <span className="priority-high">高</span>}
                      {issue.priority === 'Medium' && <span className="priority-medium">中</span>}
                      {issue.priority === 'Low' && <span className="priority-low">低</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">尚無最近更新</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

