import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'

interface StatusBadgeProps {
  status: string
  label?: string
  style?: StyleProp<ViewStyle>
}

const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  Active: { bg: themeTokens.colors.successBg, color: themeTokens.colors.success, label: 'نشط' },
  Paid: { bg: themeTokens.colors.successBg, color: themeTokens.colors.success, label: 'مسدد' },
  Available: { bg: themeTokens.colors.successBg, color: themeTokens.colors.success, label: 'متاح' },
  Overdue: { bg: themeTokens.colors.dangerBg, color: themeTokens.colors.danger, label: 'متأخر' },
  Cancelled: { bg: themeTokens.colors.dangerBg, color: themeTokens.colors.danger, label: 'ملغى' },
  Sold: { bg: '#E2E8F0', color: '#475569', label: 'مباع' },
  Reserved: { bg: themeTokens.colors.warningBg, color: themeTokens.colors.warning, label: 'محجوز' },
}

export function StatusBadge({ status, label, style }: StatusBadgeProps) {
  const config = statusMap[status] || {
    bg: themeTokens.colors.border,
    color: themeTokens.colors.text,
    label: status,
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.color }]}>
        {label || config.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
