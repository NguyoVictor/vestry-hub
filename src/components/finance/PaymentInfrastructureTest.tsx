import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useChurch } from '@/contexts/ChurchContext'
import { toast } from 'sonner'

export function PaymentInfrastructureTest() {
  const [isTestingSetup, setIsTestingSetup] = useState(false)
  const [isTestingSTK, setIsTestingSTK] = useState(false)
  const [testData, setTestData] = useState({
    channel_type: 'bank',
    account_number: '0110183972349',
    business_name: 'Equity Bank Kenya',
    paybill_number: '247247',
    amount: '100',
    phone_number: '254712345678'
  })
  const church = useChurch()

  const testChannelSetup = async () => {
    if (!church.tenantId) return
    
    setIsTestingSetup(true)
    try {
      console.log('Testing channel setup with:', testData)
      
      const { data, error } = await supabase.functions.invoke('register-payment-channel', {
        body: {
          channel_type: testData.channel_type,
          account_number: testData.account_number,
          business_name: testData.business_name,
          paybill_number: testData.paybill_number,
          tenant_id: church.tenantId
        }
      })

      console.log('Channel setup response:', { data, error })

      if (error) {
        toast.error(`Setup failed: ${error.message}`)
      } else if (data?.success) {
        if (data.manual_setup_required) {
          toast.success('✅ Manual setup flow working correctly!')
        } else {
          toast.success('✅ Channel setup successful!')
        }
      } else {
        toast.error('Setup failed: Unknown error')
      }
    } catch (error: any) {
      console.error('Setup test error:', error)
      toast.error(`Setup test failed: ${error.message}`)
    } finally {
      setIsTestingSetup(false)
    }
  }

  const testSTKPush = async () => {
    if (!church.tenantId) return
    
    setIsTestingSTK(true)
    try {
      console.log('Testing STK Push with:', {
        amount: testData.amount,
        phone_number: testData.phone_number,
        tenant_id: church.tenantId
      })
      
      const { data, error } = await supabase.functions.invoke('process-stk-push', {
        body: {
          amount: parseFloat(testData.amount),
          phone_number: testData.phone_number,
          tenant_id: church.tenantId,
          donor_name: 'Test Donor',
          giving_type: 'tithe'
        }
      })

      console.log('STK Push response:', { data, error })

      if (error) {
        toast.error(`STK Push failed: ${error.message}`)
      } else if (data?.success) {
        toast.success('✅ STK Push initiated successfully!')
      } else if (data?.setup_status === 'manual_setup_pending') {
        toast.warning('⚠️ Manual setup pending - this is expected!')
      } else {
        toast.error(`STK Push failed: ${data?.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('STK Push test error:', error)
      toast.error(`STK Push test failed: ${error.message}`)
    } finally {
      setIsTestingSTK(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Payment Infrastructure Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Channel Type</Label>
            <Input
              value={testData.channel_type}
              onChange={(e) => setTestData(prev => ({ ...prev, channel_type: e.target.value }))}
            />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input
              value={testData.account_number}
              onChange={(e) => setTestData(prev => ({ ...prev, account_number: e.target.value }))}
            />
          </div>
          <div>
            <Label>Business Name</Label>
            <Input
              value={testData.business_name}
              onChange={(e) => setTestData(prev => ({ ...prev, business_name: e.target.value }))}
            />
          </div>
          <div>
            <Label>Paybill Number</Label>
            <Input
              value={testData.paybill_number}
              onChange={(e) => setTestData(prev => ({ ...prev, paybill_number: e.target.value }))}
            />
          </div>
          <div>
            <Label>Test Amount (KES)</Label>
            <Input
              value={testData.amount}
              onChange={(e) => setTestData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label>Test Phone Number</Label>
            <Input
              value={testData.phone_number}
              onChange={(e) => setTestData(prev => ({ ...prev, phone_number: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={testChannelSetup}
            disabled={isTestingSetup}
            className="flex-1"
          >
            {isTestingSetup ? 'Testing Setup...' : 'Test Channel Setup'}
          </Button>
          <Button
            onClick={testSTKPush}
            disabled={isTestingSTK}
            variant="outline"
            className="flex-1"
          >
            {isTestingSTK ? 'Testing STK...' : 'Test STK Push'}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Expected Results:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Channel Setup: Should succeed with manual_setup_required = true</li>
            <li>STK Push: Should fail with "manual setup pending" message</li>
            <li>Both tests validate the new payment infrastructure flow</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}