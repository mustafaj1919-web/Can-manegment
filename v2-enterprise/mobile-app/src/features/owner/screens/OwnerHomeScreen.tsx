import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getOwnerDashboard } from '../../../api/ownerApi'
import { useAuthStore } from '../../../store/authStore'
import { formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader'
import { themeTokens } from '../../../theme/tokens'
import { Car, Users, AlertCircle, TrendingUp, Activity } from 'lucide-react-native'

interface OwnerHomeScreenProps {
  onOpenInventory: () => void
  onOpenCashier: () => void
  onOpenCRM: () => void
  onOpenNotifications: () => void
}

export function OwnerHomeScreen({
  onOpenInventory,
  onOpenCashier,
  onOpenCRM,
  onOpenNotifications,
}: OwnerHomeScreenProps) {
  const { user } = useAuthStore()

  const { data: dashboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ownerDashboard'],
    queryFn: getOwnerDashboard,
  })

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={`صباح الخير، ${user?.name || 'مصطفى'}`}
        subtitle="شركة الأصدقاء لتجارة السيارات • فرع بغداد"
        onOpenNotifications={onOpenNotifications}
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
            <SkeletonLoader height={110} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader height={70} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader height={140} borderRadius={12} />
          </View>
        ) : (
          <>
            {/* Compact Executive Financial Summary */}
            <Card style={styles.financialCard}>
              <View style={styles.finHeader}>
                <Text style={styles.finLabel}>إجمالي التحصيلات الكلية (المبيعات)</Text>
                <View style={styles.badgeSuccess}>
                  <TrendingUp size={12} color={themeTokens.colors.success} />
                  <Text style={styles.badgeText}>+12.4% هذا الشهر</Text>
                </View>
              </View>

              <Text variant="h1" style={styles.finValue} ltr>
                {formatMoney(dashboard?.total_revenue || 248500, 'USD')}
              </Text>

              <View style={styles.finFooter}>
                <Text style={styles.finSubText}>تحصيلات اليوم: </Text>
                <Text style={styles.finSubVal} bold ltr>
                  {formatMoney(dashboard?.today_collections || 12750000, 'IQD')}
                </Text>
              </View>
            </Card>

            {/* Compact KPI Row */}
            <View style={styles.kpiGrid}>
              <TouchableOpacity onPress={onOpenInventory} activeOpacity={0.8} style={styles.kpiTile}>
                <View style={styles.kpiIconBox}>
                  <Car size={18} color={themeTokens.colors.primary} />
                </View>
                <Text style={styles.kpiLabel}>السيارات</Text>
                <Text variant="h2" style={styles.kpiValue} ltr>
                  {dashboard?.inventory_count || 128}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenCRM} activeOpacity={0.8} style={styles.kpiTile}>
                <View style={styles.kpiIconBox}>
                  <Users size={18} color={themeTokens.colors.info} />
                </View>
                <Text style={styles.kpiLabel}>العملاء</Text>
                <Text variant="h2" style={styles.kpiValue} ltr>
                  {dashboard?.total_customers || 342}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onOpenCashier} activeOpacity={0.8} style={styles.kpiTile}>
                <View style={[styles.kpiIconBox, { backgroundColor: themeTokens.colors.dangerBg }]}>
                  <AlertCircle size={18} color={themeTokens.colors.danger} />
                </View>
                <Text style={styles.kpiLabel}>المتأخرات</Text>
                <Text variant="h2" style={[styles.kpiValue, { color: themeTokens.colors.danger }]} ltr>
                  {dashboard?.overdue_count || 18}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Operational Attention Section */}
            <Text variant="h2" style={styles.sectionTitle}>
              يحتاج انتباهك
            </Text>

            <Card style={styles.attentionCard}>
              <TouchableOpacity onPress={onOpenCashier} style={styles.attentionRow} activeOpacity={0.7}>
                <View style={styles.attIconBox}>
                  <AlertCircle size={16} color={themeTokens.colors.danger} />
                </View>
                <View style={styles.attInfo}>
                  <Text style={styles.attTitle}>8 أقساط متأخرة تجاوزت تاريخ الاستحقاق</Text>
                  <Text style={styles.attSub}>يتطلب المتابعة الفورية من أمين الصندوق</Text>
                </View>
                <StatusBadge status="Overdue" label="عاجل" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity onPress={onOpenInventory} style={styles.attentionRow} activeOpacity={0.7}>
                <View style={[styles.attIconBox, { backgroundColor: themeTokens.colors.warningBg }]}>
                  <Car size={16} color={themeTokens.colors.warning} />
                </View>
                <View style={styles.attInfo}>
                  <Text style={styles.attTitle}>5 سيارات راكدة تجاوزت 60 يوماً بالمخزون</Text>
                  <Text style={styles.attSub}>مراجعة خطة التسعير والعروض</Text>
                </View>
                <StatusBadge status="Reserved" label="تنبيه" />
              </TouchableOpacity>
            </Card>

            {/* Recent Activities Section */}
            <Text variant="h2" style={styles.sectionTitle}>
              آخر النشاطات والعمليات
            </Text>

            {dashboard?.recent_sales && dashboard.recent_sales.length > 0 ? (
              dashboard.recent_sales.map((sale) => (
                <Card key={sale.id} style={styles.activityCard}>
                  <View style={styles.actRow}>
                    <View style={styles.actIcon}>
                      <Activity size={16} color={themeTokens.colors.primary} />
                    </View>

                    <View style={styles.actDetails}>
                      <Text style={styles.actTitle}>{sale.customer_name}</Text>
                      <Text style={styles.actSub}>
                        {sale.vehicle_model} • {sale.contract_number}
                      </Text>
                    </View>

                    <Text style={styles.actAmount} bold ltr>
                      {formatMoney(sale.amount, 'IQD')}
                    </Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.activityCard}>
                <View style={styles.actRow}>
                  <View style={styles.actIcon}>
                    <Activity size={16} color={themeTokens.colors.info} />
                  </View>
                  <View style={styles.actDetails}>
                    <Text style={styles.actTitle}>عملية تحصيل قسط مالي</Text>
                    <Text style={styles.actSub}>عقد INV-20260722-00013 • حسين سمير</Text>
                  </View>
                  <Text style={styles.actAmount} bold ltr>
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
  financialCard: {
    backgroundColor: themeTokens.colors.surface,
    borderColor: themeTokens.colors.border,
    padding: themeTokens.spacing.lg,
    marginBottom: themeTokens.spacing.md,
  },
  finHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  badgeSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeTokens.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: themeTokens.radius.full,
  },
  badgeText: {
    fontSize: 10,
    color: themeTokens.colors.success,
    fontWeight: themeTokens.fontWeight.bold,
  },
  finValue: {
    color: themeTokens.colors.primary,
    marginVertical: themeTokens.spacing.xs,
    fontSize: 26,
  },
  finFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  finSubText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  finSubVal: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
  },
  kpiGrid: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.lg,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    padding: themeTokens.spacing.md,
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  kpiValue: {
    fontSize: themeTokens.fontSize.lg,
    color: themeTokens.colors.primary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  attentionCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.lg,
  },
  attentionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  attIconBox: {
    width: 30,
    height: 30,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: themeTokens.colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attInfo: {
    flex: 1,
  },
  attTitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    fontWeight: themeTokens.fontWeight.bold,
  },
  attSub: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: themeTokens.colors.border,
    marginVertical: themeTokens.spacing.sm,
  },
  activityCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  actRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  actIcon: {
    width: 28,
    height: 28,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actDetails: {
    flex: 1,
  },
  actTitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    fontWeight: themeTokens.fontWeight.bold,
  },
  actSub: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  actAmount: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
})
