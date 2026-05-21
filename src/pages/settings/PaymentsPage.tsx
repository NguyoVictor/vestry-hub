import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Building2,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentChannelSetupNew } from '@/components/finance/PaymentChannelSetupNew'
import { BankSelectionTest } from '@/components/finance/BankSelectionTest'
import { PayHeroDebugTest } from '@/components/finance/PayHeroDebugTest'
import { PayHeroCredentialsTest } from '@/components/finance/PayHeroCredentialsTest'
import { PayHeroAPITest } from '@/components/finance/PayHeroAPITest'
import { PayHeroComprehensiveTest } from '@/components/finance/PayHeroComprehensiveTest'
import { PaymentInfrastructureTest } from '@/components/finance/PaymentInfrastructureTest'
import { PayHeroBanksAPITest } from '@/components/finance/PayHeroBanksAPITest'
import { PayHeroSTKTest } from '@/components/finance/PayHeroSTKTest'
import { QuickPayHeroTest } from '@/components/finance/QuickPayHeroTest'
import { useChurch } from '@/contexts/ChurchContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// Premium page animations
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { type: 'spring', stiffness: 200, damping: 24 } 
  }
}

export default function PaymentsPage() {
  const [showSetup, setShowSetup] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [channelInfo, setChannelInfo] = useState<{
    payhero_connected?: boolean
    payhero_channel_type?: string
    payhero_channel_number?: string
    payhero_manual_setup?: boolean
    payhero_business_name?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const church = useChurch()

  useEffect(() => {
    checkConnectionStatus()
  }, [church.tenantId])

  const checkConnectionStatus = async () => {
    if (!church.tenantId) return

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('payhero_connected, payhero_channel_type, payhero_channel_number, payhero_manual_setup, payhero_business_name')
        .eq('id', church.tenantId)
        .single()

      if (error) throw error

      setIsConnected(data.payhero_connected || false)
      setChannelInfo(data)
    } catch (error) {
      console.error('Error checking connection status:', error)
      toast.error('Failed to check connection status')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setShowSetup(false)
    checkConnectionStatus()
    toast.success('Payment channel configured successfully! 🎉')
  }

  const getChannelDisplayName = () => {
    if (!channelInfo) return ''
    
    // Show business name for manual setup
    if (channelInfo.payhero_manual_setup && channelInfo.payhero_business_name) {
      return `${channelInfo.payhero_business_name} (Manual Setup)`
    }
    
    switch (channelInfo.payhero_channel_type) {
      case 'bank':
        return `Bank Account · ${channelInfo.payhero_channel_number}`
      case 'paybill':
        return `Paybill · ${channelInfo.payhero_channel_number}`
      case 'till':
        return `Till Number · ${channelInfo.payhero_channel_number}`
      default:
        return channelInfo.payhero_channel_number
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (showSetup) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 py-8"
      >
        <PaymentChannelSetupNew onComplete={handleSetupComplete} />
      </motion.div>
    )
  }

  return (
    <motion.div 
      variants={pageVariants} 
      initial="hidden" 
      animate="visible"
      className="space-y-8"
    >
      {/* Premium Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-slate-800 tracking-tight"
            >
              Payment Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 }}
              className="text-sm text-slate-500 mt-1"
            >
              Configure how your church receives donations and payments
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(107,70,193,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSetup(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/25"
            >
              <Plus className="w-4 h-4" />
              Configure Payments
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Connection Status Banner */}
      <motion.div variants={cardVariants}>
        <Card className={`relative overflow-hidden border-l-4 ${
          isConnected 
            ? 'border-l-green-500 bg-gradient-to-br from-green-50/80 to-green-50/40' 
            : 'border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-amber-50/40'
        } backdrop-blur-sm`}>
          {/* Subtle gradient orb */}
          <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl ${
            isConnected ? 'bg-green-500/10' : 'bg-amber-500/10'
          }`} />
          
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  {isConnected ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  )}
                </motion.div>
                <div>
                  <p className={`font-semibold ${
                    isConnected ? 'text-green-800' : 'text-amber-800'
                  }`}>
                    {isConnected 
                      ? channelInfo?.payhero_manual_setup 
                        ? `⚠️ Setup in Progress: ${getChannelDisplayName()}`
                        : `✅ Connected: Your church receives donations to ${getChannelDisplayName()}`
                      : '❌ Not connected: Set up your payment channel to enable M-Pesa giving'
                    }
                  </p>
                  {!isConnected && (
                    <p className="text-sm text-amber-700 mt-1">
                      Members won't be able to give online until you connect a payment method
                    </p>
                  )}
                  {isConnected && channelInfo?.payhero_manual_setup && (
                    <p className="text-sm text-amber-700 mt-1">
                      Manual PayHero setup required. Contact support to complete integration.
                    </p>
                  )}
                </div>
              </div>
              {!isConnected && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setShowSetup(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Set Up Payments
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Methods Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* M-Pesa Integration */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400 } }}
        >
          <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md shadow-lg shadow-purple-500/5">
            {/* Subtle gradient orb */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-green-500/10 blur-2xl" />
            
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-green-50">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-lg font-semibold">M-Pesa Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <p className="text-slate-600 text-sm">
                Accept donations directly through M-Pesa with instant confirmation
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className={`font-semibold ${
                    isConnected 
                      ? channelInfo?.payhero_manual_setup 
                        ? 'text-amber-600' 
                        : 'text-green-600'
                      : 'text-slate-400'
                  }`}>
                    {isConnected 
                      ? channelInfo?.payhero_manual_setup 
                        ? 'Setup in Progress' 
                        : 'Active'
                      : 'Not configured'
                    }
                  </span>
                </div>
                
                {isConnected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">Channel</span>
                    <span className="font-semibold text-slate-800">
                      {getChannelDisplayName()}
                    </span>
                  </motion.div>
                )}
              </div>

              <div className="pt-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant={isConnected ? "outline" : "default"}
                    onClick={() => setShowSetup(true)}
                    className={`w-full rounded-xl ${
                      !isConnected 
                        ? "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 shadow-lg" 
                        : "border-green-200 hover:bg-green-50"
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isConnected ? 'Manage Channel' : 'Set Up M-Pesa'}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cash Donations */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400 } }}
        >
          <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md shadow-lg shadow-slate-500/5">
            {/* Subtle gradient orb */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-slate-500/10 blur-2xl" />
            
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-50">
                  <Building2 className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-lg font-semibold">Cash Donations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <p className="text-slate-600 text-sm">
                Track and manage cash donations collected during services
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className="font-semibold text-green-600">Always Active</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Recording</span>
                  <span className="font-semibold text-slate-800">Manual Entry</span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full rounded-xl border-green-200 bg-green-50 text-green-700" disabled>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Already Configured
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* PayHero Information */}
      <motion.div variants={cardVariants}>
        <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md shadow-lg shadow-purple-500/5">
          {/* Subtle gradient orb */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl" />
          
          <CardHeader className="relative">
            <CardTitle className="text-lg font-semibold">About PayHero Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <p className="text-slate-600">
              VestryHub uses PayHero to process M-Pesa payments securely. PayHero is a licensed 
              payment service provider in Kenya that enables businesses to accept mobile money payments.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '⚡', title: 'Instant Processing', desc: 'Donations are processed immediately' },
                { icon: '🔒', title: 'Secure & Licensed', desc: 'Bank-grade security and compliance' },
                { icon: '📱', title: 'Member Friendly', desc: 'Simple STK push experience' }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center space-y-2"
                >
                  <div className="text-2xl">{feature.icon}</div>
                  <p className="font-semibold text-slate-800">{feature.title}</p>
                  <p className="text-sm text-slate-600">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Debug Components - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <motion.div variants={cardVariants}>
            <PayHeroBanksAPITest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PaymentInfrastructureTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PayHeroSTKTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <QuickPayHeroTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PayHeroComprehensiveTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PayHeroAPITest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PayHeroCredentialsTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <BankSelectionTest />
          </motion.div>
          
          <motion.div variants={cardVariants}>
            <PayHeroDebugTest />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}