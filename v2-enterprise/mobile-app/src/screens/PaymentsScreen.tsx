import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowRight, Landmark, Receipt } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customerService } from '../services/customerService';
import { PaymentHistory } from '../types/installment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

interface PaymentsScreenProps {
  onBack: () => void;
}

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ onBack }) => {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    const res = await customerService.getPayments();
    if (res.success && res.data) {
      setPayments(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getMethodIcon = (method: string) => {
    return <Landmark size={18} color={colors.accent} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowRight size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سجل المدفوعات والوصولات</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري تحميل الوصولات...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد وصولات قبض مسجلة لحسابك حالياً.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.amountText}>{formatCurrency(item.amount, 'IQD')}</Text>
                <View style={styles.refInfo}>
                  <Text style={styles.refTitle}>سند قبض رقم: {item.reference_number || 'غير محدد'}</Text>
                  <Text style={styles.dateText}>{formatDate(item.payment_date)}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.descText}>{item.description || 'سداد جزء من الأقساط المستحقة لعقود التقسيط.'}</Text>
                <View style={styles.methodRow}>
                  <Text style={styles.methodVal}>
                    {item.method === 'Cash' ? 'نقدي' : item.method === 'Bank' ? 'تحويل بنكي / شيك' : item.method}
                  </Text>
                  <Text style={styles.methodLabel}>طريقة الدفع:</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  refInfo: {
    alignItems: 'flex-end', // RTL
  },
  refTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  dateText: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  cardBody: {
    alignItems: 'flex-end', // RTL
  },
  descText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 16,
  },
  methodRow: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  methodLabel: {
    fontSize: 10,
    color: colors.secondary,
  },
  methodVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondary,
  },
});
