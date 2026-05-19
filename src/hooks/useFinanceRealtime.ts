import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useRealtimeTable(table: string, tenantId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`${table}-${tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`
      }, onUpdate)
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [table, tenantId, onUpdate])
}

// Specialized hooks for different finance pages
export function useGivingRecordsRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('giving_records', tenantId, onUpdate)
}

export function usePledgeCommitmentsRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('pledge_commitments', tenantId, onUpdate)
}

export function useExpensesRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('accounts_payable', tenantId, onUpdate)
}

export function useBudgetRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('budget_lines', tenantId, onUpdate)
}

export function usePayrollRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('payroll_runs', tenantId, onUpdate)
}

export function useFundsRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('funds', tenantId, onUpdate)
}

export function useAccountsPayableRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('ap_invoices', tenantId, onUpdate)
}

export function useJournalEntriesRealtime(tenantId: string, onUpdate: () => void) {
  return useRealtimeTable('journal_entries', tenantId, onUpdate)
}