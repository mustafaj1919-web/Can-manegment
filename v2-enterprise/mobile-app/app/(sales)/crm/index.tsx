import React from 'react'
import { useRouter } from 'expo-router'
import { LeadsListScreen } from '../../../src/features/crm/screens/LeadsListScreen'

export default function SalesCrmRoute() {
  const router = useRouter()

  return (
    <LeadsListScreen
      onSelectDeal={(id) => router.push(`/(sales)/crm/${id}`)}
    />
  )
}
