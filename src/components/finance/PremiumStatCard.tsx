import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedCurrency, AnimatedCounter } from './AnimatedCounter'

interface PremiumStatCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  currency?: boolean
  suffix?: string
  color?: 'purple' | 'green' | 'blue' | 'amber' | 'red'
  sparklineData?: number[]
}

const colorClasses = {
  purple: {
    gradient: 'from-purple-500/10 to-purple-600/10',
    border: 'border-purple-200',
    icon: 'bg-purple-100 text-purple-600',
    trend: 'text-purple-600'
  },
  green: {
    gradient: 'from-emerald-500/10 to-emerald-600/10',
    border: 'border-emerald-200',
    icon: 'bg-emerald-100 text-emerald-600',
    trend: 'text-emerald-600'
  },
  blue: {
    gradient: 'from-blue-500/10 to-blue-600/10',
    border: 'border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    trend: 'text-blue-600'
  },
  amber: {
    gradient: 'from-amber-500/10 to-amber-600/10',
    border: 'border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    trend: 'text-amber-600'
  },
  red: {
    gradient: 'from-red-500/10 to-red-600/10',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-600',
    trend: 'text-red-600'
  }
}

export function PremiumStatCard({
  title,
  value,
  icon: Icon,
  trend,
  currency = false,
  suffix = '',
  color = 'purple',
  sparklineData = []
}: PremiumStatCardProps) {
  const colors = colorClasses[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -2 }}
    >
      <Card className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${colors.gradient} ${colors.border} border-2 shadow-sm hover:shadow-md transition-all duration-300`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <div className="text-2xl font-bold text-gray-900">
                {currency ? (
                  <AnimatedCurrency value={value} />
                ) : (
                  <AnimatedCounter value={value} suffix={suffix} />
                )}
              </div>
              {trend && (
                <div className={`flex items-center text-sm ${
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  <span className="mr-1">
                    {trend.isPositive ? '↗' : '↘'}
                  </span>
                  {trend.value}%
                </div>
              )}
            </div>
            
            <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>

          {/* Mini Sparkline */}
          {sparklineData.length > 0 && (
            <div className="mt-4 h-8">
              <MiniSparkline data={sparklineData} color={color} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Mini sparkline component
function MiniSparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  const strokeColor = {
    purple: '#7c3aed',
    green: '#10b981',
    blue: '#3b82f6',
    amber: '#f59e0b',
    red: '#ef4444'
  }[color] || '#7c3aed'

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
    </svg>
  )
}