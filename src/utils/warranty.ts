const MS_PER_DAY = 1000 * 60 * 60 * 24

export type WarrantyState = 'none' | 'active' | 'expiring' | 'expired'

export type WarrantyColor = 'neutral' | 'success' | 'warning' | 'danger'

export interface WarrantyStatus {
  state: WarrantyState
  label: string
  daysLeft: number | null
  color: WarrantyColor
  dueDate: Date | null
}

export function getWarrantyStatus(warrantyDue?: string | null): WarrantyStatus {
  if (!warrantyDue) {
    return {
      state: 'none',
      label: '未設定',
      daysLeft: null,
      color: 'neutral',
      dueDate: null,
    }
  }

  const dueDate = new Date(warrantyDue)
  if (Number.isNaN(dueDate.getTime())) {
    return {
      state: 'none',
      label: '未設定',
      daysLeft: null,
      color: 'neutral',
      dueDate: null,
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const diffDays = Math.ceil((dueMidnight.getTime() - today.getTime()) / MS_PER_DAY)

  if (diffDays < 0) {
    return {
      state: 'expired',
      label: `已過保 (${Math.abs(diffDays)} 天前)`,
      daysLeft: diffDays,
      color: 'danger',
      dueDate,
    }
  }

  if (diffDays === 0) {
    return {
      state: 'expiring',
      label: '今日到期',
      daysLeft: diffDays,
      color: 'warning',
      dueDate,
    }
  }

  if (diffDays <= 15) {
    return {
      state: 'expiring',
      label: `即將到期 (剩 ${diffDays} 天)`,
      daysLeft: diffDays,
      color: 'warning',
      dueDate,
    }
  }

  return {
    state: 'active',
    label: `保固中 (剩 ${diffDays} 天)`,
    daysLeft: diffDays,
    color: 'success',
    dueDate,
  }
}

