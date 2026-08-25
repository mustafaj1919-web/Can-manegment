import React from 'react'
import { useRouter } from 'expo-router'
import { InventoryListScreen } from '../../../src/features/inventory/screens/InventoryListScreen'

export default function OwnerInventoryScreen() {
  const router = useRouter()

  return (
    <InventoryListScreen
      onSelectVehicle={(id) => router.push(`/(owner)/inventory/${id}`)}
      onOpenScanner={() => router.push('/scanner')}
    />
  )
}
