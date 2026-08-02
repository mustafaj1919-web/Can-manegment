import React from 'react'
import { useRouter } from 'expo-router'
import { FollowUpsScreen } from '../../../src/features/crm/screens/FollowUpsScreen'

export default function SalesFollowUpsRoute() {
  const router = useRouter()

  return <FollowUpsScreen onBack={() => router.back()} />
}
