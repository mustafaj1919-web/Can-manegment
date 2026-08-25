import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, StyleSheet, Text as RNText } from 'react-native'
import { safeLogger } from '../../services/loggerService'
import { themeTokens } from '../../theme/tokens'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    safeLogger.error('Uncaught component error', { error: error.message, componentStack: errorInfo.componentStack })
  }

  private handleReset = () => {
    this.setState({ hasError: false })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <RNText style={styles.title}>حدث خطأ غير متوقع ⚠️</RNText>
            <RNText style={styles.desc}>
              حدث خلل فني غير متوقع. تم تسليطه للنظام بأمان دون كشف أي بيانات حساسة.
            </RNText>
            <RNText style={styles.btn} onPress={this.handleReset}>
              إعادة المحاولة 🔄
            </RNText>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: themeTokens.spacing.lg,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: themeTokens.spacing.xl,
    borderRadius: themeTokens.radius.lg,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: themeTokens.fontSize.md,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: themeTokens.spacing.sm,
  },
  desc: {
    fontSize: themeTokens.fontSize.xs,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: themeTokens.spacing.lg,
    lineHeight: 18,
  },
  btn: {
    color: '#38BDF8',
    fontSize: themeTokens.fontSize.sm,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
})
