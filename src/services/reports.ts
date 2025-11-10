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
  
  getTrend: (period: string, from?: string, to?: string) => {
    return api.get('/reports/trend/', { params: { period, from, to } })
  },
  
  getDimensions: (dim: string, metric: string, top: number = 10) => {
    return api.get('/reports/dimensions/', { params: { dim, metric, top } })
  },
}

