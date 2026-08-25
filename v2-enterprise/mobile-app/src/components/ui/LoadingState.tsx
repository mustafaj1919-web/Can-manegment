import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'جاري التحميل...' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={themeTokens.colors.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeTokens.spacing.xl,
    backgroundColor: themeTokens.colors.background,
  },
  text: {
    marginTop: themeTokens.spacing.md,
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.muted,
  },
})
