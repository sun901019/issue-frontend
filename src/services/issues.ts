import api from './api'

export interface WarrantyStatus {
  state: 'none' | 'active' | 'expiring' | 'expired'
  label: string
  days_left?: number | null
  color: 'gray' | 'success' | 'warning' | 'danger'
}

export interface WarrantyInfo {
  id: number
  title: string
  type: 'hardware' | 'software'
  end_date?: string | null
  status?: WarrantyStatus
}

export interface IssueCustomerWarranty {
  id: number
  type: 'hardware' | 'software'
  title: string
  end_date?: string | null
  notes?: string
  status?: WarrantyStatus
}

export interface IssueRelation {
  id: number
  related_issue: number
  related_issue_title: string
  relation_type: 'relates' | 'duplicates'
  created_at: string
}

export interface Issue {
  id: number
  title: string
  description: string
  category: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'In Progress' | 'Closed' | 'Pending'
  source: string
  project?: number
  project_name?: string
  customer?: number
  customer_name?: string
  customer_warranty_due?: string | null
  warranty?: number | null
  warranty_info?: WarrantyInfo | null
  assignee?: number
  assignee_name?: string
  reporter?: number
  reporter_name?: string
  due_date?: string
  warranty_due?: string
  hardware_warranty_status?: WarrantyStatus
  software_warranty_status?: WarrantyStatus
  hardware_warranties?: IssueCustomerWarranty[]
  software_warranties?: IssueCustomerWarranty[]
  relations?: IssueRelation[]
  first_response_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface IssueListParams {
  q?: string
  status?: string[]
  priority?: string[]
  category?: string[]
  source?: string[]
  project_id?: number
  customer_id?: number
  assignee_id?: number
  from?: string
  to?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface IssueListResponse {
  count: number
  results: Issue[]
}

export const issuesApi = {
  list: (params?: IssueListParams) => {
    return api.get<IssueListResponse>('/issues/', { params })
  },
  
  get: (id: number) => {
    return api.get<Issue>(`/issues/${id}/`)
  },
  
  create: (data: Partial<Issue>) => {
    return api.post<Issue>('/issues/', data)
  },
  
  update: (id: number, data: Partial<Issue>) => {
    return api.put<Issue>(`/issues/${id}/`, data)
  },
  
  delete: (id: number) => {
    return api.delete(`/issues/${id}/`)
  },
  
  updateStatus: (id: number, status: string) => {
    return api.patch<Issue>(`/issues/${id}/status/`, { status })
  },
  
  import: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/issues/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  export: (params?: IssueListParams) => {
    return api.get('/issues/export/', { params, responseType: 'blob' })
  },
  
  batchUpdate: (issueIds: number[], data: { status?: string; assignee_id?: number }) => {
    return api.post('/issues/batch-update/', {
      issue_ids: issueIds,
      ...data,
    })
  },
  
  getAttachments: (id: number) => {
    return api.get(`/issues/${id}/attachments/`)
  },
  
  uploadAttachment: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/issues/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  deleteAttachment: (id: number, attachmentId: number) => {
    return api.delete(`/issues/${id}/attachments/${attachmentId}/`)
  },

  createRelation: (id: number, data: { related_issue: number; relation_type: IssueRelation['relation_type'] }) => {
    return api.post(`/issues/${id}/relations/`, data)
  },

  deleteRelation: (id: number, relationId: number) => {
    return api.delete(`/issues/${id}/relations/${relationId}/`)
  },
}

