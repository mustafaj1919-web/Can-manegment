import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على سجلات مطابقة في الوقت الحالي.',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="h3" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeTokens.spacing.xxl,
  },
  title: {
    marginBottom: themeTokens.spacing.xs,
    color: themeTokens.colors.text,
  },
  description: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    textAlign: 'center',
  },
})
