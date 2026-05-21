import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export function PayHeroBanksAPITest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testBanksAPI = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      console.log('Testing PayHero banks API...')
      
      const { data, error } = await supabase.functions.invoke('get-payhero-banks')
      
      console.log('Banks API response:', { data, error })
      
      if (error) {
        toast.error(`API test failed: ${error.message}`)
        setResult({ error: error.message })
      } else {
        toast.success(`✅ Banks API test successful! Found ${data.count} banks from ${data.source}`)
        setResult(data)
      }
    } catch (error: any) {
      console.error('Banks API test error:', error)
      toast.error(`Test failed: ${error.message}`)
      setResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>PayHero Banks API Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={testBanksAPI}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing Banks API...' : 'Test PayHero Banks API'}
        </Button>

        {result && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">API Response:</h3>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.banks && result.banks.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Banks Found ({result.count}):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.banks.slice(0, 10).map((bank: any, index: number) => (
                    <div key={index} className="bg-white border rounded p-3">
                      <div className="font-medium">{bank.name || bank.shortName}</div>
                      {bank.paybill && (
                        <div className="text-sm text-gray-600">Paybill: {bank.paybill}</div>
                      )}
                      {bank.code && (
                        <div className="text-sm text-gray-500">Code: {bank.code}</div>
                      )}
                    </div>
                  ))}
                </div>
                {result.banks.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... and {result.banks.length - 10} more banks
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Test Details:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tests the official endpoint: GET https://backend.payhero.co.ke/api/v2/bank_paybills</li>
            <li>Falls back to /api/v2/banks and /api/v2/institutions if needed</li>
            <li>Uses curated bank list if all PayHero endpoints fail</li>
            <li>Shows source of data (PayHero Official API vs fallback)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}