import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getCustomerPayments } from '../../../api/customerApi'
import { getReceiptDetail } from '../../../api/cashierApi'
import { DigitalReceiptModal } from '../../cashier/components/DigitalReceiptModal'
import { DigitalReceiptData, formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

export function CustomerPaymentsScreen() {
  const [selectedReceipt, setSelectedReceipt] = useState<DigitalReceiptData | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const { data: payments, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customerPayments'],
    queryFn: getCustomerPayments,
  })

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const receipt = await getReceiptDetail(paymentId)
      setSelectedReceipt(receipt)
      setModalVisible(true)
    } catch (err) {
      // fallback handled cleanly
    }
  }

  return (
    <Screen style={styles.screen}>
      <Text variant="h1" style={styles.title}>
        سجل الوصولات والدفعات المباشرة (My Receipts)
      </Text>

      {isLoading ? (
        <LoadingState message="جاري جلب الوصولات..." />
      ) : isError ? (
        <EmptyState title="تعذر جلب الوصولات" description="تأكد من الاتصال بالشبكة وحاول مجدداً." />
      ) : (
        <FlatList
          data={payments || []}
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
            <TouchableOpacity onPress={() => handleOpenReceipt(item.id)} activeOpacity={0.85}>
              <Card style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text variant="h3" style={styles.refNo} ltr>
                      وصل رقم: {item.reference_number}
                    </Text>
                    <Text style={styles.dateText} ltr>
                      {new Date(item.payment_date).toLocaleString('ar-IQ')}
                    </Text>
                  </View>

                  <StatusBadge status="Paid" label="مقبوض رسمياً" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.descText}>
                    {item.description || 'سند تسديد قسط مالي'}
                  </Text>
                  <Text variant="h2" style={styles.amountText} ltr>
                    {formatMoney(item.amount, 'IQD')}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.methodText}>
                    طريقة الدفع: {item.method === 'Cash' ? 'نقدي 💵' : 'تحويل مصرفي 🏦'}
                  </Text>
                  <Text style={styles.viewLink}>عرض الوصل الرقمي ←</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد وصولات مسجلة"
              description="لم يتم تسجيل أي سندات استلام مالي في حسابك حتى الآن."
            />
          }
        />
      )}

      {/* Digital Receipt Modal */}
      <DigitalReceiptModal
        visible={modalVisible}
        receiptData={selectedReceipt}
        onClose={() => setModalVisible(false)}
      />
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
  itemCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  refNo: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
  },
  dateText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  cardBody: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  descText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    flex: 1,
    marginLeft: 8,
  },
  amountText: {
    color: themeTokens.colors.success,
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  methodText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  viewLink: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
