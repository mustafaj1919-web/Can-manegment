import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { themeTokens } from '../../theme/tokens'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radius.lg,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    padding: themeTokens.spacing.lg,
    marginBottom: themeTokens.spacing.md,
  },
})
