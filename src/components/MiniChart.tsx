import { useMemo } from 'react'

interface MiniChartProps {
  data: number[]
  color?: string
  height?: number
}

export default function MiniChart({ data, color = '#3B82F6', height = 40 }: MiniChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const max = Math.max(...data, 1) // 避免除以0
    const points = data.map((value, index) => ({
      x: (index / (data.length - 1 || 1)) * 100,
      y: 100 - (value / max) * 100,
    }))
    
    // 生成 SVG path
    const path = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')
    
    return { path, points }
  }, [data])

  if (!chartData) {
    return (
      <svg width="100%" height={height} className="opacity-50">
        <line x1="0" y1={height / 2} x2="100%" y2={height / 2} stroke={color} strokeWidth="1" />
      </svg>
    )
  }

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* 填充区域 */}
      <path
        d={`${chartData.path} L 100 100 L 0 100 Z`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      {/* 线条 */}
      <path
        d={chartData.path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

