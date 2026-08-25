import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { formatMoney, EligibleAccount, InstallmentScheduleItem } from '../types'
import { Text } from '../../../components/ui/Text'
import { Button } from '../../../components/ui/Button'
import { themeTokens } from '../../../theme/tokens'
import { ShieldAlert, Check, X } from 'lucide-react-native'

interface PaymentReviewModalProps {
  visible: boolean
  contractNumber: string
  customerName: string
  installment: InstallmentScheduleItem | null
  eligibleAccounts: EligibleAccount[]
  onConfirm: (selectedAccountId: string, paymentMethod: string) => Promise<void>
  onClose: () => void
}

export function PaymentReviewModal({
  visible,
  contractNumber,
  customerName,
  installment,
  eligibleAccounts,
  onConfirm,
  onClose,
}: PaymentReviewModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!visible || !installment) return null

  const amountToPay = installment.remaining_amount || (installment.amount - (installment.paid_amount || 0))

  const handleSubmit = async () => {
    if (!selectedAccountId && eligibleAccounts.length > 0) {
      setSelectedAccountId(eligibleAccounts[0].id)
    }

    const accountId = selectedAccountId || (eligibleAccounts[0]?.id ?? '')
    if (!accountId) {
      setErrorMessage('يرجى اختيار حساب الصندوق أو البنك للاستلام.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await onConfirm(accountId, paymentMethod)
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'تعذر إتمام عملية السداد، يرجى إعادة المحاولة.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              تأكيد استلام الدفعة
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={styles.closeBtn}>
              <X size={20} color={themeTokens.colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            {/* Restrained Amount Hero */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>المبلغ المراد تحصيله</Text>
              <Text variant="h1" style={styles.amountVal} ltr>
                {formatMoney(amountToPay, 'IQD')}
              </Text>
            </View>

            {/* Transaction Data Rows */}
            <View style={styles.dataGroup}>
              <View style={styles.dataRow}>
                <Text style={styles.rowLabel}>اسم العميل:</Text>
                <Text style={styles.rowVal} bold>{customerName}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.rowLabel}>رقم العقد:</Text>
                <Text style={styles.rowVal} ltr>{contractNumber}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.rowLabel}>القسط المستحق:</Text>
                <Text style={styles.rowVal} ltr>قسط #{installment.installment_number}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.fieldTitle}>طريقة الدفع</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('Cash')}
                style={[styles.methodChip, paymentMethod === 'Cash' && styles.methodChipSelected]}
              >
                <Text style={[styles.methodText, paymentMethod === 'Cash' && styles.methodTextSelected]}>
                  نقدي (Cash)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('BankTransfer')}
                style={[styles.methodChip, paymentMethod === 'BankTransfer' && styles.methodChipSelected]}
              >
                <Text style={[styles.methodText, paymentMethod === 'BankTransfer' && styles.methodTextSelected]}>
                  تحويل مصرفي (Bank)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Account Selector */}
            {eligibleAccounts.length > 0 && (
              <>
                <Text style={styles.fieldTitle}>حساب الاستلام المالي</Text>
                <View style={styles.accountList}>
                  {eligibleAccounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id || (!selectedAccountId && acc === eligibleAccounts[0])
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[styles.accTile, isSelected && styles.accTileSelected]}
                      >
                        <Text style={[styles.accText, isSelected && styles.accTextSelected]}>
                          {acc.name} ({acc.code})
                        </Text>
                        {isSelected && <Check size={16} color={themeTokens.colors.primary} />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            {/* Warning Section */}
            <View style={styles.warningBox}>
              <ShieldAlert size={18} color={themeTokens.colors.warning} />
              <Text style={styles.warningText}>
                سيتم تسجيل العملية مالياً وإنشاء قيد اليومية فور التأكيد.
              </Text>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Confirm Button Footer */}
          <View style={styles.footer}>
            <Button
              title={isSubmitting ? 'جاري السداد...' : `تأكيد استلام ${formatMoney(amountToPay, 'IQD')}`}
              onPress={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
              variant="primary"
              style={styles.confirmBtn}
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
    maxHeight: '85%',
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
  amountBox: {
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    padding: themeTokens.spacing.md,
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
  },
  amountLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  amountVal: {
    color: themeTokens.colors.primary,
    fontSize: 24,
    marginTop: 4,
  },
  dataGroup: {
    backgroundColor: themeTokens.colors.surface,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radius.md,
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  rowVal: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  fieldTitle: {
    fontSize: themeTokens.fontSize.xs,
    fontWeight: themeTokens.fontWeight.bold,
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.xs,
  },
  methodRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: themeTokens.spacing.md,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: themeTokens.radius.sm,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    backgroundColor: themeTokens.colors.background,
    alignItems: 'center',
  },
  methodChipSelected: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: '#F1F5F9',
  },
  methodText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  methodTextSelected: {
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  accountList: {
    gap: 6,
    marginBottom: themeTokens.spacing.md,
  },
  accTile: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: themeTokens.radius.sm,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    backgroundColor: themeTokens.colors.background,
  },
  accTileSelected: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: '#F1F5F9',
  },
  accText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  accTextSelected: {
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  warningBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeTokens.colors.warningBg,
    padding: themeTokens.spacing.sm,
    borderRadius: themeTokens.radius.sm,
    marginBottom: themeTokens.spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: themeTokens.colors.warning,
  },
  errorBox: {
    backgroundColor: themeTokens.colors.dangerBg,
    padding: themeTokens.spacing.sm,
    borderRadius: themeTokens.radius.sm,
    marginBottom: themeTokens.spacing.md,
  },
  errorText: {
    fontSize: 11,
    color: themeTokens.colors.danger,
  },
  footer: {
    paddingTop: themeTokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  confirmBtn: {
    width: '100%',
  },
})
