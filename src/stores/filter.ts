import { create } from 'zustand'

export interface FilterState {
  dateFrom?: string
  dateTo?: string
  status: string[]
  priority: string[]
  category: string[]
  source: string[]
  projectId?: number
  customerId?: number
  assigneeId?: number
  search?: string
  
  setDateRange: (from?: string, to?: string) => void
  setStatus: (status: string[]) => void
  setPriority: (priority: string[]) => void
  setCategory: (category: string[]) => void
  setSource: (source: string[]) => void
  setProjectId: (id?: number) => void
  setCustomerId: (id?: number) => void
  setAssigneeId: (id?: number) => void
  setSearch: (search?: string) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  status: [],
  priority: [],
  category: [],
  source: [],
  
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  setCategory: (category) => set({ category }),
  setSource: (source) => set({ source }),
  setProjectId: (id) => set({ projectId: id }),
  setCustomerId: (id) => set({ customerId: id }),
  setAssigneeId: (id) => set({ assigneeId: id }),
  setSearch: (search) => set({ search }),
  reset: () => set({
    dateFrom: undefined,
    dateTo: undefined,
    status: [],
    priority: [],
    category: [],
    source: [],
    projectId: undefined,
    customerId: undefined,
    assigneeId: undefined,
    search: undefined,
  }),
}))

