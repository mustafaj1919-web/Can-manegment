import React from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getCustomerContracts } from '../../../api/customerApi'
import { formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

export function CustomerContractsScreen() {
  const { data: contracts, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customerContracts'],
    queryFn: getCustomerContracts,
  })

  return (
    <Screen style={styles.screen}>
      <Text variant="h1" style={styles.title}>
        عقودي والسيارات المسجلة (My Contracts)
      </Text>

      {isLoading ? (
        <LoadingState message="جاري جلب عقودك الرسمية..." />
      ) : isError ? (
        <EmptyState title="تعذر جلب العقود" description="يرجى التحقق من الشبكة وإعادة المحاولة." />
      ) : (
        <FlatList
          data={contracts || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={[themeTokens.colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text variant="h3" style={styles.contractNo} ltr>
                    عقد رقم: {item.contract_number}
                  </Text>
                  <Text style={styles.dateText} ltr>
                    تاريخ العقد: {new Date(item.sale_date).toLocaleDateString('ar-IQ')}
                  </Text>
                </View>

                <StatusBadge status={item.status === 'Active' ? 'Active' : 'Sold'} label={item.status === 'Active' ? 'نشط' : 'مكتمل'} />
              </View>

              {item.vehicle && (
                <View style={styles.vehicleBox}>
                  <Text variant="h3" style={styles.carName}>
                    🚗 {item.vehicle.brand} {item.vehicle.model} {item.vehicle.year}
                  </Text>
                </View>
              )}

              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.label}>قيمة العقد الكلية:</Text>
                  <Text style={styles.val} bold ltr>
                    {formatMoney(item.total_price, 'IQD')}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>المقدم المسدد:</Text>
                  <Text style={styles.valSuccess} bold ltr>
                    {formatMoney(item.down_payment, 'IQD')}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>المتبقي الذمة:</Text>
                  <Text style={styles.valAlert} bold ltr>
                    {formatMoney(item.remaining_balance, 'IQD')}
                  </Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد عقود مسجلة"
              description="لم يتم تسجيل أي عقود شفرة أو تقسيط باسمك حتى الآن."
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
    marginBottom: themeTokens.spacing.md,
  },
  listContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.sm,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contractNo: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
  },
  dateText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  vehicleBox: {
    backgroundColor: '#F1F5F9',
    padding: themeTokens.spacing.xs,
    borderRadius: themeTokens.radius.sm,
    marginBottom: 6,
  },
  carName: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
  },
  body: {
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
  },
})
