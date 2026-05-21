import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Lightbulb, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export function PayHeroSTKTest() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runSTKTest = async () => {
    setTesting(true)
    setResults(null)

    try {
      console.log('Running PayHero STK Push test...')

      const { data, error } = await supabase.functions.invoke('test-payhero-stk')

      console.log('STK test response:', { data, error })

      setResults({
        success: !error && data?.success,
        data,
        error: error?.message,
        rawError: error
      })

    } catch (err: any) {
      console.error('STK test failed:', err)
      setResults({
        success: false,
        error: err.message,
        rawError: err
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (test: any) => {
    if (test.success) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (test.status === 'error') return <XCircle className="h-4 w-4 text-red-600" />
    return <AlertTriangle className="h-4 w-4 text-orange-600" />
  }

  const getStatusColor = (test: any) => {
    if (test.success) return 'border-green-200 bg-green-50'
    if (test.status === 'error') return 'border-red-200 bg-red-50'
    return 'border-orange-200 bg-orange-50'
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          PayHero STK Push Test (Correct API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-2">
            💡 New Theory: PayHero doesn't have channel registration API
          </p>
          <p className="text-sm text-blue-600">
            PayHero likely requires you to configure payment channels (bank account, paybill, till) 
            in their dashboard first, then use the API only for STK Push payments.
          </p>
        </div>

        <Button 
          onClick={runSTKTest} 
          disabled={testing}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing PayHero STK Push API...
            </>
          ) : (
            'Test PayHero STK Push API'
          )}
        </Button>

        {results && (
          <div className="mt-6 space-y-4">
            {/* Conclusion */}
            {results.data?.conclusion && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">🔍 Analysis</h3>
                <p className="text-sm text-yellow-700">{results.data.conclusion}</p>
              </div>
            )}

            {/* Environment Info */}
            {results.data?.environment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Environment Status</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Basic Auth:</span>
                    <span className={results.data.environment.has_basic_auth ? 'text-green-600' : 'text-red-600'}>
                      {results.data.environment.has_basic_auth ? '✓ Present' : '✗ Missing'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auth Format:</span>
                    <span className="font-mono text-xs">{results.data.environment.basic_auth_format}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Test Results */}
            {results.data?.tests && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">Test Results</h3>
                {results.data.tests.map((test: any, index: number) => (
                  <div key={index} className={`border rounded-lg p-4 ${getStatusColor(test)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(test)}
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <span className="text-sm font-mono">
                        Status: {test.status}
                      </span>
                    </div>

                    {test.request && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Request Data:</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                          {JSON.stringify(test.request, null, 2)}
                        </pre>
                      </div>
                    )}

                    {test.data && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Response Data:</p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {typeof test.data === 'string' ? test.data : JSON.stringify(test.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {test.error && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600 mb-1">Error:</p>
                        <p className="text-xs text-red-600 bg-white p-2 rounded border">
                          {test.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Overall Error */}
            {results.error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Test Suite Error:</p>
                <p className="text-sm text-red-600">{results.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}