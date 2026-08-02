import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Link } from 'expo-router'
import { Screen } from '../../src/components/ui/Screen'
import { Text } from '../../src/components/ui/Text'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { Card } from '../../src/components/ui/Card'
import { useAuthStore } from '../../src/store/authStore'
import { themeTokens } from '../../src/theme/tokens'

export default function EmployeeLoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { loginEmployee, isLoading } = useAuthStore()

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }

    try {
      await loginEmployee({ username: username.trim(), password: password.trim() })
    } catch (err: any) {
      Alert.alert('فشل تسجيل الدخول', err.message || 'بيانات الدخول غير صحيحة')
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text variant="h1" style={styles.title}>
          شركة الأصدقاء لتجارة السيارات
        </Text>
        <Text style={styles.subtitle}>تطبيق الموظفين والمالك المؤسسي</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="h2" style={styles.cardTitle}>
          تسجيل الدخول
        </Text>

        <Input
          label="اسم المستخدم"
          value={username}
          onChangeText={setUsername}
          placeholder="أدخل اسم المستخدم..."
          ltr
        />

        <Input
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          ltr
        />

        <Button
          title="دخول للنظام"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.button}
        />
      </Card>

      <View style={styles.footer}>
        <Link href="/(auth)/customer-login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>تسجيل دخول الزبائن وتتبع الأقساط ←</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: themeTokens.spacing.xl,
  },
  title: {
    fontSize: themeTokens.fontSize.xl,
    color: themeTokens.colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  card: {
    padding: themeTokens.spacing.xl,
  },
  cardTitle: {
    marginBottom: themeTokens.spacing.lg,
    color: themeTokens.colors.text,
  },
  button: {
    marginTop: themeTokens.spacing.md,
  },
  footer: {
    marginTop: themeTokens.spacing.xl,
    alignItems: 'center',
  },
  linkButton: {
    padding: themeTokens.spacing.sm,
  },
  linkText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
