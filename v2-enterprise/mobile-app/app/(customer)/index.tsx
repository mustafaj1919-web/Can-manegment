import React from 'react'
import { useRouter } from 'expo-router'
import { CustomerHomeScreen } from '../../src/features/customer/screens/CustomerHomeScreen'

export default function CustomerHomeRoute() {
  const router = useRouter()

  return (
    <CustomerHomeScreen
      onOpenInstallments={() => router.push('/(customer)/installments')}
      onOpenPayments={() => router.push('/(customer)/payments')}
      onOpenContracts={() => router.push('/(customer)/contracts')}
    />
  )
}
