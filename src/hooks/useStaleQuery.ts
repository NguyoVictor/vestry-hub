import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Wrapper around useQuery that enforces the staleTime: 300_000 rule
 * from the vestry-project.md performance guidelines.
 * Use this instead of useQuery directly for all data fetching.
 */
export function useStaleQuery<T>(options: UseQueryOptions<T>) {
  return useQuery<T>({
    staleTime: 300_000,
    ...options,
  });
}
