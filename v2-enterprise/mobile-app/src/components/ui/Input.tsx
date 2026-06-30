import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  error?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  editable?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  style,
  inputStyle,
  editable = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        textAlign="right" // Arabic RTL
        style={[
          styles.textInput,
          !editable && styles.disabledInput,
          error ? styles.errorBorder : styles.normalBorder,
          inputStyle,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
    textAlign: 'right', // Arabic RTL
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.card,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    fontFamily: 'System',
  },
  normalBorder: {
    borderColor: colors.border,
  },
  errorBorder: {
    borderColor: colors.danger,
  },
  disabledInput: {
    backgroundColor: colors.border,
    color: colors.secondary,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    textAlign: 'right', // Arabic RTL
  },
});
