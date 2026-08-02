import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '../../src/components/ui/Screen'
import { Text } from '../../src/components/ui/Text'
import { Card } from '../../src/components/ui/Card'
import { StatusBadge } from '../../src/components/ui/StatusBadge'
import { Button } from '../../src/components/ui/Button'
import { useAuthStore } from '../../src/store/authStore'
import { themeTokens } from '../../src/theme/tokens'

export default function OwnerHomeScreen() {
  const router = useRouter()
  const { user, activeBranch, branches, capabilities, switchBranch, logout } = useAuthStore()

  const handleBranchSwitch = () => {
    if (!capabilities.canSwitchBranches || branches.length <= 1) return

    const otherBranches = branches.filter((b) => b.id !== activeBranch?.id)
    if (otherBranches.length === 0) return

    const target = otherBranches[0]
    Alert.alert('تبديل الفرع', `هل تريد التبديل إلى فرع (${target.name})؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تأكيد التبديل',
        onPress: async () => {
          try {
            await switchBranch(target.id)
          } catch (err: any) {
            Alert.alert('خطأ', err.message || 'تعذر تبديل الفرع')
          }
        },
      },
    ])
  }

  return (
    <Screen style={styles.screen}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text variant="h2" style={styles.userName}>
            مرحباً، {user?.name || user?.username || 'المالك'}
          </Text>
          <View style={styles.badgeRow}>
            <StatusBadge status="Active" label={user?.role || 'Executive'} />
            <Text style={styles.branchName}>
              الفرع: {activeBranch?.name || 'الفرع الرئيسي'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {/* Branch Switcher Action if Authorized */}
      {capabilities.canSwitchBranches && branches.length > 1 && (
        <Button
          title={`تبديل الفرع النشط (الحالي: ${activeBranch?.name || 'الرئيسي'})`}
          onPress={handleBranchSwitch}
          variant="outline"
          size="sm"
          style={styles.switchButton}
        />
      )}

      {/* Navigation Quick Actions */}
      <View style={styles.quickNavRow}>
        <Button
          title="مخزون السيارات 🚗"
          onPress={() => router.push('/(owner)/inventory')}
          variant="primary"
          style={styles.quickNavBtn}
        />
        <Button
          title="الصندوق والتحصيل 💵"
          onPress={() => router.push('/(owner)/cashier')}
          variant="secondary"
          style={styles.quickNavBtn}
        />
        <Button
          title="ماسح QR 📷"
          onPress={() => router.push('/scanner')}
          variant="outline"
          style={styles.quickNavBtn}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Workstation Summary */}
        <Card style={styles.shellCard}>
          <Text variant="h3" style={styles.cardHeader}>
            لوحة الإدارة والمؤشرات التنفيذية (Executive Workstation)
          </Text>
          <Text style={styles.cardDesc}>
            تم تفعيل وحدة المخزون وماسح الشاصي بنجاح مع حماية بيانات التكاليف والربحية.
          </Text>
        </Card>

        <View style={styles.placeholderGrid}>
          <Card style={styles.gridItem}>
            <Text variant="caption">مبيعات اليوم</Text>
            <Text variant="h3" style={styles.placeholderText}>—</Text>
          </Card>
          <Card style={styles.gridItem}>
            <Text variant="caption">التحصيلات النقدية</Text>
            <Text variant="h3" style={styles.placeholderText}>—</Text>
          </Card>
          <Card style={styles.gridItem}>
            <Text variant="caption">السيولة النقدية</Text>
            <Text variant="h3" style={styles.placeholderText}>—</Text>
          </Card>
          <Card style={styles.gridItem}>
            <Text variant="caption">قيمة المخزون</Text>
            <Text variant="h3" style={styles.placeholderText}>—</Text>
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
  switchButton: {
    marginBottom: themeTokens.spacing.md,
  },
  scrollContent: {
    paddingBottom: themeTokens.spacing.xl,
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
  placeholderGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: themeTokens.spacing.md,
  },
  gridItem: {
    width: '48%',
    padding: themeTokens.spacing.md,
  },
  placeholderText: {
    marginTop: themeTokens.spacing.xs,
    color: themeTokens.colors.muted,
  },
  quickNavRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.md,
  },
  quickNavBtn: {
    flex: 1,
  },
})
