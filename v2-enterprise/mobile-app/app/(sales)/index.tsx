import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { getCrmSummary } from '../../src/api/crmApi'
import { Screen } from '../../src/components/ui/Screen'
import { Text } from '../../src/components/ui/Text'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import { StatusBadge } from '../../src/components/ui/StatusBadge'
import { useAuthStore } from '../../src/store/authStore'
import { themeTokens } from '../../src/theme/tokens'

export default function SalesHomeScreen() {
  const router = useRouter()
  const { user, activeBranch, logout } = useAuthStore()

  const { data: summary } = useQuery({
    queryKey: ['crmSummary'],
    queryFn: getCrmSummary,
  })

  return (
    <Screen style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text variant="h2" style={styles.userName}>
            مساحة عمل المبيعات
          </Text>
          <View style={styles.badgeRow}>
            <StatusBadge status="Active" label={user?.role || 'Sales'} />
            <Text style={styles.branchName}>
              الفرع: {activeBranch?.name || 'الفرع الحالي'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {/* Main Quick Nav Buttons */}
      <View style={styles.quickNavRow}>
        <Button
          title="الفرص التجارية 👥"
          onPress={() => router.push('/(sales)/crm')}
          variant="primary"
          style={styles.quickNavBtn}
        />
        <Button
          title="متابعات اليوم 📅"
          onPress={() => router.push('/(sales)/crm/follow-ups')}
          variant="outline"
          style={styles.quickNavBtn}
        />
      </View>

      <View style={styles.quickNavRow}>
        <Button
          title="تصفح المخزون 🚗"
          onPress={() => router.push('/(sales)/inventory')}
          variant="secondary"
          style={styles.quickNavBtn}
        />
        <Button
          title="ماسح الشاصي 📷"
          onPress={() => router.push('/scanner')}
          variant="outline"
          style={styles.quickNavBtn}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Operational CRM Summary Grid */}
        <View style={styles.grid}>
          <Card style={styles.gridCard}>
            <Text variant="caption">إجمالي العملاء</Text>
            <Text variant="h2" style={styles.metricVal} ltr>
              {summary?.total_customers ?? '—'}
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text variant="caption">عملاء هذا الشهر</Text>
            <Text variant="h2" style={styles.metricVal} ltr>
              {summary?.new_this_month ?? '—'}
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text variant="caption">المتابعات المستحقة</Text>
            <Text variant="h2" style={styles.metricValAlert} ltr>
              {summary?.follow_ups_due ?? '—'}
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <Text variant="caption">تفاعلات هذا الأسبوع</Text>
            <Text variant="h2" style={styles.metricVal} ltr>
              {summary?.interactions_week ?? '—'}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
    paddingBottom: themeTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  userName: {
    color: themeTokens.colors.primary,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  branchName: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  logoutButton: {
    padding: themeTokens.spacing.xs,
  },
  logoutText: {
    color: themeTokens.colors.danger,
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
  },
  shellCard: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  cardHeader: {
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.xs,
  },
  cardDesc: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  quickNavBtn: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: themeTokens.spacing.xl,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: themeTokens.spacing.sm,
  },
  gridCard: {
    width: '48%',
    padding: themeTokens.spacing.md,
  },
  metricVal: {
    marginTop: themeTokens.spacing.xs,
    color: themeTokens.colors.primary,
  },
  metricValAlert: {
    marginTop: themeTokens.spacing.xs,
    color: themeTokens.colors.warning,
  },
  quickNavRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.md,
  },
})
