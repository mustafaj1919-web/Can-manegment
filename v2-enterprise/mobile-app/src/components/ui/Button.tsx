import React from 'react'
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const isButtonDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isButtonDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? themeTokens.colors.primary
              : '#FFFFFF'
          }
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`textSize_${size}`],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: themeTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
  },
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: themeTokens.colors.primary,
  },
  secondary: {
    backgroundColor: themeTokens.colors.border,
  },
  danger: {
    backgroundColor: themeTokens.colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: themeTokens.fontWeight.bold,
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: themeTokens.colors.text,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: themeTokens.colors.text,
  },
  text_ghost: {
    color: themeTokens.colors.primary,
  },
  textSize_sm: {
    fontSize: themeTokens.fontSize.xs,
  },
  textSize_md: {
    fontSize: themeTokens.fontSize.sm,
  },
  textSize_lg: {
    fontSize: themeTokens.fontSize.md,
  },
})
