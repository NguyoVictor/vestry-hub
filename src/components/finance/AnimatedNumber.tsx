import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format?: {
    style?: 'currency' | 'decimal'
    currency?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
  transformTiming?: {
    duration?: number
    easing?: string
  }
}

export function AnimatedNumber({ 
  value, 
  format = {}, 
  transformTiming = { duration: 1000, easing: 'ease-out' } 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startValue = displayValue
    const endValue = value
    const duration = transformTiming.duration || 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue + (endValue - startValue) * easeOut
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, transformTiming.duration])

  const formatNumber = (num: number) => {
    if (format.style === 'currency') {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: format.currency || 'KES',
        minimumFractionDigits: format.minimumFractionDigits || 0,
        maximumFractionDigits: format.maximumFractionDigits || 0
      }).format(num)
    }
    
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: format.minimumFractionDigits || 0,
      maximumFractionDigits: format.maximumFractionDigits || 0
    }).format(num)
  }

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.1 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
    >
      {formatNumber(displayValue)}
    </motion.span>
  )
}

// Fallback component that matches NumberFlow API
export default function NumberFlow(props: AnimatedNumberProps) {
  return <AnimatedNumber {...props} />
}