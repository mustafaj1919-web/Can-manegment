import React from 'react'
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'
import { Bell, User, ChevronRight } from 'lucide-react-native'

interface AppHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onOpenNotifications?: () => void
  onOpenProfile?: () => void
  style?: StyleProp<ViewStyle>
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  onOpenNotifications,
  onOpenProfile,
  style,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.rightSection}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronRight size={22} color={themeTokens.colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.titlesBox}>
          <Text variant="h2" style={styles.titleText}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.leftSection}>
        {onOpenNotifications && (
          <TouchableOpacity onPress={onOpenNotifications} style={styles.iconBtn} activeOpacity={0.7}>
            <Bell size={20} color={themeTokens.colors.muted} />
          </TouchableOpacity>
        )}
        {onOpenProfile && (
          <TouchableOpacity onPress={onOpenProfile} style={styles.iconBtn} activeOpacity={0.7}>
            <User size={20} color={themeTokens.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: themeTokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
    paddingHorizontal: themeTokens.spacing.lg,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  titlesBox: {
    justifyContent: 'center',
  },
  titleText: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.md,
    fontWeight: themeTokens.fontWeight.bold,
  },
  subtitleText: {
    color: themeTokens.colors.muted,
    fontSize: themeTokens.fontSize.xs,
  },
  leftSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: themeTokens.radius.full,
    backgroundColor: themeTokens.colors.background,
  },
})
