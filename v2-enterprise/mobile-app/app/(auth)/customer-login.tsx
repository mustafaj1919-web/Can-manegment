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

export default function CustomerLoginScreen() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const { loginCustomer, isLoading } = useAuthStore()

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف ورقم الهوية الوطنية/جواز السفر')
      return
    }

    try {
      await loginCustomer({ phone: phone.trim(), password: password.trim() })
    } catch (err: any) {
      Alert.alert('فشل تسجيل الدخول', err.message || 'بيانات الدخول غير صحيحة')
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text variant="h1" style={styles.title}>
          بوابة زبائن معرض الأصدقاء
        </Text>
        <Text style={styles.subtitle}>تتبع الأقساط والسيارات والوصولات الصادرة</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="h2" style={styles.cardTitle}>
          تسجيل دخول الزبون
        </Text>

        <Input
          label="رقم الهاتف المسجل بالعقد"
          value={phone}
          onChangeText={setPhone}
          placeholder="07700000000"
          keyboardType="phone-pad"
          ltr
        />

        <Input
          label="رقم الهوية / كلمة المرور"
          value={password}
          onChangeText={setPassword}
          placeholder="رقم الهوية الوطنية أو الجواز"
          secureTextEntry
          ltr
        />

        <Button
          title="دخول لبوابة الزبون"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.button}
        />
      </Card>

      <View style={styles.footer}>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>← العودة لدخول الموظفين والمالك</Text>
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
