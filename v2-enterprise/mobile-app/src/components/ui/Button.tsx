import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getStyles = () => {
    let buttonStyle: ViewStyle = {};
    let titleStyle: TextStyle = {};

    switch (variant) {
      case 'primary':
        buttonStyle = { backgroundColor: colors.primary };
        titleStyle = { color: colors.white };
        break;
      case 'secondary':
        buttonStyle = { backgroundColor: colors.secondary };
        titleStyle = { color: colors.white };
        break;
      case 'accent':
        buttonStyle = { backgroundColor: colors.accent };
        titleStyle = { color: colors.white };
        break;
      case 'outline':
        buttonStyle = { backgroundColor: colors.transparent, borderWidth: 1.5, borderColor: colors.primary };
        titleStyle = { color: colors.primary };
        break;
      case 'ghost':
        buttonStyle = { backgroundColor: colors.transparent };
        titleStyle = { color: colors.primary };
        break;
    }

    let paddingVertical = 12;
    let fontSize = 15;

    if (size === 'sm') {
      paddingVertical = 8;
      fontSize = 13;
    } else if (size === 'lg') {
      paddingVertical = 16;
      fontSize = 17;
    }

    return {
      button: [
        styles.baseButton,
        buttonStyle,
        { paddingVertical },
        disabled && styles.disabledButton,
        style,
      ] as ViewStyle[],
      title: [
        styles.baseTitle,
        titleStyle,
        { fontSize },
        textStyle,
      ] as TextStyle[],
    };
  };

  const computedStyles = getStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={computedStyles.button}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} size="small" />
      ) : (
        <>
          {icon}
          <Text style={computedStyles.title}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 10,
    flexDirection: 'row-reverse', // Arabic RTL first
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  baseTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
