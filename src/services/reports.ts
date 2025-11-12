import api from './api'

export interface DashboardSummary {
  total: number
  open: number
  in_progress: number
  closed: number
  pending: number
  avg_frt?: number
  avg_mttr?: number
  completion_rate?: number
  open_rate?: number
  in_progress_rate?: number
  pending_rate?: number
  trend_7days?: number[]
  change_percentage?: number
}

export const reportsApi = {
  getDashboard: () => {
    return api.get<DashboardSummary>('/reports/dashboard/')
  },
  
  getSummary: (year?: number) => {
    return api.get('/reports/summary/', { params: { year } })
  },
  
  getTrend: (period: string, options?: { year?: number; month?: number }) => {
    const params: Record<string, any> = { period }
    if (options?.year) params.year = options.year
    if (options?.month) params.month = options.month
    return api.get('/reports/trend/', { params })
  },
  
  getDimensions: (dim: string, metric: string, top: number = 10) => {
    return api.get('/reports/dimensions/', { params: { dim, metric, top } })
  },
}

