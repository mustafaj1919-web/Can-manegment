import React from 'react'
import { useRouter } from 'expo-router'
import { CashierHomeScreen } from '../../../src/features/cashier/screens/CashierHomeScreen'

export default function OwnerCashierHomeRoute() {
  const router = useRouter()

  return (
    <CashierHomeScreen
      onOpenContracts={() => router.push('/(owner)/cashier/contracts')}
      onOpenScanner={() => router.push('/(owner)/scanner')}
      onOpenReceipts={() => router.push('/(owner)/cashier/receipts')}
    />
  )
}
