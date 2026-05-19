/**
 * OPTIMIZED MEMBERS HOOK
 * 
 * Production-ready hook with proper pagination, caching, and performance monitoring
 * Replaces unbounded member queries with scalable, indexed queries
 */

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useChurch } from "@/contexts/ChurchContext";
import { createOptimizedQuery, queryCache, queryMonitor } from "@/lib/queryOptimization";
import { TABLES, COLS } from "@/lib/schema";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCallback, useEffect } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  membership_status: 'member' | 'visitor' | 'regular_attendee';
  avatar_url?: string;
  created_at: string;
  join_date?: string;
}

export interface MemberFilters {
  status?: string;
  membership_status?: string;
  search?: string;
}

export interface MemberPagination {
  page?: number;
  limit?: number;
}

// ─── OPTIMIZED MEMBERS HOOK ──────────────────────────────────────────────────

export function useOptimizedMembers(
  filters: MemberFilters = {},
  pagination: MemberPagination = {}
) {
  const church = useChurch();
  const queryClient = useQueryClient();

  const optimizedQuery = createOptimizedQuery(church.tenantId);

  // Generate stable query key
  const queryKey = [
    "members-optimized",
    church.tenantId,
    filters,
    pagination
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return queryMonitor.measureQuery(
        "getMembers",
        () => optimizedQuery.getMembers(
          {
            filters: {
              ...(filters.status && { status: filters.status }),
              ...(filters.membership_status && { membership_status: filters.membership_status })
            },
            search: filters.search
          },
          {
            page: pagination.page || 1,
            limit: pagination.limit || 20
          }
        )
      );
    },
    enabled: !!church?.id,
    staleTime: 300_000, // 5 minutes - members don't change frequently
    gcTime: 600_000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error?.message?.includes('400') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Realtime subscription with proper cleanup
  useEffect(() => {
    if (!church?.id) return;

    const unsubscribe = supabase
      .channel(`members:${church.tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.MEMBERS,
          filter: `tenant_id=eq.${church.tenantId}`
        },
        (payload) => {
          // Invalidate all member queries for this tenant
          queryClient.invalidateQueries({
            queryKey: ["members-optimized", church.tenantId]
          });

          // Show toast for new members
          if (payload.eventType === 'INSERT') {
            const newMember = payload.new as Member;
            toast.success(`New member: ${newMember.first_name} ${newMember.last_name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unsubscribe);
    };
  }, [church?.id, queryClient]);

  return {
    ...query,
    // Add helper methods
    refetch: query.refetch,
    invalidate: useCallback(() => {
      queryClient.invalidateQueries({
        queryKey: ["members-optimized", church.tenantId]
      });
    }, [queryClient, church.tenantId])
  };
}

// ─── MEMBER CREATION HOOK WITH DUPLICATE PREVENTION ─────────────────────────

export function useCreateMember() {
  const church = useChurch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: Omit<Member, 'id' | 'created_at'>) => {
      // Check for duplicates BEFORE creating
      const { data: existingMember } = await supabase
        .from(TABLES.MEMBERS)
        .select('id, first_name, last_name, email')
        .eq(COLS.TENANT_ID, church.tenantId)
        .eq(COLS.EMAIL, memberData.email)
        .maybeSingle();

      if (existingMember) {
        throw new Error(
          `A member with email "${memberData.email}" already exists: ${existingMember.first_name} ${existingMember.last_name}`
        );
      }

      // Create the member
      const { data, error } = await supabase
        .from(TABLES.MEMBERS)
        .insert({
          ...memberData,
          [COLS.TENANT_ID]: church.tenantId
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violations gracefully
        if (error.code === '23505') {
          throw new Error(`A member with this email already exists. Please use a different email address.`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (newMember) => {
      // Invalidate member queries
      queryClient.invalidateQueries({
        queryKey: ["members-optimized", church.tenantId]
      });

      // Update cache optimistically
      queryClient.setQueryData(
        ["members-optimized", church.tenantId, {}, { page: 1, limit: 20 }],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: [newMember, ...oldData.data],
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total + 1
            }
          };
        }
      );

      toast.success(`Member ${newMember.first_name} ${newMember.last_name} created successfully`);
    },
    onError: (error: Error) => {
      console.error('Failed to create member:', error);
      toast.error(error.message || 'Failed to create member');
    }
  });
}

// ─── MEMBER UPDATE HOOK ──────────────────────────────────────────────────────

export function useUpdateMember() {
  const church = useChurch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Member> }) => {
      // If updating email, check for duplicates
      if (updates.email) {
        const { data: existingMember } = await supabase
          .from(TABLES.MEMBERS)
          .select('id')
          .eq(COLS.TENANT_ID, church.tenantId)
          .eq(COLS.EMAIL, updates.email)
          .neq('id', id)
          .maybeSingle();

        if (existingMember) {
          throw new Error(`A member with email "${updates.email}" already exists`);
        }
      }

      const { data, error } = await supabase
        .from(TABLES.MEMBERS)
        .update(updates)
        .eq('id', id)
        .eq(COLS.TENANT_ID, church.tenantId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`A member with this email already exists`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (updatedMember) => {
      // Invalidate and update cache
      queryClient.invalidateQueries({
        queryKey: ["members-optimized", church.tenantId]
      });

      toast.success(`Member ${updatedMember.first_name} ${updatedMember.last_name} updated successfully`);
    },
    onError: (error: Error) => {
      console.error('Failed to update member:', error);
      toast.error(error.message || 'Failed to update member');
    }
  });
}

// ─── MEMBER DELETION HOOK ────────────────────────────────────────────────────

export function useDeleteMember() {
  const church = useChurch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from(TABLES.MEMBERS)
        .delete()
        .eq('id', memberId)
        .eq(COLS.TENANT_ID, church.tenantId);

      if (error) throw error;

      return memberId;
    },
    onSuccess: (deletedId) => {
      // Remove from cache optimistically
      queryClient.setQueriesData(
        { queryKey: ["members-optimized", church.tenantId] },
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter((member: Member) => member.id !== deletedId),
            pagination: {
              ...oldData.pagination,
              total: Math.max(0, oldData.pagination.total - 1)
            }
          };
        }
      );

      toast.success('Member deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete member:', error);
      toast.error(error.message || 'Failed to delete member');
    }
  });
}

// ─── MEMBER SEARCH HOOK ──────────────────────────────────────────────────────

export function useMemberSearch(searchTerm: string, enabled: boolean = true) {
  const church = useChurch();

  return useQuery({
    queryKey: ["member-search", church?.tenantId, searchTerm],
    queryFn: async () => {
      if (!church?.tenantId || !searchTerm.trim()) {
        return { data: [], pagination: { total: 0, page: 1, limit: 10, hasNext: false, hasPrev: false, totalPages: 0 } };
      }

      const optimizedQuery = createOptimizedQuery(church.tenantId);
      return optimizedQuery.getMembers(
        { search: searchTerm.trim() },
        { limit: 10 } // Smaller limit for search results
      );
    },
    enabled: enabled && !!church?.tenantId && searchTerm.trim().length >= 2,
    staleTime: 60_000, // 1 minute for search results
    gcTime: 300_000, // 5 minutes
  });
}

// ─── MEMBER STATISTICS HOOK ──────────────────────────────────────────────────

export function useMemberStats() {
  const church = useChurch();

  return useQuery({
    queryKey: ["member-stats", church?.tenantId],
    queryFn: async () => {
      if (!church?.tenantId) return null;

      const { data, error } = await supabase.rpc('get_member_analytics_optimized', {
        p_tenant_id: church.tenantId
      });

      if (error) throw error;
      return data;
    },
    enabled: !!church?.id,
    staleTime: 600_000, // 10 minutes - stats don't change frequently
    gcTime: 1800_000, // 30 minutes
  });
}