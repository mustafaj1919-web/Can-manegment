import React from 'react'
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getNotificationsList, NotificationItem } from '../../../api/notificationApi'
import { formatMoney } from '../../cashier/types'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

interface NotificationCenterModalProps {
  visible: boolean
  onClose: () => void
}

export function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inAppNotifications'],
    queryFn: getNotificationsList,
    enabled: visible,
  })

  if (!visible) return null

  const overdue = data?.overdue || []
  const dueToday = data?.due_today || []
  const dueSoon = data?.due_soon || []
  const allItems: Array<NotificationItem & { alertCategory: string }> = [
    ...overdue.map((i) => ({ ...i, alertCategory: 'متأخر' })),
    ...dueToday.map((i) => ({ ...i, alertCategory: 'مستحق اليوم' })),
    ...dueSoon.map((i) => ({ ...i, alertCategory: 'قادم قريباً' })),
  ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              مركز التنبيهات والإشعارات (Notifications)
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>إغلاق ✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingState message="جاري تحميل التنبيهات..." />
          ) : isError ? (
            <EmptyState title="تعذر جلب التنبيهات" description="تأكد من الاتصال بالشبكة وحاول مجدداً." />
          ) : (
            <FlatList
              data={allItems}
              keyExtractor={(item) => `${item.id}-${item.alertCategory}`}
              contentContainerStyle={styles.listContent}
              onRefresh={refetch}
              refreshing={isLoading}
              renderItem={({ item }) => {
                const isOverdue = item.alertCategory === 'متأخر'
                return (
                  <Card style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text variant="h3" style={styles.custName}>
                        {item.customer_name}
                      </Text>
                      <StatusBadge
                        status={isOverdue ? 'Overdue' : 'Available'}
                        label={item.alertCategory}
                      />
                    </View>

                    <Text style={styles.carText}>🚗 {item.car_name} (عقد: {item.invoice_number})</Text>

                    <View style={styles.itemFooter}>
                      <Text style={styles.label}>المبلغ:</Text>
                      <Text style={isOverdue ? styles.valAlert : styles.val} bold ltr>
                        {formatMoney(item.amount, item.currency)}
                      </Text>
                    </View>
                  </Card>
                )
              }}
              ListEmptyComponent={
                <EmptyState
                  title="لا توجد تنبيهات جديدة"
                  description="جميع المستحقات والتذكيرات محدثة ولا توجد أي إشعارات معلقة."
                />
              }
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeTokens.colors.surface,
    borderTopLeftRadius: themeTokens.radius.lg,
    borderTopRightRadius: themeTokens.radius.lg,
    padding: themeTokens.spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
    paddingBottom: themeTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  title: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
  },
  closeText: {
    color: themeTokens.colors.muted,
    fontSize: themeTokens.fontSize.xs,
  },
  listContent: {
    paddingBottom: themeTokens.spacing.xl,
  },
  itemCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  custName: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.xs,
  },
  carText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    marginVertical: 2,
  },
  itemFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  label: {
    fontSize: 10,
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
})
