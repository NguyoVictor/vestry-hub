import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Building2, CheckCircle, AlertCircle } from 'lucide-react'

export function BankSelectionTest() {
  const { data: banksData, isLoading, error, refetch } = useQuery({
    queryKey: ['test-supported-banks'],
    queryFn: async () => {
      console.log('Testing get-supported-banks function...')
      const { data, error } = await supabase.functions.invoke('get-supported-banks')
      if (error) {
        console.error('Error:', error)
        throw error
      }
      console.log('Response:', data)
      return data
    },
    retry: 1
  })

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          PayHero Banks API Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Banks API'
            )}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}

        {banksData && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Success</span>
              </div>
              <div className="text-sm text-green-600 space-y-1">
                <p><strong>Source:</strong> {banksData.source}</p>
                <p><strong>Banks Found:</strong> {banksData.banks?.length || 0}</p>
                {banksData.message && <p><strong>Message:</strong> {banksData.message}</p>}
              </div>
            </div>

            {banksData.banks && banksData.banks.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Available Banks:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {banksData.banks.map((bank: any, index: number) => (
                    <div key={bank.code || index} className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {bank.logo ? (
                          <img 
                            src={bank.logo.replace('.png', '.svg')} 
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{bank.shortName || bank.name}</p>
                        <p className="text-xs text-gray-500 truncate">{bank.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}