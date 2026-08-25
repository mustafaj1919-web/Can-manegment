import React from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getCustomerDashboard, getCustomerProfile, getCustomerContracts } from '../../../api/customerApi'
import { formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader'
import { useAuthStore } from '../../../store/authStore'
import { themeTokens } from '../../../theme/tokens'
import { Calendar, FileText, PhoneCall, CheckCircle2, ChevronLeft } from 'lucide-react-native'

interface CustomerHomeScreenProps {
  onOpenInstallments: () => void
  onOpenPayments: () => void
  onOpenContracts: () => void
}

export function CustomerHomeScreen({
  onOpenInstallments,
  onOpenPayments,
  onOpenContracts,
}: CustomerHomeScreenProps) {
  const { logout } = useAuthStore()

  const { data: profile } = useQuery({
    queryKey: ['customerProfile'],
    queryFn: getCustomerProfile,
  })

  const { data: dashboard, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customerDashboard'],
    queryFn: getCustomerDashboard,
  })

  const { data: contracts } = useQuery({
    queryKey: ['customerContracts'],
    queryFn: getCustomerContracts,
  })

  const primaryContract = contracts && contracts.length > 0 ? contracts[0] : null
  const carName = primaryContract?.vehicle
    ? `${primaryContract.vehicle.brand || ''} ${primaryContract.vehicle.model || ''} ${primaryContract.vehicle.year || ''}`
    : 'Toyota Land Cruiser 2025'

  const total = dashboard?.total_installments || 9000000
  const paid = dashboard?.total_paid || 750000
  const remaining = dashboard?.total_remaining || 8250000
  const isFullyPaid = total > 0 && remaining <= 0

  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 8.3

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={`مرحباً، ${profile?.name || 'حسين'}`}
        subtitle={carName}
        onOpenProfile={logout}
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
            <SkeletonLoader height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <SkeletonLoader height={90} borderRadius={12} style={{ marginBottom: 16 }} />
            <SkeletonLoader height={100} borderRadius={12} />
          </View>
        ) : (
          <>
            {/* Primary Financial Hero Card */}
            <Card style={styles.heroCard}>
              <Text style={styles.heroLabel}>المبلغ المتبقي للذمة</Text>
              <Text variant="h1" style={styles.heroVal} ltr>
                {formatMoney(remaining, 'USD')}
              </Text>

              {/* Progress Track */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
              </View>

              <View style={styles.heroFooter}>
                <Text style={styles.heroFooterText}>
                  %{progressPct} تم سداده من إجمالي الالتزام المالي
                </Text>
                <Text style={styles.heroFooterVal} bold ltr>
                  {formatMoney(paid, 'USD')} / {formatMoney(total, 'USD')}
                </Text>
              </View>
            </Card>

            {/* Next Installment Hero / Fully Paid */}
            {isFullyPaid ? (
              <Card style={styles.paidCard}>
                <View style={styles.paidHeader}>
                  <CheckCircle2 size={20} color={themeTokens.colors.success} />
                  <Text variant="h3" style={styles.paidTitle}>
                    تم سداد العقد بالكامل
                  </Text>
                </View>
                <Text style={styles.paidSub}>
                  نشكرك لالتزامك بالسداد. جميع مستحقاتك المالية محدثة ومكتملة بنجاح.
                </Text>
              </Card>
            ) : (
              <Card style={styles.nextCard}>
                <View style={styles.nextHeader}>
                  <View>
                    <Text style={styles.nextLabel}>القسط القادم المستحق</Text>
                    <Text variant="h2" style={styles.nextVal} ltr>
                      {formatMoney(dashboard?.next_due_amount || 750000, 'USD')}
                    </Text>
                  </View>

                  <StatusBadge status="Available" label="مستحق قريباً" />
                </View>

                <View style={styles.nextFooter}>
                  <Text style={styles.nextDateText} ltr>
                    تاريخ الاستحقاق: 22 أغسطس 2026 • متبقي 20 يوم
                  </Text>
                  <TouchableOpacity onPress={onOpenInstallments} style={styles.linkBtn} activeOpacity={0.7}>
                    <Text style={styles.linkText}>التفاصيل</Text>
                    <ChevronLeft size={16} color={themeTokens.colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* Clean Quick Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity onPress={onOpenInstallments} style={styles.actionTile} activeOpacity={0.8}>
                <Calendar size={20} color={themeTokens.colors.primary} />
                <Text style={styles.actionLabel}>الأقساط</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenPayments} style={styles.actionTile} activeOpacity={0.8}>
                <FileText size={20} color={themeTokens.colors.primary} />
                <Text style={styles.actionLabel}>الوصولات</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenContracts} style={styles.actionTile} activeOpacity={0.8}>
                <PhoneCall size={20} color={themeTokens.colors.primary} />
                <Text style={styles.actionLabel}>الدعم</Text>
              </TouchableOpacity>
            </View>

            {/* Last Payment Card */}
            <Text variant="h2" style={styles.sectionTitle}>
              آخر دفعة مسجلة
            </Text>

            <Card style={styles.lastPaymentCard}>
              <View style={styles.lastRow}>
                <View style={styles.lastIconBox}>
                  <CheckCircle2 size={18} color={themeTokens.colors.success} />
                </View>

                <View style={styles.lastInfo}>
                  <Text style={styles.lastTitle}>سند استلام دفعة قسط</Text>
                  <Text style={styles.lastDate} ltr>
                    01 أغسطس 2026 • وصل رقم RCPT-20260801-0042
                  </Text>
                </View>

                <Text style={styles.lastVal} bold ltr>
                  {formatMoney(750000, 'USD')}
                </Text>
              </View>
            </Card>
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
  heroCard: {
    backgroundColor: themeTokens.colors.surface,
    borderColor: themeTokens.colors.border,
    padding: themeTokens.spacing.lg,
    marginBottom: themeTokens.spacing.md,
  },
  heroLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  heroVal: {
    color: themeTokens.colors.primary,
    fontSize: 28,
    marginVertical: themeTokens.spacing.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: themeTokens.radius.full,
    overflow: 'hidden',
    marginVertical: themeTokens.spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeTokens.colors.primary,
  },
  heroFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  heroFooterText: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  heroFooterVal: {
    fontSize: 11,
    color: themeTokens.colors.primary,
  },
  paidCard: {
    backgroundColor: themeTokens.colors.successBg,
    borderColor: '#A7F3D0',
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
  },
  paidHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  paidTitle: {
    color: themeTokens.colors.success,
    fontSize: themeTokens.fontSize.sm,
  },
  paidSub: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    marginTop: 4,
  },
  nextCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
  },
  nextHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  nextVal: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.lg,
    marginTop: 2,
  },
  nextFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: themeTokens.spacing.sm,
    paddingTop: themeTokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  nextDateText: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  linkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 11,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  actionsGrid: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.lg,
  },
  actionTile: {
    flex: 1,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    paddingVertical: themeTokens.spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 11,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  lastPaymentCard: {
    padding: themeTokens.spacing.md,
  },
  lastRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  lastIconBox: {
    width: 32,
    height: 32,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: themeTokens.colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastInfo: {
    flex: 1,
  },
  lastTitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    fontWeight: themeTokens.fontWeight.bold,
  },
  lastDate: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  lastVal: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
})
