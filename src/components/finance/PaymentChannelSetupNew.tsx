import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  Building2, 
  Smartphone, 
  CheckCircle, 
  ArrowRight,
  Loader2,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChurch } from '@/contexts/ChurchContext'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaymentSetupStep2 } from './PaymentSetupStep2'

interface PaymentChannelSetupProps {
  onComplete: () => void
}

type ChannelType = 'bank' | 'paybill' | 'till'

const channelOptions = [
  {
    type: 'bank' as ChannelType,
    title: 'Bank Account',
    description: 'Direct bank account deposits via M-Pesa',
    icon: Building2,
    color: 'from-blue-500 to-blue-600'
  },
  {
    type: 'paybill' as ChannelType,
    title: 'Paybill Number',
    description: 'M-Pesa Paybill for donations',
    icon: CreditCard,
    color: 'from-green-500 to-green-600'
  },
  {
    type: 'till' as ChannelType,
    title: 'Till Number',
    description: 'M-Pesa Till for quick payments',
    icon: Smartphone,
    color: 'from-purple-500 to-purple-600'
  }
]

export function PaymentChannelSetupNew({ onComplete }: PaymentChannelSetupProps) {
  const [step, setStep] = useState(1)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null)
  const [formData, setFormData] = useState({
    accountNumber: '',
    businessName: '',
    paybillNumber: '',
    beneficiary: '',
    searchTerm: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const church = useChurch()
  // Fetch PayHero banks when bank channel is selected
  const { data: payheroBanks = [], isLoading: banksLoading, error: banksError } = useQuery({
    queryKey: ['payhero-banks'],
    queryFn: async () => {
      console.log('Fetching PayHero banks...')
      const { data, error } = await supabase.functions.invoke('get-payhero-banks')
      if (error) {
        console.error('Error fetching PayHero banks:', error)
        throw error
      }
      console.log('PayHero banks fetched successfully:', data)
      return data.banks || []
    },
    staleTime: 300_000, // Cache for 5 minutes
    enabled: selectedChannel === 'bank',
    retry: 2
  })

  // Filter banks based on search term
  const filteredBanks = payheroBanks.filter(bank => 
    bank.name.toLowerCase().includes(formData.searchTerm.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(formData.searchTerm.toLowerCase())
  )

  const handleChannelSelect = (type: ChannelType) => {
    setSelectedChannel(type)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!selectedChannel || !formData.accountNumber || !church.tenantId) return

    // Enhanced validation based on channel type
    if (selectedChannel === 'bank') {
      if (!formData.businessName) {
        toast.error('Please select your bank')
        return
      }
      
      // Validate bank selection against PayHero list (if available)
      if (payheroBanks.length > 0) {
        const isValidBank = payheroBanks.some(bank => bank.name === formData.businessName)
        if (!isValidBank) {
          toast.error('Please select a valid bank from the list')
          return
        }
      }

      // For banks, beneficiary name is required
      if (!formData.beneficiary) {
        toast.error('Please enter the beneficiary name')
        return
      }
    } else if (selectedChannel === 'paybill' || selectedChannel === 'till') {
      // For paybill/till, beneficiary name is always required (maps to PayHero description field)
      if (!formData.beneficiary) {
        toast.error('Please enter the beneficiary name')
        return
      }
    }

    // Beneficiary name is required for ALL channel types (maps to PayHero description field)
    if (!formData.beneficiary || formData.beneficiary.trim().length < 2) {
      toast.error('Beneficiary name is required and must be at least 2 characters')
      return
    }
    setIsConnecting(true)

    try {
      const requestData = {
        channel_type: selectedChannel,
        account_number: formData.accountNumber,
        business_name: formData.businessName,
        tenant_id: church.tenantId,
        paybill_number: formData.paybillNumber,
        beneficiary: formData.beneficiary
      }

      console.log('Registering payment channel with data:', requestData)

      const { data, error } = await supabase.functions.invoke('register-payment-channel', {
        body: requestData
      })

      console.log('Payment channel registration response:', { data, error })

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (!data?.success) {
        console.error('Registration failed:', data)
        
        // Handle manual setup requirement
        if (data?.manual_setup_required) {
          setStep(3)
          
          // Show manual setup success message
          setTimeout(() => {
            toast.success('Channel information saved! Manual PayHero setup required.', {
              duration: 10000,
              description: 'Please configure your payment channel in PayHero dashboard and contact support to complete integration.',
              style: {
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '16px',
                fontWeight: '600'
              }
            })
            onComplete()
          }, 2000)
          
          return
        }
        
        // Show detailed error message
        const errorMessage = data?.error || 'Registration failed'
        const errorDetails = data?.details || 'Please check your information and try again'
        throw new Error(`${errorMessage}: ${errorDetails}`)
      }

      // Handle successful registration
      if (data?.success) {
        setStep(3)
        
        if (data?.setup_type === 'manual' || data?.manual_setup_required) {
          // Show manual setup success message
          setTimeout(() => {
            toast.success('Payment channel setup initiated! Manual setup required.', {
              duration: 8000,
              description: data?.next_steps?.join(' → ') || 'Our support team will contact you to complete the setup.',
              style: {
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '16px',
                fontWeight: '600'
              }
            })
            onComplete()
          }, 2000)
        } else {
          // Show regular success message
          setTimeout(() => {
            toast.success('Payment channel connected successfully! 🎉')
            onComplete()
          }, 2000)
        }
        
        return
      }

    } catch (error: any) {
      console.error('Error registering payment channel:', error)
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to connect payment channel. Please try again.'
      
      if (error.message) {
        if (error.message.includes('manual channel setup')) {
          errorMessage = 'PayHero requires manual setup. Please configure your channel in PayHero dashboard first, then contact support for integration.'
        } else if (error.message.includes('Invalid account number')) {
          errorMessage = 'Invalid account number. Please check your account details.'
        } else if (error.message.includes('Authentication failed')) {
          errorMessage = 'Payment service authentication failed. Please contact support.'
        } else if (error.message.includes('Channel type not supported')) {
          errorMessage = 'This channel type is not supported. Please try a different option.'
        } else if (error.message.includes('Missing required fields')) {
          errorMessage = 'Please fill in all required fields.'
        } else if (error.message !== 'Failed to connect payment channel. Please try again.') {
          errorMessage = error.message
        }
      }
      // Show detailed error in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Detailed error info:', {
          error,
          selectedChannel,
          formData,
          tenantId: church.tenantId
        })
        
        // Add debug info to error message in development
        errorMessage += ` (Debug: ${error.message || 'Unknown error'})`
      }
      
      toast.error(errorMessage, {
        duration: 8000,
        style: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      })
      
      setIsConnecting(false)
    }
  }

  const getFieldLabel = () => {
    switch (selectedChannel) {
      case 'bank': return 'Bank Account Number'
      case 'paybill': return 'Paybill Number'
      case 'till': return 'Till Number'
      default: return 'Account Number'
    }
  }

  const getBusinessLabel = () => {
    switch (selectedChannel) {
      case 'bank': return 'Bank Name'
      case 'paybill': return 'Business Name'
      case 'till': return 'Store Name'
      default: return 'Business Name'
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((num) => (
          <React.Fragment key={num}>
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= num 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}
              animate={{
                scale: step === num ? 1.1 : 1,
                backgroundColor: step >= num ? '#7c3aed' : '#e5e7eb'
              }}
              transition={{ duration: 0.3 }}
            >
              {step > num ? <CheckCircle className="w-4 h-4" /> : num}
            </motion.div>
            {num < 3 && (
              <div className={`w-12 h-0.5 mx-2 ${
                step > num ? 'bg-purple-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Your Payment Channel
              </h2>
              <p className="text-gray-600">
                Where should your members' donations go?
              </p>
            </div>

            <div className="grid gap-4">
              {channelOptions.map((option) => {
                const Icon = option.icon
                return (
                  <motion.div
                    key={option.type}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card 
                      className="cursor-pointer border-2 hover:border-purple-300 transition-colors"
                      onClick={() => handleChannelSelect(option.type)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${option.color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {option.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {option.description}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
        {step === 2 && (
          <PaymentSetupStep2
            selectedChannel={selectedChannel!}
            formData={formData}
            setFormData={setFormData}
            payheroBanks={payheroBanks}
            banksLoading={banksLoading}
            banksError={banksError}
            filteredBanks={filteredBanks}
            isConnecting={isConnecting}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Setup Initiated! 📋
            </h2>
            <p className="text-gray-600 mb-6">
              Your payment channel information has been saved. PayHero requires manual setup in their dashboard.
              Our support team will help you complete the integration.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-amber-800 mb-2">Next Steps:</h3>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Log into your PayHero merchant dashboard</li>
                <li>Configure the payment channel with your provided details</li>
                <li>Contact VestryHub support to complete the integration</li>
                <li>Provide your actual PayHero channel_id for live payments</li>
              </ol>
            </div>

            {/* Confetti Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl"
            >
              🎊 ✨ 🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}