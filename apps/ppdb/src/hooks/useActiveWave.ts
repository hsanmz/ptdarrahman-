import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'

export interface ActiveWave {
  id: string
  name: string
  active: boolean
}

export function useActiveWave() {
  const query = useQuery<ActiveWave>({
    queryKey: ['active-wave-public'],
    queryFn: () => apiFetch<ActiveWave>('/ppdb/waves/active-public'),
    staleTime: 60_000
  })

  return {
    ...query,
    isActive: !!query.data?.active,
  }
}
