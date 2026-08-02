import React from 'react'
import { useRouter } from 'expo-router'
import { CashierHomeScreen } from '../../src/features/cashier/screens/CashierHomeScreen'

export default function CashierHomeRoute() {
  const router = useRouter()

  return (
    <CashierHomeScreen
      onOpenContracts={() => router.push('/(cashier)/contracts')}
      onOpenScanner={() => router.push('/scanner')}
      onOpenReceipts={() => router.push('/(cashier)/receipts')}
    />
  )
}
