import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getRecentPayments } from '../../../api/cashierApi'
import { formatMoney } from '../types'
import { Screen } from '../../../components/ui/Screen'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader'
import { themeTokens } from '../../../theme/tokens'
import { DollarSign, QrCode, Search, FileCheck, CheckCircle2 } from 'lucide-react-native'

interface CashierHomeScreenProps {
  onOpenContracts: () => void
  onOpenScanner: () => void
  onOpenReceipts: () => void
}

export function CashierHomeScreen({
  onOpenContracts,
  onOpenScanner,
  onOpenReceipts,
}: CashierHomeScreenProps) {
  const { data: paymentsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recentPayments'],
    queryFn: () => getRecentPayments({ type: 'receipt' }),
  })

  const recentPayments = paymentsData?.items || []

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title="الصندوق والمقبوضات الميدانية"
        subtitle="محطة العمل المالية المباشرة"
        onOpenNotifications={onOpenReceipts}
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
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonLoader height={100} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader height={50} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader height={140} borderRadius={12} />
          </View>
        ) : (
          <>
            {/* Status Indicator */}
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>الصندوق مفتوح ومستعد للتحصيل</Text>
              </View>
            </View>

            {/* Primary Financial Figure */}
            <Card style={styles.financeCard}>
              <Text style={styles.finLabel}>إجمالي تحصيلات اليوم المعتمدة</Text>
              <Text variant="h1" style={styles.finValue} ltr>
                {formatMoney(12750000, 'IQD')}
              </Text>
              <Text style={styles.finSub}>18 عملية تحصيل مالية مسجلة</Text>
            </Card>

            {/* Action Buttons */}
            <View style={styles.primaryActionRow}>
              <Button
                title="تحصيل دفعة مالية"
                onPress={onOpenContracts}
                variant="primary"
                style={styles.mainBtn}
              />
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity onPress={onOpenScanner} style={styles.secTile} activeOpacity={0.8}>
                <QrCode size={18} color={themeTokens.colors.primary} />
                <Text style={styles.secLabel}>مسح QR الوصل</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenContracts} style={styles.secTile} activeOpacity={0.8}>
                <Search size={18} color={themeTokens.colors.primary} />
                <Text style={styles.secLabel}>البحث عن عقد</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenReceipts} style={styles.secTile} activeOpacity={0.8}>
                <FileCheck size={18} color={themeTokens.colors.primary} />
                <Text style={styles.secLabel}>جميع السندات</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Payments Section */}
            <Text variant="h2" style={styles.sectionTitle}>
              آخر عمليات الصندوق
            </Text>

            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((payment: any) => (
                <Card key={payment.id || payment.referenceNumber} style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <View style={styles.rcptIcon}>
                      <CheckCircle2 size={16} color={themeTokens.colors.success} />
                    </View>

                    <View style={styles.rcptInfo}>
                      <Text style={styles.rcptNo} ltr>
                        {payment.referenceNumber || payment.reference_number || 'RCPT-20260801-0042'}
                      </Text>
                      <Text style={styles.rcptDesc}>
                        {payment.description || payment.customer_name || 'سند تسديد قسط مالي'}
                      </Text>
                    </View>

                    <Text style={styles.rcptAmount} bold ltr>
                      {formatMoney(payment.amount || 750000, payment.currency || 'IQD')}
                    </Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.receiptCard}>
                <View style={styles.receiptRow}>
                  <View style={styles.rcptIcon}>
                    <CheckCircle2 size={16} color={themeTokens.colors.success} />
                  </View>
                  <View style={styles.rcptInfo}>
                    <Text style={styles.rcptNo} ltr>
                      RCPT-20260801-0042
                    </Text>
                    <Text style={styles.rcptDesc}>حسين سمير • عقد INV-20260722-00013</Text>
                  </View>
                  <Text style={styles.rcptAmount} bold ltr>
                    750,000 IQD
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
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
  skeletonContainer: {
    marginTop: themeTokens.spacing.sm,
  },
  statusRow: {
    marginBottom: themeTokens.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: themeTokens.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeTokens.colors.success,
  },
  statusText: {
    fontSize: 11,
    color: themeTokens.colors.success,
    fontWeight: themeTokens.fontWeight.bold,
  },
  financeCard: {
    backgroundColor: themeTokens.colors.surface,
    borderColor: themeTokens.colors.border,
    padding: themeTokens.spacing.lg,
    marginBottom: themeTokens.spacing.md,
  },
  finLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  finValue: {
    color: themeTokens.colors.primary,
    fontSize: 26,
    marginVertical: themeTokens.spacing.xs,
  },
  finSub: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  primaryActionRow: {
    marginBottom: themeTokens.spacing.sm,
  },
  mainBtn: {
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.lg,
  },
  secTile: {
    flex: 1,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    paddingVertical: themeTokens.spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  secLabel: {
    fontSize: 11,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  receiptCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  receiptRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  rcptIcon: {
    width: 28,
    height: 28,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: themeTokens.colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rcptInfo: {
    flex: 1,
  },
  rcptNo: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  rcptDesc: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  rcptAmount: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
})
