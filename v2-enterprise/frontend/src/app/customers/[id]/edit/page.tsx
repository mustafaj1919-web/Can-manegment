'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { getCustomerById } from '@/lib/api/customers'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function EditCustomerPage() {
  const routeParams = useParams<{ id: string }>()
  const id = routeParams?.id ? String(routeParams.id) : ""

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id),
    staleTime: 60_000,
    retry: 1,
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-rose-400/60" />
        <p className="text-muted-foreground">تعذر تحميل بيانات العميل</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">العودة للعملاء</Link>
        </Button>
      </div>
    )
  }

  return <CustomerForm customer={customer} />
}
