'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '@/lib/api/customers'
import { CustomerOption } from '@/lib/api/sales'

export function useCustomerSearch(selectedBuyerId: string) {
  const [searchTerm, setSearchTerm] = useState('')

  // Server-side debounced search query
  const { data: customersData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers-search', searchTerm],
    queryFn: async () => {
      const res = await getCustomers({
        search: searchTerm.length >= 2 ? searchTerm : undefined,
        per_page: 50,
      })
      return res.items || []
    },
    staleTime: 30_000,
  })

  const customers: CustomerOption[] = useMemo(() => {
    if (!customersData) return []
    return customersData.map(c => ({
      id: c.id,
      name: c.name,
      full_name: c.full_name || c.name,
      phone: c.phone || '',
      id_number: c.id_number || '',
      customer_type: c.customer_type || 'Individual',
    }))
  }, [customersData])

  const selectedBuyer = useMemo(() => {
    return customers.find(b => String(b.id) === selectedBuyerId)
  }, [customers, selectedBuyerId])

  return {
    searchTerm,
    setSearchTerm,
    customers,
    isLoading,
    isFetching,
    refetch,
    selectedBuyer,
  }
}
