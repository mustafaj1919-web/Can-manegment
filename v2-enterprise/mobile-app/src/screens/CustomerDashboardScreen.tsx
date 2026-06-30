import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LayoutDashboard, ReceiptText, ShieldCheck, ChevronLeft, CreditCard } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customerService } from '../services/customerService';
import { CustomerDashboard } from '../types/customer';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

interface CustomerDashboardScreenProps {
  customerName: string;
  onNavigate: (screen: string) => void;
}

export const CustomerDashboardScreen: React.FC<CustomerDashboardScreenProps> = ({
  customerName,
  onNavigate,
}) => {
  const [dashboard, setDashboard] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    const res = await customerService.getDashboard();
    if (res.success && res.data) {
      setDashboard(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>جاري تحميل البيانات المالية...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} colors={[colors.accent]} />
      }
    >
      {/* Top Banner Greeting */}
      <View style={styles.welcomeBanner}>
        <Text style={styles.helloText}>مرحباً بك،</Text>
        <Text style={styles.nameText}>{customerName}</Text>
        <View style={styles.verifiedBadge}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={styles.verifiedText}>حساب عميل موثق</Text>
        </View>
      </View>

      {/* Upcoming Installment Warning */}
      {dashboard?.next_due_date ? (
        <View style={styles.dueAlertCard}>
          <View style={styles.dueAlertHeader}>
            <Text style={styles.dueAlertTitle}>تنبيه القسط القادم</Text>
            <CreditCard size={18} color={colors.accent} />
          </View>
          <Text style={styles.dueAlertMessage}>
            يستحق عليك قسط بقيمة <Text style={styles.dueAlertValue}>{formatCurrency(dashboard.next_due_amount, 'IQD')}</Text> بتاريخ <Text style={styles.dueAlertValue}>{formatDate(dashboard.next_due_date)}</Text>.
          </Text>
        </View>
      ) : (
        <View style={styles.noDueAlertCard}>
          <Text style={styles.noDueAlertText}>🎉 لا توجد أقساط مستحقة حالياً.</Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>إجمالي المدفوع</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(dashboard?.total_paid ?? 0, 'IQD')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>المبلغ المتبقي</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {formatCurrency(dashboard?.total_remaining ?? 0, 'IQD')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>عدد العقود النشطة</Text>
          <Text style={styles.statValue}>{dashboard?.contracts_count ?? 0} عقود</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>إجمالي مبلغ التقسيط</Text>
          <Text style={styles.statValue}>
            {formatCurrency(dashboard?.total_installments ?? 0, 'IQD')}
          </Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>الخيارات المالية</Text>

        <TouchableOpacity onPress={() => onNavigate('installments')} style={styles.menuItem}>
          <ChevronLeft size={16} color={colors.secondary} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>جدول الأقساط والتواريخ</Text>
            <Text style={styles.menuItemDesc}>تفاصيل الأقساط المستحقة والمدفوعة</Text>
          </View>
          <ReceiptText size={20} color={colors.accent} style={styles.menuItemIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('payments')} style={styles.menuItem}>
          <ChevronLeft size={16} color={colors.secondary} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>سجل المدفوعات والوصولات</Text>
            <Text style={styles.menuItemDesc}>كل الدفعات التي تم سدادها للمعرض</Text>
          </View>
          <LayoutDashboard size={20} color={colors.accent} style={styles.menuItemIcon} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeBanner: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'flex-end', // RTL
    marginBottom: 16,
  },
  helloText: {
    fontSize: 14,
    color: colors.secondary,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: 'bold',
  },
  dueAlertCard: {
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: 16,
    marginBottom: 16,
  },
  dueAlertHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dueAlertTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.accent,
  },
  dueAlertMessage: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 18,
  },
  dueAlertValue: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  noDueAlertCard: {
    backgroundColor: colors.successBg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.success,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  noDueAlertText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    width: '48%',
    alignItems: 'flex-end', // RTL
  },
  statLabel: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  menuSection: {
    marginTop: 8,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  menuItemContent: {
    flex: 1,
    alignItems: 'flex-end', // RTL
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  menuItemDesc: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 2,
  },
  menuItemIcon: {
    // Left-margin or spacing
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 10,
  },
});
