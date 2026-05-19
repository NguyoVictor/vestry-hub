import React, { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 2000, 
  prefix = '', 
  suffix = '', 
  decimals = 0,
  className = ''
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { 
    stiffness: 100, 
    damping: 30,
    duration: duration 
  })

  const display = useTransform(spring, (current) => {
    return prefix + current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix
  })

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {display}
    </motion.span>
  )
}

// Specialized version for currency
export function AnimatedCurrency({ 
  value, 
  currency = 'KSh', 
  className = '',
  ...props 
}: Omit<AnimatedCounterProps, 'prefix'> & { currency?: string }) {
  return (
    <AnimatedCounter
      value={value}
      prefix={`${currency} `}
      decimals={0}
      className={className}
      {...props}
    />
  )
}