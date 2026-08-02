import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getCustomerInstallments } from '../../../api/customerApi'
import { getCustomerInstallmentStatusConfig } from '../types'
import { formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

const STATUS_TABS = [
  { key: 'all', label: 'جميع الأقساط' },
  { key: 'Pending', label: 'المستحقة القادمة' },
  { key: 'Overdue', label: 'المتأخرة' },
  { key: 'Paid', label: 'المسددة' },
]

export function CustomerInstallmentsScreen() {
  const [selectedStatus, setSelectedStatus] = useState('all')

  const { data: installments, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customerInstallments', selectedStatus],
    queryFn: () => getCustomerInstallments(selectedStatus === 'all' ? undefined : selectedStatus),
  })

  return (
    <Screen style={styles.screen}>
      <Text variant="h1" style={styles.title}>
        جدول الأقساط الالتزامية (Installments Timeline)
      </Text>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedStatus(tab.key)}
              style={[styles.tab, isSelected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {isLoading ? (
        <LoadingState message="جاري جلب جدول الأقساط..." />
      ) : isError ? (
        <EmptyState title="تعذر جلب الأقساط" description="تأكد من الاتصال بالشبكة وحاول مجدداً." />
      ) : (
        <FlatList
          data={installments || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={[themeTokens.colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const config = getCustomerInstallmentStatusConfig(item.status)
            const isOverdue = item.status === 'Overdue' || (item.status !== 'Paid' && new Date(item.due_date) < new Date())

            return (
              <Card style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text variant="h3" style={styles.itemNo}>
                      القسط رقم #{item.installment_number}
                    </Text>
                    <Text style={styles.contractNo} ltr>
                      عقد رقم: {item.contract_number}
                    </Text>
                  </View>

                  <StatusBadge
                    status={isOverdue ? 'Overdue' : config.badgeStatus}
                    label={isOverdue ? 'متأخر' : config.label}
                  />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.row}>
                    <Text style={styles.label}>مبلغ القسط:</Text>
                    <Text style={styles.val} bold ltr>
                      {formatMoney(item.amount, 'IQD')}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>تاريخ الاستحقاق:</Text>
                    <Text style={isOverdue ? styles.valAlert : styles.val} ltr>
                      {new Date(item.due_date).toLocaleDateString('ar-IQ')}
                    </Text>
                  </View>

                  {item.paid_amount > 0 && (
                    <View style={styles.row}>
                      <Text style={styles.label}>المبلغ المسدد:</Text>
                      <Text style={styles.valSuccess} bold ltr>
                        {formatMoney(item.paid_amount, 'IQD')}
                      </Text>
                    </View>
                  )}

                  {item.payment_date && (
                    <View style={styles.row}>
                      <Text style={styles.label}>تاريخ الدفع الفعلي:</Text>
                      <Text style={styles.valSuccess} ltr>
                        {new Date(item.payment_date).toLocaleDateString('ar-IQ')}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد أقساط مطابقة"
              description="جميع الأقساط الخاصة بهذه الفئة محدثة ولا توجد أي طلبات متأخرة."
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.md,
  },
  title: {
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    marginBottom: themeTokens.spacing.md,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: themeTokens.radius.full,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginLeft: 6,
  },
  tabSelected: {
    backgroundColor: themeTokens.colors.primary,
    borderColor: themeTokens.colors.primary,
  },
  tabText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  tabTextSelected: {
    color: '#FFFFFF',
    fontWeight: themeTokens.fontWeight.bold,
  },
  listContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
  itemCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNo: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
  },
  contractNo: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  cardBody: {
    backgroundColor: themeTokens.colors.background,
    padding: themeTokens.spacing.xs,
    borderRadius: themeTokens.radius.sm,
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
  valSuccess: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.success,
  },
  valAlert: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.danger,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
