import React from 'react'
import { useRouter } from 'expo-router'
import { FollowUpsScreen } from '../../../src/features/crm/screens/FollowUpsScreen'

export default function OwnerFollowUpsRoute() {
  const router = useRouter()

  return <FollowUpsScreen onBack={() => router.back()} />
}
