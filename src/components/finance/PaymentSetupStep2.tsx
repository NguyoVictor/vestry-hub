import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaymentSetupStep2Props {
  selectedChannel: 'bank' | 'paybill' | 'till'
  formData: {
    accountNumber: string
    businessName: string
    paybillNumber: string
    beneficiary: string
    searchTerm: string
  }
  setFormData: (updater: (prev: any) => any) => void
  payheroBanks: any[]
  banksLoading: boolean
  banksError: any
  filteredBanks: any[]
  isConnecting: boolean
  onSubmit: () => void
  onBack: () => void
}

export function PaymentSetupStep2({
  selectedChannel,
  formData,
  setFormData,
  payheroBanks,
  banksLoading,
  banksError,
  filteredBanks,
  isConnecting,
  onSubmit,
  onBack
}: PaymentSetupStep2Props) {
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
          We'll register this with PayHero for M-Pesa integration
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Account Number Field */}
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
          {/* Bank Selection with Search */}
          {selectedChannel === 'bank' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="bankSelect">Select Your Bank</Label>
                {banksLoading ? (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600">Loading PayHero banks...</span>
                  </div>
                ) : banksError ? (
                  <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                    <p className="text-sm text-red-600 mb-2">Failed to load banks. Using manual entry:</p>
                    <Input
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        businessName: e.target.value 
                      }))}
                      placeholder="Enter your bank name"
                      className="text-lg"
                    />
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search banks..."
                        value={formData.searchTerm}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          searchTerm: e.target.value 
                        }))}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Bank Selection */}
                    <Select 
                      value={formData.businessName} 
                      onValueChange={v => setFormData(p => ({...p, businessName: v}))}
                    >
                      <SelectTrigger className="text-lg h-12">
                        <SelectValue placeholder="Choose your bank" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredBanks.map(bank => (
                          <SelectItem key={bank.id} value={bank.name} className="py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {bank.logo ? (
                                  <img 
                                    src={bank.logo} 
                                    alt={bank.shortName} 
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling.style.display = 'block'
                                    }}
                                  />
                                ) : null}
                                <Building2 className="w-4 h-4 text-gray-400" style={{ display: bank.logo ? 'none' : 'block' }} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{bank.shortName}</p>
                                <p className="text-xs text-gray-500 truncate">{bank.name}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                {payheroBanks.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Select from {filteredBanks.length} banks (filtered from {payheroBanks.length} total)
                  </p>
                )}
              </div>
              {/* Account Number (Optional) - matches PayHero portal */}
              <div className="space-y-2">
                <Label htmlFor="paybillNumber">Account Number (Optional)</Label>
                <Input
                  id="paybillNumber"
                  value={formData.paybillNumber}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    paybillNumber: e.target.value 
                  }))}
                  placeholder="Enter account number (if required)"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">
                  Optional account number field (leave blank if not required by your bank)
                </p>
              </div>
              
              {/* Beneficiary Name - matches PayHero portal */}
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary Name</Label>
                <Input
                  id="beneficiary"
                  value={formData.beneficiary}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    beneficiary: e.target.value 
                  }))}
                  placeholder="Name that appears on M-Pesa transactions"
                  className="text-lg"
                  required
                />
                <p className="text-xs text-gray-500">
                  This name will appear on members' M-Pesa transaction receipts
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Beneficiary Name - Primary field matching PayHero portal */}
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary Name</Label>
                <Input
                  id="beneficiary"
                  value={formData.beneficiary}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    beneficiary: e.target.value 
                  }))}
                  placeholder="Name that appears on M-Pesa transactions"
                  className="text-lg"
                  required
                />
                <p className="text-xs text-gray-500">
                  This name will appear on members' M-Pesa transaction receipts
                </p>
              </div>

              {/* Account Number (Optional) - matches PayHero portal */}
              <div className="space-y-2">
                <Label htmlFor="businessName">Account Number (Optional)</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    businessName: e.target.value 
                  }))}
                  placeholder="Enter account number (if required)"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">
                  Optional account number field (leave blank if not required)
                </p>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!formData.accountNumber || !formData.beneficiary || isConnecting}
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
  )
}