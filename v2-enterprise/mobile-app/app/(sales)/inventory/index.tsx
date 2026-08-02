import React from 'react'
import { useRouter } from 'expo-router'
import { InventoryListScreen } from '../../../src/features/inventory/screens/InventoryListScreen'

export default function SalesInventoryScreen() {
  const router = useRouter()

  return (
    <InventoryListScreen
      onSelectVehicle={(id) => router.push(`/(sales)/inventory/${id}`)}
      onOpenScanner={() => router.push('/scanner')}
    />
  )
}
