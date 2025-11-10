import { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { reportsApi, DashboardSummary } from '../services/reports'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface TrendData {
  period: string
  created: number
  closed: number
}

interface DimensionData {
  name: string
  count: number
  value?: number
}

export default function Reports() {
  const [kpis, setKpis] = useState<DashboardSummary>({
    total: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
    pending: 0,
  })
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [dimensionData, setDimensionData] = useState<DimensionData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [dimension, setDimension] = useState('customer')
  const [metric, setMetric] = useState('count')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  useEffect(() => {
    loadReports()
  }, [period, dimension, metric])

  const loadReports = async () => {
    setLoading(true)
    try {
      // 載入 KPI 數據
      const kpiRes = await reportsApi.getDashboard()
      setKpis(kpiRes.data)

      // 載入趨勢資料
      const trendRes = await reportsApi.getTrend(period)
      setTrendData(trendRes.data.data)

      // 載入維度分析
      const dimRes = await reportsApi.getDimensions(dimension, metric)
      setDimensionData(dimRes.data.top_n)
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setLoading(false)
    }
  }

  // 趨勢圖表資料（面積圖）
  const trendChartData = {
    labels: trendData.map(d => d.period),
    datasets: [
      {
        label: '建立',
        data: trendData.map(d => d.created),
        borderColor: 'rgb(59, 130, 246)', // primary-500
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: '完成',
        data: trendData.map(d => d.closed),
        borderColor: 'rgb(16, 185, 129)', // success-500
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  // 狀態分布圓環圖
  const statusChartData = {
    labels: ['待處理', '處理中', '已完成', '暫停'],
    datasets: [
      {
        data: [kpis.open, kpis.in_progress, kpis.closed, kpis.pending],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)', // warning
          'rgba(59, 130, 246, 0.8)', // primary
          'rgba(16, 185, 129, 0.8)', // success
          'rgba(156, 163, 175, 0.8)', // gray
        ],
        borderColor: [
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  }

  // 維度分析圖表資料
  const dimensionChartData = {
    labels: dimensionData.map(d => d.name),
    datasets: [
      {
        label: metric === 'count' ? '數量' : metric === 'mttr' ? 'MTTR (小時)' : 'FRT (小時)',
        data: dimensionData.map(d => metric === 'count' ? d.count : (d.value || 0)),
        backgroundColor: 'rgba(59, 130, 246, 0.6)', // primary-500
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  // 計算快速統計（本週）
  const now = new Date()
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  weekStart.setHours(0, 0, 0, 0)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">報表</h2>
          <p className="mt-1 text-sm text-gray-500">查看問題數量和解決率的趨勢分析</p>
        </div>
        <div className="text-xs text-gray-500">
          最後更新：{new Date().toLocaleString('zh-TW')}
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 總問題數 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-primary-50/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">總問題數</p>
              <p className="mt-2 text-3xl font-bold text-primary-600">{kpis.total}</p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 完成率 */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-success-50/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">完成率</p>
              <p className="mt-2 text-3xl font-bold text-success-600">
                {kpis.completion_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-success-100 to-success-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 平均 MTTR */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-info-50/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">平均 MTTR</p>
              <p className="mt-2 text-3xl font-bold text-info-600">
                {kpis.avg_mttr ? `${kpis.avg_mttr.toFixed(1)}h` : '-'}
              </p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-info-100 to-info-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 平均 FRT */}
        <div className="card card-hover relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">平均 FRT</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {kpis.avg_frt ? `${kpis.avg_frt.toFixed(1)}h` : '-'}
              </p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-sm">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 趨勢分析 - 左右分欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 主圖表區域（3/4） */}
        <div className="lg:col-span-3 card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">趨勢分析</h3>
            <div className="flex items-center space-x-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="day">日</option>
                <option value="week">週</option>
                <option value="month">月</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-2 text-sm ${
                    chartType === 'line'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  線性圖
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-2 text-sm ${
                    chartType === 'bar'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  長條圖
                </button>
              </div>
            </div>
          </div>
          <div className="h-96">
            {chartType === 'line' ? (
              <Line data={trendChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Issue 建立與完成趨勢',
                    font: { size: 16 },
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false,
                },
              }} />
            ) : (
              <Bar data={trendChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Issue 建立與完成趨勢',
                    font: { size: 16 },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }} />
            )}
          </div>
        </div>

        {/* 右側輔助信息（1/4） */}
        <div className="lg:col-span-1 space-y-6">
          {/* 快速統計 */}
          <div className="card">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">快速統計</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">待處理</span>
                <span className="text-lg font-bold text-warning-600">{kpis.open}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">處理中</span>
                <span className="text-lg font-bold text-primary-600">{kpis.in_progress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">已完成</span>
                <span className="text-lg font-bold text-success-600">{kpis.closed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">暫停</span>
                <span className="text-lg font-bold text-gray-600">{kpis.pending}</span>
              </div>
            </div>
          </div>

          {/* 狀態分布 */}
          <div className="card">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">狀態分布</h4>
            <div className="h-48">
              <Doughnut data={statusChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      boxWidth: 12,
                      padding: 8,
                      font: { size: 11 },
                    },
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
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 維度分析 - 左右分欄 */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">維度分析</h3>
          <div className="flex space-x-2">
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="customer">客戶</option>
              <option value="assignee">負責人</option>
              <option value="source">來源</option>
              <option value="category">類別</option>
            </select>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="count">數量</option>
              <option value="mttr">MTTR</option>
              <option value="frt">FRT</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 圖表區域 */}
          <div className="h-80">
            <Bar data={dimensionChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y', // 水平柱狀圖
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: true,
                  text: `Top ${dimensionData.length} ${dimension === 'customer' ? '客戶' : dimension === 'assignee' ? '負責人' : dimension === 'source' ? '來源' : '類別'}`,
                  font: { size: 14 },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                },
              },
            }} />
          </div>
          {/* 數據表格 */}
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {dimension === 'customer' ? '客戶' : dimension === 'assignee' ? '負責人' : dimension === 'source' ? '來源' : '類別'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {metric === 'count' ? '數量' : metric === 'mttr' ? 'MTTR (小時)' : 'FRT (小時)'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dimensionData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                      {metric === 'count' 
                        ? item.count 
                        : (item.value ? item.value.toFixed(2) : '-')
                      }
                    </td>
                  </tr>
                ))}
                {dimensionData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-500">
                      尚無數據
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
