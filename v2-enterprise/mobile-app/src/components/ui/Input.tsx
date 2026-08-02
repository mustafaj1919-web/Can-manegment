import React from 'react'
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native'
import { Text } from './Text'
import { themeTokens } from '../../theme/tokens'

interface InputProps {
  label?: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'
  error?: string | null
  ltr?: boolean
  style?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  ltr = false,
  style,
  inputStyle,
}: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeTokens.colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={[
          styles.input,
          error ? styles.inputError : null,
          ltr ? styles.ltr : styles.rtl,
          inputStyle,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: themeTokens.spacing.md,
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
    color: themeTokens.colors.muted,
    marginBottom: themeTokens.spacing.xs,
  },
  input: {
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    paddingHorizontal: themeTokens.spacing.md,
    paddingVertical: 10,
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.text,
  },
  inputError: {
    borderColor: themeTokens.colors.danger,
  },
  rtl: {
    textAlign: 'right',
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  errorText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.danger,
    marginTop: 4,
  },
})
