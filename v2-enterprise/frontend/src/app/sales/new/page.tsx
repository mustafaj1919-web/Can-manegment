'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api/client'
import { useSalesInvoiceForm } from '@/components/sales/new/hooks/useSalesInvoiceForm'
import { useVehicleSearch } from '@/components/sales/new/hooks/useVehicleSearch'
import { useCustomerSearch } from '@/components/sales/new/hooks/useCustomerSearch'
import { SalesHeaderHero } from '@/components/sales/new/SalesHeaderHero'
import { VehicleSearchCombobox } from '@/components/sales/new/VehicleSearchCombobox'
import { CustomerSearchCombobox } from '@/components/sales/new/CustomerSearchCombobox'
import { PaymentGroupDetails } from '@/components/sales/new/PaymentGroupDetails'
import { InstallmentsConfigCard } from '@/components/sales/new/InstallmentsConfigCard'
import { SalesRepresentativeCard } from '@/components/sales/new/SalesRepresentativeCard'
import { LiveInvoicePreviewPanel } from '@/components/sales/new/LiveInvoicePreviewPanel'
import { VehicleOwnershipCard } from '@/components/sales/new/VehicleOwnershipCard'
import { SalesFloatingActionBar } from '@/components/sales/new/SalesFloatingActionBar'

export default function NewSalePage() {
  // Pre-sale Ownership State
  const [ownershipType, setOwnershipType] = React.useState<number>(3)
  const [ownerPersonName, setOwnerPersonName] = React.useState<string>('')
  const [ownerPersonPhone, setOwnerPersonPhone] = React.useState<string>('')
  const [ownerPersonIdNumber, setOwnerPersonIdNumber] = React.useState<string>('')
  const [ownerNotes, setOwnerNotes] = React.useState<string>('')
  const [supplierId, setSupplierId] = React.useState<string>('')
  const [supplierReference, setSupplierReference] = React.useState<string>('')
  // 1. Fetch active employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const res = await get<any>('/Employees?per_page=100')
      const items = res?.success ? (res.data ?? []) : (res ?? [])
      return Array.isArray(items) ? items : (items.items ?? [])
    },
    staleTime: 5 * 60 * 1000,
  })
  const employees = employeesData ?? []

  // 1b. Fetch registered suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await get<any>('/Suppliers?per_page=100')
      const items = res?.data ? (Array.isArray(res.data) ? res.data : (res.data.items ?? [])) : (Array.isArray(res) ? res : [])
      return items
    },
    staleTime: 5 * 60 * 1000,
  })
  const suppliers = suppliersData ?? []

  // 2. Search hooks for vehicles and customers
  // First, we initialize a temporary vehicle search to lookup selected vehicle details
  const [tempCarId, setTempCarId] = [ '', () => {} ]

  // Form hook
  const form = useSalesInvoiceForm()

  const vehicleSearch = useVehicleSearch(form.formState.carId)
  const customerSearch = useCustomerSearch(form.formState.buyerId)

  const selectedCar = vehicleSearch.selectedCar
  const selectedBuyer = customerSearch.selectedBuyer

  const isFormReady = Boolean(
    form.formState.carId &&
    form.formState.buyerId &&
    parseFloat(form.formState.sellingPrice) > 0 &&
    Object.keys(form.errors).length === 0
  )

  const salesRepName = employees.find((e: any) => String(e.id) === form.formState.salesRepId)?.fullName ?? 'مسؤول المبيعات'

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 md:px-6" dir="rtl">
      <div className="max-w-[1480px] mx-auto space-y-8">
        
        {/* 1. Page Header Hero */}
        <SalesHeaderHero
          saleDate={form.formState.saleDate}
          branchName="الفرع الرئيسي"
          salesRepName={salesRepName}
        />

        {/* 2. Main 12-Column Desktop Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (8 Columns) - Main Workspace Forms */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Vehicle Selection Card */}
            <VehicleSearchCombobox
              cars={vehicleSearch.cars}
              selectedCar={selectedCar}
              selectedCarId={form.formState.carId}
              onSelectCar={carId => form.setFieldValue('carId', carId)}
              isLoading={vehicleSearch.isLoading}
              isFetching={vehicleSearch.isFetching}
              onRefresh={vehicleSearch.refetch}
              errorMsg={form.errors.carId}
            />

            {/* Pre-Sale Vehicle Ownership Card */}
            <VehicleOwnershipCard
              ownershipType={ownershipType}
              setOwnershipType={setOwnershipType}
              ownerPersonName={ownerPersonName}
              setOwnerPersonName={setOwnerPersonName}
              ownerPersonPhone={ownerPersonPhone}
              setOwnerPersonPhone={setOwnerPersonPhone}
              ownerPersonIdNumber={ownerPersonIdNumber}
              setOwnerPersonIdNumber={setOwnerPersonIdNumber}
              ownerNotes={ownerNotes}
              setOwnerNotes={setOwnerNotes}
              supplierId={supplierId}
              setSupplierId={setSupplierId}
              supplierReference={supplierReference}
              setSupplierReference={setSupplierReference}
              suppliers={suppliers}
              customersAsSellers={customerSearch.customers}
            />

            {/* Customer Selection Card */}
            <CustomerSearchCombobox
              customers={customerSearch.customers}
              selectedBuyer={selectedBuyer}
              selectedBuyerId={form.formState.buyerId}
              onSelectBuyer={buyerId => form.setFieldValue('buyerId', buyerId)}
              customerVatNumber={form.formState.customerVatNumber}
              setCustomerVatNumber={vat => form.setFieldValue('customerVatNumber', vat)}
              isLoading={customerSearch.isLoading}
              isFetching={customerSearch.isFetching}
              onRefresh={customerSearch.refetch}
              errorMsg={form.errors.buyerId}
              searchTerm={customerSearch.searchTerm}
              onSearchTermChange={customerSearch.setSearchTerm}
            />

            {/* Payment & Pricing Details Card */}
            <PaymentGroupDetails
              sellingPrice={form.formState.sellingPrice}
              setSellingPrice={sp => form.setFieldValue('sellingPrice', sp)}
              discount={form.formState.discount}
              setDiscount={dc => form.setFieldValue('discount', dc)}
              paidAmount={form.formState.paidAmount}
              setPaidAmount={pa => form.setFieldValue('paidAmount', pa)}
              currency={form.formState.currency}
              setCurrency={c => form.setFieldValue('currency', c)}
              paymentMethod={form.formState.paymentMethod}
              setPaymentMethod={m => form.setFieldValue('paymentMethod', m)}
              saleDate={form.formState.saleDate}
              setSaleDate={d => form.setFieldValue('saleDate', d)}
              sp={form.sp}
              dc={form.dc}
              pa={form.pa}
              netRevenuePreview={form.netRevenuePreview}
              remainingPreview={form.remainingPreview}
              isAuthorizedRole={form.isAuthorizedRole}
              purchaseCost={form.purchaseCost}
              profitPreview={form.profitPreview}
              profitPctPreview={form.profitPctPreview}
              isBelowCost={form.isBelowCost}
              errors={form.errors}
            />

            {/* Installments Config Card (Visible ONLY when paymentMethod === 'Installment') */}
            <InstallmentsConfigCard
              paymentMethod={form.formState.paymentMethod}
              calcMode={form.formState.calcMode}
              setCalcMode={m => form.setFieldValue('calcMode', m)}
              numMonths={form.formState.numMonths}
              setNumMonths={m => form.setFieldValue('numMonths', m)}
              customMonthlyAmount={form.formState.customMonthlyAmount}
              setCustomMonthlyAmount={a => form.setFieldValue('customMonthlyAmount', a)}
              startDate={form.formState.startDate}
              setStartDate={d => form.setFieldValue('startDate', d)}
              dueDay={form.formState.dueDay}
              setDueDay={d => form.setFieldValue('dueDay', d)}
              installNotes={form.formState.installNotes}
              setInstallNotes={n => form.setFieldValue('installNotes', n)}
              remainingPreview={form.remainingPreview}
              currency={form.formState.currency}
              errors={form.errors}
            />

            {/* Sales Representative Card */}
            <SalesRepresentativeCard
              employees={employees}
              salesRepId={form.formState.salesRepId}
              setSalesRepId={id => form.setFieldValue('salesRepId', id)}
            />
          </div>

          {/* Right Column (4 Columns) - Sticky Live Preview Panel */}
          <div className="lg:col-span-4">
            <LiveInvoicePreviewPanel
              selectedCar={selectedCar}
              selectedBuyer={selectedBuyer}
              currency={form.formState.currency}
              sp={form.sp}
              dc={form.dc}
              pa={form.pa}
              netRevenuePreview={form.netRevenuePreview}
              remainingPreview={form.remainingPreview}
              paymentMethod={form.formState.paymentMethod}
              saleDate={form.formState.saleDate}
              salesRepName={salesRepName}
              isAuthorizedRole={form.isAuthorizedRole}
              purchaseCost={form.purchaseCost}
              profitPreview={form.profitPreview}
              profitPctPreview={form.profitPctPreview}
              isBelowCost={form.isBelowCost}
              errors={form.errors}
            />
          </div>
        </div>

        {/* Floating Action Bar */}
        <SalesFloatingActionBar
          isVisible={form.isDirty || Boolean(form.formState.carId)}
          isPending={form.isPending}
          isReady={isFormReady}
          errors={form.errors}
          onSubmit={form.handleSubmit}
        />
      </div>
    </div>
  )
}
