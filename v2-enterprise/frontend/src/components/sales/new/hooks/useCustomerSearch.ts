'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCustomers, getCustomerById } from '@/lib/api/customers'
import { CustomerOption } from '@/lib/api/sales'

export function useCustomerSearch(selectedBuyerId: string) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  // Debounce search term changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Server-side debounced search query
  const { data: customersData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers-search', debouncedTerm],
    queryFn: async () => {
      const res = await getCustomers({
        search: debouncedTerm.length >= 1 ? debouncedTerm : undefined,
        per_page: 100,
      })
      return res.items || []
    },
    staleTime: 30_000,
  })

  // If a specific buyer ID is selected, ensure their details are fetched even if not in search results
  const { data: fetchedSelectedBuyer } = useQuery({
    queryKey: ['customer-by-id', selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId) return null
      try {
        const c = await getCustomerById(selectedBuyerId)
        return c
      } catch {
        return null
      }
    },
    enabled: Boolean(selectedBuyerId),
    staleTime: 5 * 60 * 1000,
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
    if (!selectedBuyerId) return undefined
    const found = customers.find(b => String(b.id) === String(selectedBuyerId))
    if (found) return found
    if (fetchedSelectedBuyer) {
      return {
        id: fetchedSelectedBuyer.id,
        name: fetchedSelectedBuyer.name,
        full_name: fetchedSelectedBuyer.full_name || fetchedSelectedBuyer.name,
        phone: fetchedSelectedBuyer.phone || '',
        id_number: fetchedSelectedBuyer.id_number || '',
        customer_type: fetchedSelectedBuyer.customer_type || 'Individual',
      }
    }
    return undefined
  }, [customers, selectedBuyerId, fetchedSelectedBuyer])

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

