import React from 'react'
import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { DealItem, getStageConfig } from '../types'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { themeTokens } from '../../../theme/tokens'

interface DealCardProps {
  deal: DealItem
  onPress: () => void
}

export function DealCard({ deal, onPress }: DealCardProps) {
  const stageConfig = getStageConfig(deal.stage)

  const handlePhoneCall = (e: any) => {
    e.stopPropagation()
    if (!deal.customer_phone) {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا العميل')
      return
    }
    const cleanPhone = deal.customer_phone.replace(/\s+/g, '')
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('خطأ', 'تعذر إجراء الاتصال الهاتفي')
    })
  }

  const handleWhatsApp = (e: any) => {
    e.stopPropagation()
    if (!deal.customer_phone) {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا العميل')
      return
    }
    let cleanPhone = deal.customer_phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('07')) {
      cleanPhone = `964${cleanPhone.slice(1)}`
    }
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح تطبيق واتساب')
    })
  }

  const formattedPrice = deal.expected_price
    ? `${deal.expected_price.toLocaleString()} ${deal.currency || 'IQD'}`
    : 'غير محدد'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.custInfo}>
            <Text variant="h3" style={styles.custName}>
              {deal.customer_name || 'عميل محتمل'}
            </Text>
            {deal.customer_phone && (
              <Text style={styles.custPhone} ltr>
                {deal.customer_phone}
              </Text>
            )}
          </View>

          <StatusBadge status={stageConfig.badgeStatus} label={stageConfig.label} />
        </View>

        {/* Interested Vehicle & Expected Price */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>السيارة المهتم بها:</Text>
            <Text style={styles.val}>{deal.car_name || 'غير محددة'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>السعر المتوقع:</Text>
            <Text style={styles.val} bold ltr>
              {formattedPrice}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>
              منذ {deal.days_in_stage} يوم في المرحلة
            </Text>
          </View>

          <View style={styles.contactButtons}>
            <TouchableOpacity onPress={handleWhatsApp} style={styles.waBtn}>
              <Text style={styles.waBtnText}>واتساب 💬</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePhoneCall} style={styles.callBtn}>
              <Text style={styles.callBtnText}>اتصال 📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: themeTokens.spacing.sm,
  },
  custInfo: {
    flex: 1,
    marginLeft: themeTokens.spacing.sm,
  },
  custName: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.md,
  },
  custPhone: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginTop: 2,
  },
  detailsBox: {
    backgroundColor: themeTokens.colors.background,
    padding: themeTokens.spacing.sm,
    borderRadius: themeTokens.radius.md,
    marginBottom: themeTokens.spacing.sm,
    gap: 4,
  },
  detailRow: {
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
  actionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: themeTokens.radius.sm,
  },
  daysText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  contactButtons: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  callBtn: {
    backgroundColor: themeTokens.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.sm,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
  },
  waBtn: {
    backgroundColor: themeTokens.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.sm,
  },
  waBtnText: {
    color: themeTokens.colors.success,
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
