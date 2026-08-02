import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ContractDetailScreen } from '../../../src/features/cashier/screens/ContractDetailScreen'

export default function CashierContractDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return (
    <ContractDetailScreen
      planId={id || ''}
      onBack={() => router.back()}
    />
  )
}
