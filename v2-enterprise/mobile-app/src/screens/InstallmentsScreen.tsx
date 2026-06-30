import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowRight, Filter } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customerService } from '../services/customerService';
import { Installment } from '../types/installment';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

interface InstallmentsScreenProps {
  onBack: () => void;
}

export const InstallmentsScreen: React.FC<InstallmentsScreenProps> = ({ onBack }) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>(''); // '', 'Paid', 'Pending', 'Overdue'

  const fetchInstallments = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    const res = await customerService.getInstallments(filterStatus || undefined);
    if (res.success && res.data) {
      setInstallments(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchInstallments();
  }, [filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge label="مدفوع" type="success" />;
      case 'Overdue':
        return <Badge label="متأخر" type="danger" />;
      case 'PartiallyPaid':
        return <Badge label="مدفوع جزئياً" type="warning" />;
      default:
        return <Badge label="مستحق" type="info" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowRight size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>جدول الأقساط المستحقة</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterStatus('')}
          style={[styles.filterTab, filterStatus === '' && styles.filterTabActive]}
        >
          <Text style={[styles.filterText, filterStatus === '' && styles.filterTextActive]}>الكل</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterStatus('Pending')}
          style={[styles.filterTab, filterStatus === 'Pending' && styles.filterTabActive]}
        >
          <Text style={[styles.filterText, filterStatus === 'Pending' && styles.filterTextActive]}>مستحقة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterStatus('Paid')}
          style={[styles.filterTab, filterStatus === 'Paid' && styles.filterTabActive]}
        >
          <Text style={[styles.filterText, filterStatus === 'Paid' && styles.filterTextActive]}>مدفوعة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterStatus('Overdue')}
          style={[styles.filterTab, filterStatus === 'Overdue' && styles.filterTabActive]}
        >
          <Text style={[styles.filterText, filterStatus === 'Overdue' && styles.filterTextActive]}>متأخرة</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري تحميل الأقساط...</Text>
        </View>
      ) : (
        <FlatList
          data={installments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchInstallments(true)} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد أقساط تطابق الفلتر المختار.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.installmentCard}>
              <View style={styles.cardHeader}>
                {getStatusBadge(item.status)}
                <Text style={styles.installmentTitle}>قسط رقم {item.installment_number}</Text>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text style={styles.valText}>{formatDate(item.due_date)}</Text>
                  <Text style={styles.labelText}>تاريخ الاستحقاق:</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.valText}>{formatCurrency(item.amount, 'IQD')}</Text>
                  <Text style={styles.labelText}>قيمة القسط:</Text>
                </View>
                {item.paid_amount > 0 && (
                  <View style={styles.row}>
                    <Text style={[styles.valText, { color: colors.success }]}>{formatCurrency(item.paid_amount, 'IQD')}</Text>
                    <Text style={styles.labelText}>المدفوع جزئياً:</Text>
                  </View>
                )}
                <View style={[styles.row, { borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.valText, { fontWeight: 'bold', color: item.status === 'Paid' ? colors.success : colors.danger }]}>
                    {formatCurrency(item.amount - item.paid_amount, 'IQD')}
                  </Text>
                  <Text style={[styles.labelText, { fontWeight: 'bold' }]}>المتبقي للسداد:</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.contractText}>عقد رقم: {item.contract_number}</Text>
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
  filterRow: {
    flexDirection: 'row-reverse', // RTL
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
  },
  installmentCard: {
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
  installmentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardBody: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    color: colors.secondary,
  },
  valText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    alignItems: 'flex-end', // RTL
  },
  contractText: {
    fontSize: 10,
    color: colors.secondary,
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
