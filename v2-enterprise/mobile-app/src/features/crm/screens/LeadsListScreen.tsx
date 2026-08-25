import React, { useState } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getPipeline } from '../../../api/crmApi'
import { DealItem } from '../types'
import { formatMoney } from '../../cashier/types'
import { Screen } from '../../../components/ui/Screen'
import { AppHeader } from '../../../components/ui/AppHeader'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'
import { Phone, MessageSquare, ChevronLeft } from 'lucide-react-native'

interface LeadsListScreenProps {
  onSelectLead?: (leadId: string) => void
  onSelectDeal?: (dealId: string) => void
  onOpenNewLead?: () => void
}

const STAGE_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'lead', label: 'جديد' },
  { key: 'contacted', label: 'تواصل' },
  { key: 'negotiating', label: 'تفاوض' },
  { key: 'reserved', label: 'محجوز' },
]

export function LeadsListScreen({ onSelectLead, onSelectDeal, onOpenNewLead }: LeadsListScreenProps) {
  const [selectedStage, setSelectedStage] = useState('all')
  const handleSelect = onSelectLead || onSelectDeal || (() => {})

  const { data: pipeline, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['crmPipeline'],
    queryFn: () => getPipeline(),
  })

  const allDeals: DealItem[] = pipeline
    ? Object.values(pipeline.by_stage || {}).flat()
    : []

  const filteredDeals = selectedStage === 'all'
    ? allDeals
    : allDeals.filter((d) => d.stage === selectedStage)

  const handleCall = (phone?: string | null) => {
    if (!phone) return
    Linking.openURL(`tel:${phone}`)
  }

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    Linking.openURL(`https://wa.me/${cleanPhone}`)
  }

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title="إدارة الفرص والزبائن (CRM)"
        subtitle="متابعات المبيعات والعملاء المحتملين"
        onOpenNotifications={onOpenNewLead}
      />

      {/* Stage Filter Chips */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STAGE_TABS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = selectedStage === item.key
            return (
              <TouchableOpacity
                onPress={() => setSelectedStage(item.key)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonLoader height={80} borderRadius={12} style={{ marginBottom: 8 }} />
          <SkeletonLoader height={80} borderRadius={12} style={{ marginBottom: 8 }} />
          <SkeletonLoader height={80} borderRadius={12} />
        </View>
      ) : isError ? (
        <EmptyState title="تعذر جلب الفرص" description="تأكد من الاتصال بالشبكة وحاول مجدداً." />
      ) : (
        <FlatList
          data={filteredDeals}
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
            <TouchableOpacity onPress={() => handleSelect(item.id)} activeOpacity={0.8}>
              <Card style={styles.leadCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.custInfo}>
                    <Text variant="h3" style={styles.custName}>
                      {item.customer_name || 'عميل مجهول'}
                    </Text>
                    <Text style={styles.custPhone} ltr>
                      {item.customer_phone || '—'}
                    </Text>
                  </View>
                  <StatusBadge status={item.stage === 'negotiating' ? 'Reserved' : 'Available'} label={item.stage_label || 'فرصة'} />
                </View>

                {item.car_name && (
                  <Text style={styles.carText}>
                    🚗 {item.car_name}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.amountText} bold ltr>
                    {formatMoney(item.expected_price || 750000, item.currency || 'USD')} متوقع
                  </Text>

                  <View style={styles.actionRow}>
                    {item.customer_phone && (
                      <>
                        <TouchableOpacity onPress={() => handleCall(item.customer_phone)} style={styles.iconBtn}>
                          <Phone size={14} color={themeTokens.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleWhatsApp(item.customer_phone)} style={styles.iconBtn}>
                          <MessageSquare size={14} color={themeTokens.colors.success} />
                        </TouchableOpacity>
                      </>
                    )}
                    <ChevronLeft size={16} color={themeTokens.colors.muted} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد فرص مطابقة"
              description="جميع متابعات هذا القسم محدثة ولا توجد أي طلبات معلقة."
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: themeTokens.colors.background,
  },
  filterRow: {
    paddingHorizontal: themeTokens.spacing.lg,
    paddingVertical: themeTokens.spacing.sm,
    backgroundColor: themeTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: themeTokens.radius.full,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginLeft: 6,
  },
  chipSelected: {
    backgroundColor: themeTokens.colors.primary,
    borderColor: themeTokens.colors.primary,
  },
  chipText: {
    fontSize: 11,
    color: themeTokens.colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: themeTokens.fontWeight.bold,
  },
  skeletonContainer: {
    padding: themeTokens.spacing.lg,
  },
  listContent: {
    padding: themeTokens.spacing.lg,
    paddingBottom: themeTokens.spacing.huge,
  },
  leadCard: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  custInfo: {
    flex: 1,
  },
  custName: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.xs,
  },
  custPhone: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  carText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  amountText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: themeTokens.radius.sm,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
})
