import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export const formatDate = (date: string | Date, formatStr: string = 'yyyy-MM-dd') => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: zhTW })
}

export const formatDateTime = (date: string | Date) => {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss')
}

