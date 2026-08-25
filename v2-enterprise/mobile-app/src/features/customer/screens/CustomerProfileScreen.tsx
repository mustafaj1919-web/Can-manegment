import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Switch } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getCustomerProfile } from '../../../api/customerApi'
import {
  checkBiometricCapability,
  getBiometricPreference,
  setBiometricPreference,
} from '../../../services/biometricService'
import { NotificationCenterModal } from '../../notifications/components/NotificationCenterModal'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'
import { useAuthStore } from '../../../store/authStore'
import { themeTokens } from '../../../theme/tokens'

export function CustomerProfileScreen() {
  const { logout } = useAuthStore()
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [notifModalVisible, setNotifModalVisible] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['customerProfile'],
    queryFn: getCustomerProfile,
  })

  useEffect(() => {
    checkBiometricCapability().then((cap) => {
      setBiometricAvailable(cap.available)
    })
    getBiometricPreference().then((enabled) => {
      setBiometricEnabled(enabled)
    })
  }, [])

  const handleToggleBiometric = async (val: boolean) => {
    setBiometricEnabled(val)
    await setBiometricPreference(val)
  }

  const handleSupportCall = () => {
    Linking.openURL('tel:07700000000').catch(() => Alert.alert('خطأ', 'تعذر إجراء الاتصال للدعم الفني'))
  }

  const handleSupportWhatsApp = () => {
    Linking.openURL('https://wa.me/9647700000000').catch(() => Alert.alert('خطأ', 'تعذر فتح واتساب الدعم الفني'))
  }

  if (isLoading) return <LoadingState message="جاري جلب بيانات الحساب..." />

  return (
    <Screen style={styles.screen}>
      <View style={styles.headerRow}>
        <Text variant="h1" style={styles.title}>
          الملف الشخصي والحساب (Profile)
        </Text>
        <TouchableOpacity onPress={() => setNotifModalVisible(true)} style={styles.notifBtn}>
          <Text style={styles.notifBtnText}>التنبيهات</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Basic Info Card */}
        <Card style={styles.card}>
          <Text variant="h2" style={styles.nameText}>
            {profile?.name || 'العميل العزيز'}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>رقم الهاتف:</Text>
            <Text style={styles.val} ltr>{profile?.phone || '—'}</Text>
          </View>

          {profile?.email && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>البريد الإلكتروني:</Text>
              <Text style={styles.val} ltr>{profile.email}</Text>
            </View>
          )}

          {profile?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>العنوان المسجل:</Text>
              <Text style={styles.val}>{profile.address}</Text>
            </View>
          )}

          {profile?.id_number && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>رقم الهوية الوطنية:</Text>
              <Text style={styles.val} ltr>{profile.id_number}</Text>
            </View>
          )}
        </Card>

        {/* Customer Support Card */}
        {/* Security & Biometrics Card */}
        {biometricAvailable && (
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionHeader}>
              الأمان والدخول السريع
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.label}>تفعيل الدخول بالبصمة / Face ID</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#CBD5E1', true: themeTokens.colors.primary }}
              />
            </View>
          </Card>
        )}

        {/* Customer Support Card */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionHeader}>
            تواصل معنا والدعم الفني
          </Text>
          <Text style={styles.supportDesc}>
            شركة الأصدقاء لتجارة السيارات في خدمتكم دائماً لأي استفسار أو مساعدة بشأن العقود والأقساط.
          </Text>

          <View style={styles.supportButtons}>
            <Button title="اتصال مباشر بالفني" onPress={handleSupportCall} variant="primary" size="sm" style={styles.btn} />
            <Button title="مراسلة الدعم" onPress={handleSupportWhatsApp} variant="outline" size="sm" style={styles.btn} />
          </View>
        </Card>

        {/* Security & Logout */}
        <Button
          title="تسجيل الخروج من الحساب"
          onPress={logout}
          variant="danger"
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
  },
  title: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
  },
  notifBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  notifBtnText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
  },
  nameText: {
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  val: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  sectionHeader: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
    marginBottom: 4,
  },
  supportDesc: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginBottom: themeTokens.spacing.md,
    lineHeight: 18,
  },
  supportButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  btn: {
    flex: 1,
  },
  logoutBtn: {
    marginTop: themeTokens.spacing.sm,
  },
})
