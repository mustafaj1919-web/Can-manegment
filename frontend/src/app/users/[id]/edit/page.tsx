'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { getUser } from '@/lib/api/users'
import { UserForm } from '@/components/forms/UserForm'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const userId = parseInt(id, 10)

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn:  () => getUser(userId),
    enabled:  !isNaN(userId),
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="glass rounded-lg py-16 text-center" dir="rtl">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
        <p className="text-sm text-muted-foreground">تعذر تحميل بيانات المستخدم</p>
      </div>
    )
  }

  return <UserForm user={user} />
}
