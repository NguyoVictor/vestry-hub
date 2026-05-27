import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Building2,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 24 }
  }
}

const steps = [
  { number: 1, label: 'Daraja Credentials' },
  { number: 2, label: 'Payment Channel' },
  { number: 3, label: 'Review & Connect' }
]

export default function PaymentsPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [channelInfo, setChannelInfo] = useState<{
    payhero_connected?: boolean
    payhero_channel_type?: string
    payhero_channel_number?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [consumerKey, setConsumerKey] = useState('')
  const [consumerSecret, setConsumerSecret] = useState('')
  const [passkey, setPasskey] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showPasskey, setShowPasskey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [channelType, setChannelType] = useState<'paybill' | 'till' | null>(null)
  const [shortCode, setShortCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  const church = useChurch()

  useEffect(() => {
    checkConnectionStatus()
  }, [church.tenantId])

  const checkConnectionStatus = async () => {
    if (!church.tenantId) return
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('payhero_connected, payhero_channel_type, payhero_channel_number')
        .eq('id', church.tenantId)
        .single()
      if (error) throw error
      setIsConnected(data.payhero_connected || false)
      setChannelInfo(data)
    } catch (error) {
      console.error('Error checking connection status:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setConsumerKey('')
    setConsumerSecret('')
    setPasskey('')
    setShowSecret(false)
    setShowPasskey(false)
    setChannelType(null)
    setShortCode('')
    setConnectError('')
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL)
    setCopied(true)
    toast.success('Callback URL copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = async () => {
    setConnecting(true)
    setConnectError('')
    try {
      const transactionType = channelType === 'paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline'
      const { data, error } = await supabase.functions.invoke('register-credentials', {
        body: {
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          passkey,
          short_code: shortCode,
          transaction_type: transactionType,
          tenant_id: church.tenantId
        }
      })
      if (error) throw error
      if (data && !data.success) throw new Error(data.error || 'Connection failed')
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
        setShowWizard(false)
        resetWizard()
        checkConnectionStatus()
      }, 2500)
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect payment channel. Please check your credentials and try again.')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const inWizardMode = showWizard || !isConnected

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Payment Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure how your church receives donations and payments</p>
      </div>

      {/* M-Pesa Configuration — max 680px */}
      <div className="max-w-[680px]">
        {inWizardMode ? (
          /* ── STATE A: WIZARD ── */
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {/* Stepper */}
            <div className="mb-8">
              {/* Circles + lines */}
              <div className="flex items-center">
                {steps.map((step, index) => (
                  <React.Fragment key={step.number}>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all duration-300 ${
                        currentStep > step.number
                          ? 'bg-violet-600 text-white'
                          : currentStep === step.number
                          ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="h-0.5 flex-1 mx-2 bg-slate-200 overflow-hidden">
                        <motion.div
                          className="h-full bg-violet-600"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: currentStep > step.number ? 1 : 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          style={{ transformOrigin: 'left' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              {/* Labels row */}
              <div className="flex justify-between mt-2">
                {steps.map((step) => (
                  <span
                    key={step.number}
                    className={`text-xs font-medium ${
                      currentStep >= step.number ? 'text-violet-600' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Step content with slide transitions */}
            <AnimatePresence mode="wait">
              {/* ── STEP 1: DARAJA CREDENTIALS ── */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">
                    Enter your Safaricom Daraja credentials
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    These come from developer.safaricom.co.ke. Your credentials are encrypted and stored securely.
                  </p>

                  <div className="space-y-5">
                    {/* Consumer Key */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-sm font-medium text-slate-700">Consumer Key</label>
                        <div className="relative group">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          <div className="absolute left-5 top-0 w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                            Found in your Daraja app under API credentials
                          </div>
                        </div>
                      </div>
                      <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
                        <input
                          type="text"
                          value={consumerKey}
                          onChange={e => setConsumerKey(e.target.value)}
                          placeholder="Enter your consumer key"
                          className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                        />
                      </motion.div>
                    </div>

                    {/* Consumer Secret */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-sm font-medium text-slate-700">Consumer Secret</label>
                        <div className="relative group">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          <div className="absolute left-5 top-0 w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                            Found alongside your Consumer Key on Daraja
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={consumerSecret}
                            onChange={e => setConsumerSecret(e.target.value)}
                            placeholder="Enter your consumer secret"
                            className="w-full h-11 px-4 pr-11 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                          />
                        </motion.div>
                        <button
                          type="button"
                          onClick={() => setShowSecret(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Passkey */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-sm font-medium text-slate-700">Passkey</label>
                        <div className="relative group">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          <div className="absolute left-5 top-0 w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                            Provided by Safaricom when your app goes live on Daraja
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
                          <input
                            type={showPasskey ? 'text' : 'password'}
                            value={passkey}
                            onChange={e => setPasskey(e.target.value)}
                            placeholder="Enter your M-Pesa passkey"
                            className="w-full h-11 px-4 pr-11 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                          />
                        </motion.div>
                        <button
                          type="button"
                          onClick={() => setShowPasskey(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Callback URL — read-only */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1.5">Callback URL</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={WEBHOOK_URL}
                          readOnly
                          className="w-full h-11 px-4 pr-12 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-default focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyWebhook}
                          title="Copy callback URL"
                          className="absolute right-3 text-slate-400 hover:text-violet-600 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        Copy this URL and add it to your Daraja app configuration
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!consumerKey.trim() || !consumerSecret.trim() || !passkey.trim()}
                    className="w-full mt-6 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue →
                  </Button>
                </motion.div>
              )}

              {/* ── STEP 2: PAYMENT CHANNEL ── */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Choose your payment channel</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Select how your members' donations will reach you
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Paybill */}
                    <motion.div
                      whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(124,58,237,0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => { setChannelType('paybill'); setShortCode('') }}
                      className={`cursor-pointer rounded-xl p-5 transition-colors ${
                        channelType === 'paybill'
                          ? 'border-2 border-violet-600 bg-violet-50/50 shadow-sm'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-7 h-7 text-violet-600 mb-3" />
                      <p className="font-semibold text-slate-900 text-sm">Paybill Number</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        M-Pesa Paybill for donations. Members enter an account number.
                      </p>
                    </motion.div>

                    {/* Till */}
                    <motion.div
                      whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(124,58,237,0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => { setChannelType('till'); setShortCode('') }}
                      className={`cursor-pointer rounded-xl p-5 transition-colors ${
                        channelType === 'till'
                          ? 'border-2 border-violet-600 bg-violet-50/50 shadow-sm'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Smartphone className="w-7 h-7 text-violet-600 mb-3" />
                      <p className="font-semibold text-slate-900 text-sm">Till Number</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        M-Pesa Till for quick payments. No account number needed.
                      </p>
                    </motion.div>
                  </div>

                  {/* Short code input — slides in after channel selection */}
                  <AnimatePresence>
                    {channelType && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mt-5"
                      >
                        <label className="text-sm font-medium text-slate-700 block mb-1.5">
                          {channelType === 'paybill' ? 'Paybill Number' : 'Store Number (Till)'}
                        </label>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
                          <input
                            type="text"
                            value={shortCode}
                            onChange={e => setShortCode(e.target.value)}
                            placeholder={channelType === 'paybill' ? 'e.g. 247247' : 'e.g. 123456'}
                            className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 h-11 text-slate-600"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={!channelType || !shortCode.trim()}
                      className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue →
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: REVIEW & CONNECT ── */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Review and connect</h2>
                  <p className="text-sm text-slate-500 mb-6">Confirm your details before connecting</p>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3.5">
                    {[
                      { label: 'Consumer Key', value: consumerKey.substring(0, 8) + '••••••••' },
                      { label: 'Consumer Secret', value: '••••••••••••' },
                      { label: 'Passkey', value: '••••••••••••' },
                      { label: 'Channel Type', value: channelType === 'paybill' ? 'Paybill' : 'Till' },
                      { label: 'Short Code', value: shortCode },
                      { label: 'Callback URL', value: WEBHOOK_URL },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-6 text-sm">
                        <span className="text-slate-500 shrink-0">{label}</span>
                        <span className="font-medium text-slate-800 text-right break-all">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2.5 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Your credentials are encrypted and never stored in plain text. They are transmitted directly to PayHero's secure servers.
                    </p>
                  </div>

                  {connectError && (
                    <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                      {connectError}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(2)}
                      disabled={connecting}
                      className="flex-1 h-11 text-slate-600"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {connecting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        'Connect Payment Channel'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ── STATE B: CONNECTED VIEW ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="flex justify-center mb-4"
              >
                <CheckCircle2 style={{ color: '#22c55e', width: 40, height: 40 }} />
              </motion.div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">M-Pesa Payments Active</h2>
              <p className="text-sm text-slate-500 mb-6">
                Members can now donate directly via M-Pesa STK Push
              </p>

              <div className="space-y-3 max-w-xs mx-auto mb-6 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Channel Type</span>
                  <span className="font-medium text-slate-800 capitalize">
                    {channelInfo?.payhero_channel_type || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Short Code</span>
                  <span className="font-medium text-slate-800">
                    {channelInfo?.payhero_channel_number || '—'}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => { resetWizard(); setShowWizard(true) }}
                className="text-slate-600"
              >
                Manage Channel
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── CASH DONATIONS — preserved exactly ── */}
      <motion.div
        initial="hidden"
        animate="visible"
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

      {/* ── DEBUG COMPONENTS — development only ── */}
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

      {/* ── SUCCESS OVERLAY ── */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              >
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-2xl font-bold text-slate-900"
              >
                Payment channel connected!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-slate-500"
              >
                Members can now donate via M-Pesa STK Push
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
