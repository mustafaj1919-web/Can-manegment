import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { VehicleDetailScreen } from '../../../src/features/inventory/screens/VehicleDetailScreen'

export default function SalesVehicleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return (
    <VehicleDetailScreen
      vehicleId={id || ''}
      onBack={() => router.back()}
    />
  )
}
