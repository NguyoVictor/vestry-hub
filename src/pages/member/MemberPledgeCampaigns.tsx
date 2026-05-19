import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useMemberPortal } from '@/contexts/MemberPortalContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import NumberFlow from "@/components/finance/AnimatedNumber";
import { 
  Heart, 
  Target, 
  Calendar, 
  TrendingUp, 
  Plus,
  Smartphone,
  Loader2,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  Users,
  DollarSign
} from 'lucide-react'
import { formatCurrencyFull } from '@/lib/format'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'

// Premium page animations with spring physics
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1], 
      staggerChildren: 0.08 
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 25 
    } 
  }
}

const floatingVariants = {
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export default function MemberPledgeCampaigns() {
  const member = useMemberPortal()
  const queryClient = useQueryClient()
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [showPledgeModal, setShowPledgeModal] = useState(false)
  const [pledgeAmount, setPledgeAmount] = useState('')
  const [frequency, setFrequency] = useState('one-time')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [phoneNumber, setPhoneNumber] = useState(member.phone || '')
  const [notes, setNotes] = useState('')
  const [stkPushState, setStkPushState] = useState<{
    isActive: boolean
    checkoutRequestId?: string
    countdown: number
  }>({ isActive: false, countdown: 150 })

  // Fetch active campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['member-pledge-campaigns', member.churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pledge_campaigns')
        .select(`
          *,
          pledge_commitments!inner(
            pledged_amount,
            paid_amount,
            member_id
          )
        `)
        .eq('tenant_id', member.churchId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      return data || []
    }
  })

  // Fetch member's commitments
  const { data: memberCommitments = [] } = useQuery({
    queryKey: ['member-commitments', member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pledge_commitments')
        .select(`
          *,
          pledge_campaigns(name, target_amount),
          pledge_payments(amount, payment_status, paid_at)
        `)
        .eq('member_id', member.memberId)
        .eq('tenant_id', member.churchId)
      
      return data || []
    }
  })

  // STK Push countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (stkPushState.isActive && stkPushState.countdown > 0) {
      interval = setInterval(() => {
        setStkPushState(prev => ({
          ...prev,
          countdown: prev.countdown - 1
        }))
      }, 1000)
    } else if (stkPushState.countdown === 0) {
      setStkPushState({ isActive: false, countdown: 150 })
      toast.error('Payment request expired. Please try again.')
    }
    return () => clearInterval(interval)
  }, [stkPushState.isActive, stkPushState.countdown])

  // Listen for payment confirmation
  useEffect(() => {
    if (!stkPushState.checkoutRequestId) return

    const channel = supabase.channel(`payment_updates_${member.churchId}`)
      .on('broadcast', { event: 'payment_update' }, (payload) => {
        if (payload.payload.checkout_request_id === stkPushState.checkoutRequestId) {
          setStkPushState({ isActive: false, countdown: 150 })
          
          if (payload.payload.status === 'confirmed') {
            toast.success('Pledge payment confirmed! 🎉')
            queryClient.invalidateQueries({ queryKey: ['member-commitments', member.memberId] })
            queryClient.invalidateQueries({ queryKey: ['member-pledge-campaigns', member.churchId] })
            setShowPledgeModal(false)
            resetForm()
          } else {
            toast.error('Payment was not completed. Please try again.')
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stkPushState.checkoutRequestId, member.churchId, member.memberId, queryClient])

  const resetForm = () => {
    setPledgeAmount('')
    setFrequency('one-time')
    setPaymentMethod('mpesa')
    setNotes('')
    setSelectedCampaign(null)
  }

  const makePledge = useMutation({
    mutationFn: async () => {
      // Create pledge commitment
      const { data: commitment, error: commitmentError } = await supabase
        .from('pledge_commitments')
        .insert({
          tenant_id: member.churchId,
          member_id: member.memberId,
          campaign_id: selectedCampaign.id,
          pledged_amount: Number(pledgeAmount),
          frequency,
          notes
        })
        .select()
        .single()

      if (commitmentError) throw commitmentError

      // If M-Pesa and immediate payment, trigger STK Push
      if (paymentMethod === 'mpesa') {
        const { data, error } = await supabase.functions.invoke('initiate-payment', {
          body: {
            amount: Number(pledgeAmount),
            phone_number: phoneNumber,
            channel_id: 8272,
            customer_name: `${member.firstName} ${member.lastName}`,
            giving_category: 'pledge',
            tenant_id: member.churchId,
            member_id: member.memberId,
            campaign_id: selectedCampaign.id,
            commitment_id: commitment.id,
            type: 'pledge'
          }
        })

        if (error) throw error

        setStkPushState({
          isActive: true,
          checkoutRequestId: data.checkout_request_id,
          countdown: 150
        })
      } else {
        // Cash pledge - just create commitment
        toast.success('Pledge commitment created successfully! 🎉', {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '16px',
            fontWeight: '600'
          }
        })
        queryClient.invalidateQueries({ queryKey: ['member-commitments', member.memberId] })
        setShowPledgeModal(false)
        resetForm()
      }

      return commitment
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create pledge', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      })
    }
  })

  const calculateProgress = (campaign: any) => {
    const totalRaised = campaign.pledge_commitments?.reduce(
      (sum: number, commitment: any) => sum + (commitment.paid_amount || 0), 
      0
    ) || 0
    return Math.min((totalRaised / campaign.target_amount) * 100, 100)
  }

  const getDaysRemaining = (endDate: string) => {
    return Math.max(0, differenceInDays(new Date(endDate), new Date()))
  }

  const getMemberCommitment = (campaignId: string) => {
    return memberCommitments.find(c => c.campaign_id === campaignId)
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (campaignsLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full mx-auto"
          />
          <Skeleton className="h-8 w-64 mx-auto rounded-xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Skeleton className="h-80 rounded-2xl" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <Helmet><title>Pledge Campaigns — Vestry</title></Helmet>
      
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible"
        className="space-y-8"
      >
        {/* Premium Header with Floating Elements */}
        <motion.div
          variants={cardVariants}
          className="relative text-center space-y-4 py-8"
        >
          {/* Background Gradient Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="absolute top-4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"
            />
            <motion.div
              variants={floatingVariants}
              animate="animate"
              style={{ animationDelay: '2s' }}
              className="absolute top-8 right-1/3 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"
            />
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 mb-4"
          >
            <Target className="h-8 w-8 text-white" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-purple-400/30 blur-md"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
          >
            Pledge Campaigns
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 max-w-md mx-auto"
          >
            Commit to a cause and track your progress with our community
          </motion.p>
        </motion.div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <motion.div
            variants={cardVariants}
            className="relative"
          >
            <Card className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardContent className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Target className="h-10 w-10 text-gray-400" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No active campaigns</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Check back later for new pledge opportunities to support our church community
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {campaigns.map((campaign, index) => {
              const progress = calculateProgress(campaign)
              const daysRemaining = getDaysRemaining(campaign.end_date)
              const memberCommitment = getMemberCommitment(campaign.id)
              const totalRaised = campaign.pledge_commitments?.reduce(
                (sum: number, c: any) => sum + (c.paid_amount || 0), 
                0
              ) || 0
              const pledgeCount = campaign.pledge_commitments?.length || 0

              return (
                <motion.div
                  key={campaign.id}
                  variants={cardVariants}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.02,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="group"
                >
                  <Card className="relative h-full rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                    {/* Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    
                    {/* Campaign Header with Category Gradient */}
                    <div className={`relative h-28 bg-gradient-to-r ${
                      campaign.category === 'building' ? 'from-blue-500 via-blue-600 to-blue-700' :
                      campaign.category === 'missions' ? 'from-green-500 via-green-600 to-green-700' :
                      campaign.category === 'welfare' ? 'from-amber-500 via-amber-600 to-amber-700' :
                      'from-purple-500 via-purple-600 to-purple-700'
                    } p-6 text-white overflow-hidden`}>
                      {/* Floating particles */}
                      <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                          animate={{ 
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{ duration: 8, repeat: Infinity }}
                          className="absolute top-4 right-4 w-2 h-2 bg-white/40 rounded-full"
                        />
                        <motion.div
                          animate={{ 
                            x: [0, -80, 0],
                            y: [0, 30, 0],
                            opacity: [0.2, 0.5, 0.2]
                          }}
                          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                          className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-white/30 rounded-full"
                        />
                      </div>

                      <div className="relative z-10">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200, delay: index * 0.1 + 0.3 }}
                        >
                          <Badge variant="secondary" className="bg-white/25 text-white border-white/30 mb-3 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {campaign.category?.replace('_', ' ') || 'General'}
                          </Badge>
                        </motion.div>
                        <h3 className="font-bold text-xl leading-tight">{campaign.name}</h3>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-6 relative">
                      {/* Description */}
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                        {campaign.description}
                      </p>

                      {/* Progress Section with Animation */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Campaign Progress</span>
                          <motion.span 
                            className="font-bold text-purple-600"
                            key={progress}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {progress.toFixed(1)}%
                          </motion.span>
                        </div>
                        
                        <div className="relative">
                          <Progress 
                            value={progress} 
                            className="h-3 bg-gray-100 rounded-full overflow-hidden"
                          />
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent rounded-full"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              <NumberFlow 
                                value={totalRaised} 
                                format={{ 
                                  style: 'currency', 
                                  currency: 'KES',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }}
                                transformTiming={{ duration: 1000, easing: 'ease-out' }}
                              />
                            </span>
                            <span className="text-gray-500">raised</span>
                          </div>
                          <span className="text-gray-500 text-xs">
                            of {formatCurrencyFull(campaign.target_amount, 'KES')}
                          </span>
                        </div>
                      </div>

                      {/* Campaign Stats */}
                      <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{daysRemaining} days left</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            <NumberFlow 
                              value={pledgeCount} 
                              transformTiming={{ duration: 800 }}
                            /> pledges
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={() => {
                            setSelectedCampaign(campaign)
                            setShowPledgeModal(true)
                          }}
                          className={`w-full h-12 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                            memberCommitment 
                              ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 shadow-lg shadow-green-500/25' 
                              : 'bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25'
                          }`}
                        >
                          {memberCommitment ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              View My Pledge
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Make a Pledge
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Premium Pledge Modal */}
      <AnimatePresence>
        {showPledgeModal && selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/20"
            >
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 pointer-events-none" />
              
              {/* Floating gradient orbs */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />

              <div className="relative p-8 space-y-8">
                {/* Premium Header */}
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25"
                  >
                    <Heart className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                      {selectedCampaign.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedCampaign.description}</p>
                  </div>
                </div>

                {/* Premium Form */}
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Label htmlFor="pledgeAmount" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Pledge Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="pledgeAmount"
                        type="number"
                        value={pledgeAmount}
                        onChange={(e) => setPledgeAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="h-14 text-xl text-center rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm shadow-inner"
                        min="1"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Frequency</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ['one-time', 'One-Time'],
                        ['weekly', 'Weekly'],
                        ['monthly', 'Monthly']
                      ].map(([value, label]) => (
                        <motion.button
                          key={value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFrequency(value)}
                          className={`py-3 rounded-2xl text-sm font-medium border-2 transition-all duration-300 ${
                            frequency === value
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white border-purple-600 shadow-lg shadow-purple-500/25'
                              : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 bg-white/60 backdrop-blur-sm'
                          }`}
                        >
                          {label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['mpesa', 'M-Pesa', Smartphone],
                        ['cash', 'Cash', DollarSign]
                      ].map(([value, label, Icon]) => (
                        <motion.button
                          key={value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPaymentMethod(value)}
                          className={`py-4 rounded-2xl text-sm font-medium border-2 transition-all duration-300 flex items-center justify-center space-x-2 ${
                            paymentMethod === value
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white border-purple-600 shadow-lg shadow-purple-500/25'
                              : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 bg-white/60 backdrop-blur-sm'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {paymentMethod === 'mpesa' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -20 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="space-y-3"
                    >
                      <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">
                        M-Pesa Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0712345678"
                          className="h-12 rounded-2xl border-2 border-gray-100 focus:border-green-300 bg-white/80 backdrop-blur-sm pl-12"
                        />
                        <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Personal Note <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a personal note or dedication"
                      className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm"
                    />
                  </motion.div>
                </div>

                {/* Premium Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex space-x-4 pt-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPledgeModal(false)
                        resetForm()
                      }}
                      className="w-full h-12 rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm font-semibold"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      onClick={() => makePledge.mutate()}
                      disabled={!pledgeAmount || Number(pledgeAmount) <= 0 || makePledge.isPending}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-white border-0"
                    >
                      {makePledge.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Pledge...
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-2" />
                          Commit to Pledge
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium STK Push Modal */}
      <AnimatePresence>
        {stkPushState.isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-sm w-full text-center space-y-8 shadow-2xl border border-white/20"
            >
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl pointer-events-none" />
              
              {/* Floating gradient orbs */}
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-500/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />

              <div className="relative z-10 space-y-8">
                {/* Animated Phone Icon */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 8, -8, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                    <Smartphone className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Pulsing rings */}
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-3xl border-2 border-green-400"
                  />
                  <motion.div
                    animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 rounded-3xl border-2 border-green-300"
                  />
                </motion.div>

                <div className="space-y-4">
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                  >
                    Complete your pledge 📱
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-600 leading-relaxed"
                  >
                    Enter your M-Pesa PIN on your phone to confirm your pledge payment
                  </motion.p>
                </div>

                {/* Countdown Timer */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center space-x-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/50 backdrop-blur-sm"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="w-5 h-5 text-amber-600" />
                  </motion.div>
                  <span className="font-mono text-lg font-bold text-amber-700">
                    {formatCountdown(stkPushState.countdown)}
                  </span>
                  <span className="text-sm text-amber-600 font-medium">remaining</span>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStkPushState({ isActive: false, countdown: 150 })}
                    className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-2xl h-12 font-medium"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Payment
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}