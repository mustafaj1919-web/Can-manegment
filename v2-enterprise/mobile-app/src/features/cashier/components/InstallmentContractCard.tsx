import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { InstallmentPlanSummaryItem, formatMoney } from '../types'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { themeTokens } from '../../../theme/tokens'

interface InstallmentContractCardProps {
  plan: InstallmentPlanSummaryItem
  onPress: () => void
}

export function InstallmentContractCard({ plan, onPress }: InstallmentContractCardProps) {
  const isPaid = plan.status === 'Paid'
  const isCancelled = plan.status === 'Cancelled'

  const progressPct = plan.total_amount > 0
    ? Math.min(100, Math.round((plan.paid_amount / plan.total_amount) * 100))
    : 0

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.infoCol}>
            <Text variant="h3" style={styles.buyerName}>
              {plan.buyer_name || 'عميل'}
            </Text>
            <Text style={styles.invoiceNo} ltr>
              رقم العقد: {plan.invoice_number || '—'}
            </Text>
          </View>

          <StatusBadge
            status={isPaid ? 'Paid' : isCancelled ? 'Cancelled' : plan.overdue_count > 0 ? 'Overdue' : 'Active'}
            label={isPaid ? 'مكتمل السداد' : isCancelled ? 'ملغى' : plan.overdue_count > 0 ? `متأخر (${plan.overdue_count})` : 'نشط'}
          />
        </View>

        {plan.car_name && (
          <Text style={styles.carText}>🚗 {plan.car_name}</Text>
        )}

        {/* Financial Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.sumCol}>
            <Text style={styles.label}>إجمالي العقد</Text>
            <Text style={styles.val} bold ltr>
              {formatMoney(plan.total_amount, plan.currency)}
            </Text>
          </View>

          <View style={styles.sumCol}>
            <Text style={styles.label}>المدفوع</Text>
            <Text style={styles.valSuccess} bold ltr>
              {formatMoney(plan.paid_amount, plan.currency)}
            </Text>
          </View>

          <View style={styles.sumCol}>
            <Text style={styles.label}>المتبقي</Text>
            <Text style={styles.valAlert} bold ltr>
              {formatMoney(plan.remaining_amount, plan.currency)}
            </Text>
          </View>
        </View>

        {/* Financial Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            تم سداد {plan.paid_schedule_count} من {plan.schedule_count} أسط
          </Text>
          <Text style={styles.actionLink}>تفاصيل العقد والجدول ←</Text>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  infoCol: {
    flex: 1,
    marginLeft: themeTokens.spacing.sm,
  },
  buyerName: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.md,
  },
  invoiceNo: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  carText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    marginBottom: themeTokens.spacing.xs,
  },
  summaryBox: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: themeTokens.colors.background,
    padding: themeTokens.spacing.sm,
    borderRadius: themeTokens.radius.md,
    marginVertical: themeTokens.spacing.xs,
  },
  sumCol: {
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  val: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  valSuccess: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
  valAlert: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.danger,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: themeTokens.radius.full,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeTokens.colors.primary,
  },
  footerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  footerText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  actionLink: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
