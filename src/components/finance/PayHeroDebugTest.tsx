import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useChurch } from '@/contexts/ChurchContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Bug, CheckCircle, AlertCircle } from 'lucide-react'

export function PayHeroDebugTest() {
  const { tenantId } = useChurch()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    channelType: 'bank',
    accountNumber: '',
    businessName: 'Equity Bank Kenya'
  })

  const testPayHeroRegistration = async () => {
    if (!tenantId) {
      setResult({ error: 'No tenant ID available' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      console.log('Testing PayHero registration with:', {
        channel_type: formData.channelType,
        account_number: formData.accountNumber,
        business_name: formData.businessName,
        tenant_id: tenantId
      })

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/register-payment-channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_type: formData.channelType,
          account_number: formData.accountNumber,
          business_name: formData.businessName,
          tenant_id: tenantId
        })
      })

      const responseText = await response.text()
      console.log('Raw response:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        data = { error: 'Invalid JSON response', raw: responseText }
      }

      console.log('PayHero registration result:', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      })

      if (response.ok && data?.success) {
        setResult({ 
          success: true, 
          data,
          type: 'success'
        })
      } else {
        setResult({ 
          success: false, 
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
          details: data,
          type: response.status >= 500 ? 'server_error' : 'client_error',
          status: response.status
        })
      }
    } catch (error: any) {
      console.error('Test error:', error)
      setResult({ 
        success: false, 
        error: error.message,
        details: error,
        type: 'network_error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          PayHero Registration Debug Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Channel Type</Label>
            <Select 
              value={formData.channelType} 
              onValueChange={v => setFormData(p => ({...p, channelType: v}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="paybill">Paybill</SelectItem>
                <SelectItem value="till">Till Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={formData.accountNumber}
              onChange={e => setFormData(p => ({...p, accountNumber: e.target.value}))}
              placeholder="Enter account number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Business/Bank Name</Label>
          <Input
            value={formData.businessName}
            onChange={e => setFormData(p => ({...p, businessName: e.target.value}))}
            placeholder="Enter bank or business name"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={testPayHeroRegistration} 
            disabled={isLoading || !formData.accountNumber}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test PayHero Registration'
            )}
          </Button>
          
          <div className="text-sm text-gray-500">
            Tenant ID: {tenantId ? `${tenantId.substring(0, 8)}...` : 'Not available'}
          </div>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-medium ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.success ? 'Success' : 'Error'}
              </span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {result.type}
              </span>
            </div>
            
            {result.error && (
              <p className="text-sm text-red-600 mb-2">
                <strong>Error:</strong> {result.error}
              </p>
            )}
            
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                View Raw Response
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {JSON.stringify(result.details || result.data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Debug Info:</strong></p>
          <p>• This will test the exact same flow as the payment setup</p>
          <p>• Check browser console for detailed logs</p>
          <p>• View Supabase function logs for server-side debugging</p>
        </div>
      </CardContent>
    </Card>
  )
}