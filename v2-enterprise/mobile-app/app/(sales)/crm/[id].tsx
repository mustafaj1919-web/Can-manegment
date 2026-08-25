import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LeadDetailScreen } from '../../../src/features/crm/screens/LeadDetailScreen'

export default function SalesLeadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return (
    <LeadDetailScreen
      dealId={id || ''}
      onBack={() => router.back()}
    />
  )
}
