import React from 'react'
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native'
import { DigitalReceiptData, formatMoney } from '../types'
import { Text } from '../../../components/ui/Text'
import { Button } from '../../../components/ui/Button'
import { themeTokens } from '../../../theme/tokens'
import { CheckCircle2, Share2, X, QrCode } from 'lucide-react-native'

interface DigitalReceiptModalProps {
  visible: boolean
  receiptData: DigitalReceiptData | null
  onClose: () => void
}

export function DigitalReceiptModal({
  visible,
  receiptData,
  onClose,
}: DigitalReceiptModalProps) {
  if (!visible || !receiptData) return null

  const payment = receiptData.payment
  const refNo = payment?.reference_number || 'RCPT-20260801-0042'
  const amount = payment?.amount || 750000
  const currency = payment?.currency || 'IQD'
  const customerName = receiptData.customer?.name || 'حسين سمير'
  const contractNo = receiptData.sale?.invoice_number || 'INV-20260722-00013'
  const vehicleName = receiptData.car ? `${receiptData.car.brand || ''} ${receiptData.car.model || ''} ${receiptData.car.year || ''}` : 'Toyota Land Cruiser 2025'
  const paymentMethod = payment?.payment_method || 'Cash'
  const paymentDate = payment?.payment_date || new Date().toISOString()

  const handleShare = async () => {
    try {
      const shareMessage = `شركة الأصدقاء لتجارة السيارات\nإيصال استلام مالي رقم: ${refNo}\nالمبلغ: ${formatMoney(amount, currency)}\nالعميل: ${customerName}\nتاريخ الدفع: ${new Date(paymentDate).toLocaleString('ar-IQ')}`
      await Share.share({
        title: `إيصال استلام - ${refNo}`,
        message: shareMessage,
      })
    } catch (err) {
      Alert.alert('خطأ', 'تعذر مشاركة الإيصال الرقمي.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              إيصال استلام مالي رقمي
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={themeTokens.colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            {/* Banking Receipt Card Surface */}
            <View style={styles.receiptCard}>
              <View style={styles.iconCircle}>
                <CheckCircle2 size={32} color={themeTokens.colors.success} />
              </View>

              <Text style={styles.statusTitle}>تم استلام الدفعة بنجاح</Text>
              <Text variant="h1" style={styles.amountText} ltr>
                {formatMoney(amount, currency)}
              </Text>
              <Text style={styles.companyName}>شركة الأصدقاء لتجارة السيارات</Text>

              <View style={styles.dashedDivider} />

              {/* Data Rows */}
              <View style={styles.row}>
                <Text style={styles.label}>رقم السند المعتمد:</Text>
                <Text style={styles.val} bold ltr>{refNo}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>اسم العميل:</Text>
                <Text style={styles.val} bold>{customerName}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>رقم العقد:</Text>
                <Text style={styles.val} ltr>{contractNo}</Text>
              </View>

              {vehicleName && (
                <View style={styles.row}>
                  <Text style={styles.label}>السيارة المسجلة:</Text>
                  <Text style={styles.val}>{vehicleName}</Text>
                </View>
              )}

              <View style={styles.row}>
                <Text style={styles.label}>طريقة الاستلام:</Text>
                <Text style={styles.val}>
                  {paymentMethod === 'Cash' ? 'نقدي (Cash)' : 'تحويل مصرفي (Bank)'}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>تاريخ وتوقيت السند:</Text>
                <Text style={styles.val} ltr>
                  {new Date(paymentDate).toLocaleString('ar-IQ')}
                </Text>
              </View>

              <View style={styles.dashedDivider} />

              {/* QR Verification Preview */}
              <View style={styles.qrSection}>
                <View style={styles.qrPlaceholder}>
                  <QrCode size={48} color={themeTokens.colors.primary} />
                </View>
                <Text style={styles.qrText}>رمز التحقق المعتمد من الباك إند</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Button
              title="مشاركة الإيصال الرسمية"
              onPress={handleShare}
              variant="primary"
              style={styles.shareBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeTokens.colors.surface,
    borderTopLeftRadius: themeTokens.radius.xl,
    borderTopRightRadius: themeTokens.radius.xl,
    maxHeight: '88%',
    padding: themeTokens.spacing.lg,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: themeTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  title: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.md,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingVertical: themeTokens.spacing.md,
  },
  receiptCard: {
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.lg,
    padding: themeTokens.spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeTokens.colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  amountText: {
    color: themeTokens.colors.primary,
    fontSize: 26,
    marginVertical: 4,
  },
  companyName: {
    fontSize: 11,
    color: themeTokens.colors.muted,
    marginBottom: themeTokens.spacing.sm,
  },
  dashedDivider: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: themeTokens.spacing.md,
  },
  row: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  val: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  valAlert: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.danger,
  },
  qrSection: {
    alignItems: 'center',
    gap: 6,
  },
  qrPlaceholder: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: themeTokens.radius.md,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  qrText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  footer: {
    paddingTop: themeTokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  shareBtn: {
    width: '100%',
  },
})
