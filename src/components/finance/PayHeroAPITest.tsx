import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export function PayHeroAPITest() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const testPayHeroAPI = async () => {
    setTesting(true)
    setResults(null)

    try {
      // Test the register-payment-channel function with debug data
      const testData = {
        channel_type: 'bank',
        account_number: '0110183972349',
        business_name: 'Equity Bank Kenya',
        tenant_id: 'cdd71058-5a43-4f53-9484-801b75e4a138'
      }

      console.log('Testing PayHero API with data:', testData)

      const { data, error } = await supabase.functions.invoke('register-payment-channel', {
        body: testData
      })

      console.log('PayHero API test response:', { data, error })

      setResults({
        success: !error && data?.success,
        data,
        error: error?.message || data?.error || data?.details,
        rawError: error,
        rawData: data
      })

    } catch (err: any) {
      console.error('PayHero API test failed:', err)
      setResults({
        success: false,
        error: err.message,
        rawError: err
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          PayHero API Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Test the PayHero API integration with the same data that's failing.
        </p>

        <Button 
          onClick={testPayHeroAPI} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing PayHero API...
            </>
          ) : (
            'Test PayHero API'
          )}
        </Button>

        {results && (
          <div className="mt-4 space-y-3">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              results.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {results.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="font-medium">
                {results.success ? 'API Test Successful' : 'API Test Failed'}
              </span>
            </div>

            {results.error && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Error Message:</p>
                <p className="text-sm text-red-600 font-mono">{results.error}</p>
              </div>
            )}

            {results.data && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Response Data:</p>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            )}

            {results.rawError && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Raw Error:</p>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {JSON.stringify(results.rawError, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}