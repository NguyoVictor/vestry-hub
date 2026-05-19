import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  Building2, 
  Smartphone, 
  CheckCircle, 
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useChurch } from '@/contexts/ChurchContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface PaymentChannelSetupProps {
  onComplete: () => void
}

type ChannelType = 'bank' | 'paybill' | 'till'

const channelOptions = [
  {
    type: 'bank' as ChannelType,
    title: 'Bank Account',
    description: 'Direct bank account deposits',
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

export function PaymentChannelSetup({ onComplete }: PaymentChannelSetupProps) {
  const [step, setStep] = useState(1)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null)
  const [formData, setFormData] = useState({
    accountNumber: '',
    businessName: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const church = useChurch()

  const handleChannelSelect = (type: ChannelType) => {
    setSelectedChannel(type)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!selectedChannel || !formData.accountNumber || !church.tenantId) return

    setIsConnecting(true)

    try {
      const { data, error } = await supabase.functions.invoke('register-payment-channel', {
        body: {
          channel_type: selectedChannel,
          account_number: formData.accountNumber,
          business_name: formData.businessName,
          tenant_id: church.tenantId
        }
      })

      if (error) throw error

      setStep(3)
      
      // Show success after animation
      setTimeout(() => {
        toast.success('Payment channel connected successfully! 🎉')
        onComplete()
      }, 2000)

    } catch (error) {
      console.error('Error registering payment channel:', error)
      toast.error('Failed to connect payment channel. Please try again.')
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
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Enter Your Details
              </h2>
              <p className="text-gray-600">
                We'll connect this to your PayHero account
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">{getFieldLabel()}</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      accountNumber: e.target.value 
                    }))}
                    placeholder={`Enter your ${getFieldLabel().toLowerCase()}`}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">{getBusinessLabel()}</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      businessName: e.target.value 
                    }))}
                    placeholder={`Enter ${getBusinessLabel().toLowerCase()}`}
                    className="text-lg"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.accountNumber || isConnecting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Channel'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
              All Set! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Your payment channel has been connected successfully.
              Members can now make donations via M-Pesa.
            </p>

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