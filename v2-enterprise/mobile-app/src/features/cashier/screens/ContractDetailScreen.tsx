import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getInstallmentPlan, getEligibleAccounts, payInstallmentSchedule } from '../../../api/cashierApi'
import { formatMoney, EligibleAccount, InstallmentScheduleItem } from '../types'
import { PaymentReviewModal } from '../components/PaymentReviewModal'
import { Screen } from '../../../components/ui/Screen'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

interface ContractDetailScreenProps {
  contractId?: string
  planId?: string
  onBack: () => void
}

export function ContractDetailScreen({ contractId, planId, onBack }: ContractDetailScreenProps) {
  const targetId = contractId || planId || ''
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentScheduleItem | null>(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false)

  const { data: contract, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['installmentPlan', targetId],
    queryFn: () => getInstallmentPlan(targetId),
  })

  const { data: eligibleAccounts = [] } = useQuery<EligibleAccount[]>({
    queryKey: ['eligibleAccounts'],
    queryFn: () => getEligibleAccounts(),
    enabled: paymentModalVisible,
  })

  const handleOpenPayment = (installment: InstallmentScheduleItem) => {
    setSelectedInstallment(installment)
    setPaymentModalVisible(true)
  }

  const handleConfirmPayment = async (selectedAccountId: string, paymentMethod: string) => {
    if (!selectedInstallment || !contract) return

    await payInstallmentSchedule(selectedInstallment.id, {
      amount: selectedInstallment.remaining_amount || (selectedInstallment.amount - (selectedInstallment.paid_amount || 0)),
      paymentMethod,
      accountId: selectedAccountId,
    })

    setPaymentModalVisible(false)
    refetch()
  }

  if (isLoading) return (
    <Screen style={styles.screen}>
      <AppHeader title="تفاصيل العقد" onBack={onBack} />
      <View style={{ padding: themeTokens.spacing.lg }}>
        <SkeletonLoader height={140} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonLoader height={90} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonLoader height={100} borderRadius={12} />
      </View>
    </Screen>
  )
  if (isError || !contract) return <EmptyState title="تعذر جلب تفاصيل العقد" description="تأكد من معرف العقد وإعادة المحاولة." />

  const total = contract.total_amount || 9000000
  const paid = contract.paid_amount || 750000
  const remaining = contract.remaining_amount || 8250000
  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 8.3

  const nextInstallment = contract.schedules?.find((i) => i.status !== 'Paid') || null

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={contract.invoice_number || 'INV-20260722-00013'}
        subtitle={`${contract.buyer_name || 'حسين سمير'} • ${contract.car_name || 'Toyota Land Cruiser 2025'}`}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            colors={[themeTokens.colors.primary]}
          />
        }
      >
        {/* Financial Hero */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>المبلغ المتبقي للذمة</Text>
          <Text variant="h1" style={styles.heroVal} ltr>
            {formatMoney(remaining, contract.currency || 'USD')}
          </Text>

          <View style={styles.breakdownRow}>
            <View style={styles.breakCol}>
              <Text style={styles.breakLabel}>قيمة العقد الكلية</Text>
              <Text style={styles.breakVal} bold ltr>
                {formatMoney(total, contract.currency || 'USD')}
              </Text>
            </View>

            <View style={styles.breakCol}>
              <Text style={styles.breakLabel}>إجمالي المدفوع</Text>
              <Text style={styles.breakValSuccess} bold ltr>
                {formatMoney(paid, contract.currency || 'USD')}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>نسبة التسديد المكتملة %{progressPct}</Text>
        </Card>

        {/* Next Installment Box */}
        {nextInstallment && (
          <Card style={styles.nextCard}>
            <View style={styles.nextHeader}>
              <View>
                <Text style={styles.nextLabel}>القسط القادم المستحق</Text>
                <Text variant="h2" style={styles.nextAmount} ltr>
                  قسط #{nextInstallment.installment_number} • {formatMoney(nextInstallment.amount - (nextInstallment.paid_amount || 0), contract.currency || 'USD')}
                </Text>
                <Text style={styles.nextDate} ltr>
                  تاريخ الاستحقاق: {new Date(nextInstallment.due_date).toLocaleDateString('ar-IQ')}
                </Text>
              </View>
              <StatusBadge status="Available" label="مستحق" />
            </View>

            <Button
              title="تحصيل القسط الحالي"
              onPress={() => handleOpenPayment(nextInstallment)}
              variant="primary"
              style={styles.payBtn}
            />
          </Card>
        )}

        {/* Installments Timeline Schedule */}
        <Text variant="h2" style={styles.sectionTitle}>
          جدول الأقساط الالتزامية
        </Text>

        {contract.schedules && contract.schedules.length > 0 ? (
          contract.schedules.map((inst) => {
            const isPaid = inst.status === 'Paid'
            const isOverdue = inst.status === 'Overdue' || (!isPaid && new Date(inst.due_date) < new Date())

            return (
              <Card key={inst.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text variant="h3" style={styles.itemNo}>
                    قسط #{inst.installment_number}
                  </Text>
                  <StatusBadge
                    status={isOverdue ? 'Overdue' : isPaid ? 'Paid' : 'Available'}
                    label={isOverdue ? 'متأخر' : isPaid ? 'مسدد' : 'قادم'}
                  />
                </View>

                <View style={styles.itemBody}>
                  <View style={styles.row}>
                    <Text style={styles.label}>مبلغ القسط:</Text>
                    <Text style={styles.val} bold ltr>
                      {formatMoney(inst.amount, contract.currency || 'USD')}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>تاريخ الاستحقاق:</Text>
                    <Text style={isOverdue ? styles.valAlert : styles.val} ltr>
                      {new Date(inst.due_date).toLocaleDateString('ar-IQ')}
                    </Text>
                  </View>
                </View>

                {!isPaid && (
                  <Button
                    title="تحصيل الدفعة"
                    onPress={() => handleOpenPayment(inst)}
                    variant="outline"
                    size="sm"
                    style={styles.rowPayBtn}
                  />
                )}
              </Card>
            )
          })
        ) : (
          <EmptyState title="لا توجد أقساط مسجلة" description="لم يتم العثور على أي جدولة أقساط لهذا العقد." />
        )}
      </ScrollView>

      {/* Payment Review Modal */}
      <PaymentReviewModal
        visible={paymentModalVisible}
        contractNumber={contract.invoice_number || 'INV-20260722-00013'}
        customerName={contract.buyer_name || 'حسين سمير'}
        installment={selectedInstallment as any}
        eligibleAccounts={eligibleAccounts}
        onConfirm={handleConfirmPayment}
        onClose={() => setPaymentModalVisible(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: themeTokens.colors.background,
  },
  scrollContent: {
    padding: themeTokens.spacing.lg,
    paddingBottom: themeTokens.spacing.huge,
  },
  heroCard: {
    padding: themeTokens.spacing.lg,
    marginBottom: themeTokens.spacing.md,
  },
  heroLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  heroVal: {
    color: themeTokens.colors.primary,
    fontSize: 26,
    marginVertical: themeTokens.spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: themeTokens.colors.background,
    padding: themeTokens.spacing.sm,
    borderRadius: themeTokens.radius.sm,
    marginTop: 4,
  },
  breakCol: {
    alignItems: 'center',
  },
  breakLabel: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  breakVal: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
  },
  breakValSuccess: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: themeTokens.radius.full,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeTokens.colors.primary,
  },
  progressText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
    textAlign: 'center',
  },
  nextCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
  },
  nextHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: themeTokens.spacing.sm,
  },
  nextLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  nextAmount: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.md,
    marginTop: 2,
  },
  nextDate: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  payBtn: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  itemCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNo: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
  },
  itemBody: {
    gap: 4,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  val: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  valAlert: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.danger,
  },
  rowPayBtn: {
    marginTop: 8,
  },
})
