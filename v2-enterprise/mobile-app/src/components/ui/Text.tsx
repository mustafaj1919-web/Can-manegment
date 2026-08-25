import React from 'react'
import { Text as RNText, TextStyle, StyleProp, StyleSheet } from 'react-native'
import { themeTokens } from '../../theme/tokens'

interface TextProps {
  children: React.ReactNode
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'code'
  color?: string
  bold?: boolean
  ltr?: boolean
  style?: StyleProp<TextStyle>
}

export function Text({
  children,
  variant = 'body',
  color = themeTokens.colors.text,
  bold = false,
  ltr = false,
  style,
}: TextProps) {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        { color },
        bold && styles.bold,
        ltr && styles.ltr,
        style,
      ]}
    >
      {children}
    </RNText>
  )
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'right',
  },
  h1: {
    fontSize: themeTokens.fontSize.xxl,
    fontWeight: themeTokens.fontWeight.bold,
  },
  h2: {
    fontSize: themeTokens.fontSize.xl,
    fontWeight: themeTokens.fontWeight.bold,
  },
  h3: {
    fontSize: themeTokens.fontSize.lg,
    fontWeight: themeTokens.fontWeight.semibold,
  },
  body: {
    fontSize: themeTokens.fontSize.md,
    fontWeight: themeTokens.fontWeight.regular,
  },
  caption: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  code: {
    fontSize: themeTokens.fontSize.sm,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  bold: {
    fontWeight: themeTokens.fontWeight.bold,
  },
  ltr: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
})
