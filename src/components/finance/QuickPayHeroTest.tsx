import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'

export function QuickPayHeroTest() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runQuickTest = async () => {
    setTesting(true)
    setResults(null)

    try {
      console.log('Running quick PayHero test...')

      const { data, error } = await supabase.functions.invoke('test-payhero-api')

      console.log('Quick test response:', { data, error })

      setResults({
        success: !error && data?.success,
        data,
        error: error?.message,
        rawError: error
      })

    } catch (err: any) {
      console.error('Quick test failed:', err)
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Quick PayHero API Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-sm text-red-700 font-medium mb-2">
            🚨 Current Issue: PayHero API returning 400 "Unknown error"
          </p>
          <p className="text-sm text-red-600">
            This test will check multiple PayHero endpoints and request formats to identify the root cause.
          </p>
        </div>

        <Button 
          onClick={runQuickTest} 
          disabled={testing}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running PayHero Diagnostic...
            </>
          ) : (
            'Run PayHero API Diagnostic'
          )}
        </Button>

        {results && (
          <div className="mt-6 space-y-4">
            {/* Environment Status */}
            {results.data?.environment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">🔧 Environment Status</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`p-2 rounded ${results.data.environment.has_basic_auth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <strong>Basic Auth:</strong> {results.data.environment.has_basic_auth ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div className={`p-2 rounded ${results.data.environment.has_username ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <strong>Username:</strong> {results.data.environment.has_username ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div className={`p-2 rounded ${results.data.environment.has_password ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <strong>Password:</strong> {results.data.environment.has_password ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div className="p-2 rounded bg-blue-100 text-blue-700">
                    <strong>Auth Format:</strong> <code className="text-xs">{results.data.environment.basic_auth_format}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Test Results Summary */}
            {results.data?.tests && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700">🧪 API Test Results</h3>
                {results.data.tests.map((test: any, index: number) => (
                  <div key={index} className={`border rounded-lg p-4 ${
                    test.success ? 'border-green-200 bg-green-50' : 
                    test.status === 'error' ? 'border-red-200 bg-red-50' : 
                    'border-orange-200 bg-orange-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${
                          test.success ? '✅' : test.status === 'error' ? '❌' : '⚠️'
                        }`}></span>
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                        {test.status}
                      </span>
                    </div>

                    {/* Show key findings */}
                    {test.data && typeof test.data === 'object' && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Key Response:</p>
                        <div className="text-xs bg-white p-2 rounded border max-h-20 overflow-auto">
                          {test.data.message || test.data.error || JSON.stringify(test.data).substring(0, 200)}
                        </div>
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

            {/* Overall Status */}
            <div className={`p-4 rounded-lg border-2 ${
              results.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              <p className="font-medium">
                {results.success ? '✅ Diagnostic Complete' : '❌ Issues Found'}
              </p>
              <p className="text-sm mt-1">
                {results.success 
                  ? 'PayHero API is accessible. Check individual test results above.'
                  : 'PayHero API issues detected. Review the test results above for specific problems.'
                }
              </p>
            </div>

            {results.error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Diagnostic Error:</p>
                <p className="text-sm text-red-600">{results.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}