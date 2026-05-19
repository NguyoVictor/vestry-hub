import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { toast as hotToast } from 'react-hot-toast'

interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  onDismiss: (id: string) => void
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
}

const toastColors = {
  success: {
    bg: 'from-emerald-500 to-green-600',
    icon: 'text-emerald-600',
    border: 'border-emerald-200',
    bgLight: 'bg-emerald-50'
  },
  error: {
    bg: 'from-red-500 to-red-600',
    icon: 'text-red-600',
    border: 'border-red-200',
    bgLight: 'bg-red-50'
  },
  warning: {
    bg: 'from-amber-500 to-orange-600',
    icon: 'text-amber-600',
    border: 'border-amber-200',
    bgLight: 'bg-amber-50'
  },
  info: {
    bg: 'from-blue-500 to-blue-600',
    icon: 'text-blue-600',
    border: 'border-blue-200',
    bgLight: 'bg-blue-50'
  }
}

export function PremiumToast({ id, type, title, message, duration = 4000, onDismiss }: ToastProps) {
  const Icon = toastIcons[type]
  const colors = toastColors[type]

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        duration: 0.4
      }}
      className={`relative max-w-sm w-full ${colors.bgLight} backdrop-blur-xl rounded-2xl border-2 ${colors.border} shadow-xl overflow-hidden`}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 pointer-events-none" />
      
      {/* Animated gradient bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${colors.bg}`}
      />

      <div className="relative p-4">
        <div className="flex items-start space-x-3">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              delay: 0.1 
            }}
            className={`flex-shrink-0 w-6 h-6 ${colors.icon}`}
          >
            <Icon className="w-full h-full" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-semibold text-gray-900"
            >
              {title}
            </motion.p>
            {message && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-600 mt-1"
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDismiss(id)}
            className="flex-shrink-0 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-full h-full" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Premium toast notification system
class PremiumToastManager {
  private toasts: Map<string, ToastProps> = new Map()
  private listeners: Set<() => void> = new Set()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  success(title: string, message?: string, duration?: number) {
    const id = Math.random().toString(36).substr(2, 9)
    this.toasts.set(id, {
      id,
      type: 'success',
      title,
      message,
      duration,
      onDismiss: this.dismiss.bind(this)
    })
    this.notify()
    return id
  }

  error(title: string, message?: string, duration?: number) {
    const id = Math.random().toString(36).substr(2, 9)
    this.toasts.set(id, {
      id,
      type: 'error',
      title,
      message,
      duration,
      onDismiss: this.dismiss.bind(this)
    })
    this.notify()
    return id
  }

  warning(title: string, message?: string, duration?: number) {
    const id = Math.random().toString(36).substr(2, 9)
    this.toasts.set(id, {
      id,
      type: 'warning',
      title,
      message,
      duration,
      onDismiss: this.dismiss.bind(this)
    })
    this.notify()
    return id
  }

  info(title: string, message?: string, duration?: number) {
    const id = Math.random().toString(36).substr(2, 9)
    this.toasts.set(id, {
      id,
      type: 'info',
      title,
      message,
      duration,
      onDismiss: this.dismiss.bind(this)
    })
    this.notify()
    return id
  }

  dismiss(id: string) {
    this.toasts.delete(id)
    this.notify()
  }

  getToasts() {
    return Array.from(this.toasts.values())
  }
}

export const premiumToast = new PremiumToastManager()

// Toast Container Component
export function PremiumToastContainer() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  React.useEffect(() => {
    const unsubscribe = premiumToast.subscribe(() => {
      setToasts(premiumToast.getToasts())
    })
    return unsubscribe
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <PremiumToast {...toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}