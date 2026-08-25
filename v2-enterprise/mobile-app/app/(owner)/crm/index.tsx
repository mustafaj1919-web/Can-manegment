import React from 'react'
import { useRouter } from 'expo-router'
import { LeadsListScreen } from '../../../src/features/crm/screens/LeadsListScreen'

export default function OwnerCrmRoute() {
  const router = useRouter()

  return (
    <LeadsListScreen
      onSelectDeal={(id) => router.push(`/(owner)/crm/${id}`)}
    />
  )
}
