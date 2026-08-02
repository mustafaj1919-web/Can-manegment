import React from 'react'
import { useRouter } from 'expo-router'
import { ContractsListScreen } from '../../../../src/features/cashier/screens/ContractsListScreen'

export default function OwnerContractsListRoute() {
  const router = useRouter()

  return (
    <ContractsListScreen
      onSelectPlan={(id) => router.push(`/(owner)/cashier/contracts/${id}`)}
      onBack={() => router.back()}
    />
  )
}
