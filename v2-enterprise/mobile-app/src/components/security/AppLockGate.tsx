import React, { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native'
import {
  authenticateWithBiometrics,
  getBiometricPreference,
  checkBiometricCapability,
} from '../../services/biometricService'
import { Text } from '../ui/Text'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import { useAuthStore } from '../../store/authStore'
import { themeTokens } from '../../theme/tokens'

const BACKGROUND_LOCK_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

interface AppLockGateProps {
  children: React.ReactNode
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { isAuthenticated } = useAuthStore()
  const [isLocked, setIsLocked] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const backgroundTimeRef = useRef<number | null>(null)

  useEffect(() => {
    getBiometricPreference().then((enabled) => {
      setBiometricEnabled(enabled)
    })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !biometricEnabled) {
      setIsLocked(false)
      return
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now()
      } else if (nextAppState === 'active') {
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current
          if (elapsed >= BACKGROUND_LOCK_TIMEOUT_MS) {
            setIsLocked(true)
          }
        }
        backgroundTimeRef.current = null
      }
    })

    return () => {
      subscription.remove()
    }
  }, [isAuthenticated, biometricEnabled])

  const handleUnlock = async () => {
    const success = await authenticateWithBiometrics('افتح التطبيق لاستكمال الجلسة')
    if (success) {
      setIsLocked(false)
    }
  }

  if (isLocked) {
    return (
      <Screen style={styles.lockScreen}>
        <View style={styles.lockContainer}>
          <Text variant="h1" style={styles.lockTitle}>
            التطبيق مقفل للأمان 🔒
          </Text>
          <Text style={styles.lockDesc}>
            تم قفل الجلسة تلقائياً نظراً لعدم استخدام التطبيق لعدة دقائق. يرجى التحقق من البصمة للاستمرار.
          </Text>

          <Button
            title="افتح بالبصمة / Face ID 👤"
            onPress={handleUnlock}
            variant="primary"
            style={styles.unlockBtn}
          />
        </View>
      </Screen>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  lockScreen: {
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: themeTokens.spacing.lg,
  },
  lockContainer: {
    width: '100%',
    alignItems: 'center',
    padding: themeTokens.spacing.xl,
    backgroundColor: '#1E293B',
    borderRadius: themeTokens.radius.lg,
  },
  lockTitle: {
    color: '#38BDF8',
    marginBottom: themeTokens.spacing.sm,
    textAlign: 'center',
  },
  lockDesc: {
    color: '#94A3B8',
    fontSize: themeTokens.fontSize.xs,
    textAlign: 'center',
    marginBottom: themeTokens.spacing.xl,
    lineHeight: 20,
  },
  unlockBtn: {
    width: '100%',
  },
})
