import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Key, CheckCircle, AlertCircle } from 'lucide-react'

export function PayHeroCredentialsTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testPayHeroCredentials = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Test if we can call the get-supported-banks function which tests PayHero API
      const { data, error } = await supabase.functions.invoke('get-supported-banks')

      console.log('PayHero credentials test result:', { data, error })

      if (error) {
        setResult({ 
          success: false, 
          error: error.message,
          details: error,
          type: 'function_error'
        })
      } else {
        setResult({ 
          success: true, 
          data,
          type: 'success',
          payhero_available: data?.source === 'payhero_api' || data?.source === 'payhero_institutions'
        })
      }
    } catch (error: any) {
      console.error('Credentials test error:', error)
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
          <Key className="w-5 h-5" />
          PayHero Credentials & API Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={testPayHeroCredentials} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test PayHero API Access'
            )}
          </Button>
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
                {result.success ? 'API Access Working' : 'API Access Failed'}
              </span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {result.type}
              </span>
            </div>
            
            {result.success && (
              <div className="space-y-2 text-sm">
                <p className={`${
                  result.payhero_available ? 'text-green-600' : 'text-amber-600'
                }`}>
                  <strong>PayHero API Status:</strong> {
                    result.payhero_available 
                      ? '✅ Connected - Using live PayHero API' 
                      : '⚠️ Using fallback - PayHero API not accessible'
                  }
                </p>
                <p className="text-gray-600">
                  <strong>Data Source:</strong> {result.data?.source}
                </p>
                <p className="text-gray-600">
                  <strong>Banks Available:</strong> {result.data?.banks?.length || 0}
                </p>
                {result.data?.message && (
                  <p className="text-gray-600">
                    <strong>Message:</strong> {result.data.message}
                  </p>
                )}
              </div>
            )}
            
            {result.error && (
              <p className="text-sm text-red-600 mb-2">
                <strong>Error:</strong> {result.error}
              </p>
            )}
            
            <details className="text-xs mt-2">
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
          <p><strong>What this tests:</strong></p>
          <p>• PayHero API credentials configuration</p>
          <p>• Network connectivity to PayHero servers</p>
          <p>• Edge Function execution permissions</p>
          <p>• API endpoint availability</p>
        </div>
      </CardContent>
    </Card>
  )
}