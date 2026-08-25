import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native'
import { Camera, CameraView } from 'expo-camera'
import { useRouter } from 'expo-router'
import { validateVinOrChassis } from '../../src/features/inventory/utils/vinValidation'
import { Screen } from '../../src/components/ui/Screen'
import { Text } from '../../src/components/ui/Text'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { Card } from '../../src/components/ui/Card'
import { themeTokens } from '../../src/theme/tokens'

export default function ScannerScreen() {
  const router = useRouter()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [isScanningLocked, setIsScanningLocked] = useState(false)
  const [manualVinModalVisible, setManualVinModalVisible] = useState(false)
  const [manualVinInput, setManualVinInput] = useState('')

  useEffect(() => {
    ;(async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    })()
  }, [])

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isScanningLocked || !data) return

    // Lock scanner immediately to prevent duplicate triggering
    setIsScanningLocked(true)

    const rawScanned = data.trim()

    // QR Code Safety Verification: Reject arbitrary javascript or non-http external redirects
    if (
      rawScanned.toLowerCase().startsWith('javascript:') ||
      rawScanned.toLowerCase().startsWith('file://')
    ) {
      Alert.alert('تنبيه أمان', 'رمز QR الممسوح يحوي صيغة غير مسموح بها.', [
        { text: 'إعادة المسح', onPress: () => setIsScanningLocked(false) },
      ])
      return
    }

    const validation = validateVinOrChassis(rawScanned)

    if (validation.type === 'invalid') {
      Alert.alert(
        'مسح غير صالح',
        validation.message || 'لم يتم التعرف على رقم شاصي صالح في الكاميرا.',
        [{ text: 'مسح مرة أخرى', onPress: () => setIsScanningLocked(false) }]
      )
      return
    }

    // Valid VIN / Chassis scanned -> Open universal search or vehicle detail
    router.push(`/(owner)/inventory?search=${encodeURIComponent(validation.value)}`)
  }

  const handleManualSearch = () => {
    if (!manualVinInput.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الشاصي')
      return
    }

    const validation = validateVinOrChassis(manualVinInput)
    if (validation.type === 'invalid') {
      Alert.alert('خطأ', validation.message || 'رقم الشاصي غير صالح')
      return
    }

    setManualVinModalVisible(false)
    router.push(`/(owner)/inventory?search=${encodeURIComponent(validation.value)}`)
  }

  if (hasPermission === null) {
    return (
      <Screen style={styles.centerScreen}>
        <Text>جاري طلب إذن استخدام الكاميرا...</Text>
      </Screen>
    )
  }

  if (hasPermission === false) {
    return (
      <Screen style={styles.centerScreen}>
        <Card style={styles.permissionCard}>
          <Text variant="h2" style={styles.permissionTitle}>
            تم رفض إذن الكاميرا
          </Text>
          <Text style={styles.permissionDesc}>
            يتطلب ماسح رقم الشاصي الوصول لكاميرا الجهاز. يرجى تفعيل إذن الكاميرا من إعدادات النظام.
          </Text>
          <Button title="← عودة" onPress={() => router.back()} variant="outline" />
        </Card>
      </Screen>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        enableTorch={torchEnabled}
        onBarcodeScanned={isScanningLocked ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'datamatrix', 'pdf417'],
        }}
      >
        {/* Overlay scanning viewfinder */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>إغلاق ✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTorchEnabled(!torchEnabled)}
              style={styles.iconBtn}
            >
              <Text style={styles.iconBtnText}>
                {torchEnabled ? 'إيقاف الفلاش ⚡' : 'تشغيل الفلاش 💡'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Viewfinder Target Frame */}
          <View style={styles.frameContainer}>
            <View style={styles.targetFrame} />
            <Text style={styles.instructionText}>ضع رقم الشاصي أو باركود السيارة داخل الإطار</Text>
          </View>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            {isScanningLocked && (
              <Button
                title="إعادة المسح"
                onPress={() => setIsScanningLocked(false)}
                variant="outline"
                style={styles.rescanBtn}
              />
            )}

            <Button
              title="إدخال رقم الشاصي يدوياً"
              onPress={() => setManualVinModalVisible(true)}
              variant="primary"
              style={styles.manualBtn}
            />
          </View>
        </View>
      </CameraView>

      {/* Manual VIN Input Modal */}
      <Modal visible={manualVinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text variant="h2" style={styles.modalTitle}>
              إدخال رقم الشاصي يدوياً
            </Text>

            <Input
              label="رقم الشاصي (VIN)"
              value={manualVinInput}
              onChangeText={setManualVinInput}
              placeholder="مثال: KMHD84LF0FU123456"
              ltr
            />

            <View style={styles.modalActions}>
              <Button
                title="إلغاء"
                onPress={() => setManualVinModalVisible(false)}
                variant="ghost"
                style={styles.modalBtn}
              />
              <Button
                title="بحث"
                onPress={handleManualSearch}
                variant="primary"
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerScreen: {
    padding: themeTokens.spacing.xl,
    justifyContent: 'center',
  },
  permissionCard: {
    padding: themeTokens.spacing.xl,
    alignItems: 'center',
  },
  permissionTitle: {
    color: themeTokens.colors.danger,
    marginBottom: themeTokens.spacing.sm,
  },
  permissionDesc: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    textAlign: 'center',
    marginBottom: themeTokens.spacing.lg,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: themeTokens.spacing.lg,
  },
  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  iconBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: themeTokens.radius.full,
  },
  iconBtnText: {
    color: '#FFFFFF',
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
  },
  frameContainer: {
    alignItems: 'center',
  },
  targetFrame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: themeTokens.colors.success,
    borderRadius: themeTokens.radius.md,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: themeTokens.fontSize.xs,
    marginTop: themeTokens.spacing.md,
    textAlign: 'center',
  },
  bottomBar: {
    marginBottom: 20,
    gap: 10,
  },
  rescanBtn: {
    borderColor: '#FFFFFF',
  },
  manualBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeTokens.spacing.lg,
  },
  modalCard: {
    width: '100%',
    padding: themeTokens.spacing.xl,
  },
  modalTitle: {
    marginBottom: themeTokens.spacing.md,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: themeTokens.spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
})
