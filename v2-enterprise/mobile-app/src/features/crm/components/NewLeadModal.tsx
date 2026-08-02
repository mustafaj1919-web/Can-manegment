import React, { useState } from 'react'
import { View, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native'
import { createDeal } from '../../../api/crmApi'
import { CustomerSearchItem } from '../types'
import { CustomerSelectModal } from './CustomerSelectModal'
import { Text } from '../../../components/ui/Text'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { themeTokens } from '../../../theme/tokens'

interface NewLeadModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewLeadModal({ visible, onClose, onSuccess }: NewLeadModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchItem | null>(null)
  const [customerModalVisible, setCustomerModalVisible] = useState(false)
  const [expectedPrice, setExpectedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('تنبيه', 'يرجى اختيار العميل أولاً')
      return
    }

    setSubmitting(true)
    try {
      const priceNum = expectedPrice.trim() ? parseFloat(expectedPrice.replace(/,/g, '')) : undefined
      await createDeal({
        customerId: selectedCustomer.id,
        stage: 'lead',
        expectedPrice: priceNum,
        currency: 'IQD',
        notes: notes.trim() || undefined,
      })
      setSubmitting(false)
      setSelectedCustomer(null)
      setExpectedPrice('')
      setNotes('')
      onSuccess()
    } catch (err: any) {
      setSubmitting(false)
      Alert.alert('خطأ', err?.message || 'تعذر إنشاء الفرصة التجارية')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              إضافة فرصة تجارية جديدة (+ Lead)
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>إغلاق ✕</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Customer Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              1. بيانات العميل
            </Text>

            {selectedCustomer ? (
              <View style={styles.selectedRow}>
                <View>
                  <Text variant="h3" style={styles.custName}>{selectedCustomer.name}</Text>
                  <Text style={styles.custPhone} ltr>{selectedCustomer.phone}</Text>
                </View>
                <Button
                  title="تغيير العميل"
                  onPress={() => setCustomerModalVisible(true)}
                  variant="outline"
                  size="sm"
                />
              </View>
            ) : (
              <Button
                title="اختيار / تسجيل العميل 👤"
                onPress={() => setCustomerModalVisible(true)}
                variant="outline"
                style={styles.selectCustBtn}
              />
            )}
          </Card>

          {/* Deal Details Section */}
          <Card style={styles.card}>
            <Text variant="h3" style={styles.sectionTitle}>
              2. تفاصيل الفرصة التجارية
            </Text>

            <Input
              label="السعر المتوقع (بالدينار IQD)"
              value={expectedPrice}
              onChangeText={setExpectedPrice}
              placeholder="مثال: 32000000"
              keyboardType="numeric"
              ltr
            />

            <Input
              label="ملاحظات أولية / متطلبات السيارة"
              value={notes}
              onChangeText={setNotes}
              placeholder="مثال: يفضل تاهو 2024 باللون الأسود..."
            />
          </Card>

          <View style={styles.actions}>
            <Button title="إلغاء" onPress={onClose} variant="ghost" style={styles.btn} />
            <Button
              title="إنشاء الفرصة التجارية"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.btn}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Customer Select Inner Modal */}
      <CustomerSelectModal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        onSelectCustomer={(cust) => {
          setSelectedCustomer(cust)
          setCustomerModalVisible(false)
        }}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeTokens.colors.surface,
    borderTopLeftRadius: themeTokens.radius.lg,
    borderTopRightRadius: themeTokens.radius.lg,
    padding: themeTokens.spacing.lg,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
    paddingBottom: themeTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  title: {
    color: themeTokens.colors.primary,
  },
  closeText: {
    color: themeTokens.colors.muted,
    fontSize: themeTokens.fontSize.xs,
  },
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.sm,
  },
  sectionTitle: {
    marginBottom: themeTokens.spacing.xs,
    color: themeTokens.colors.primary,
  },
  selectCustBtn: {
    marginTop: 4,
  },
  selectedRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  custName: {
    color: themeTokens.colors.text,
  },
  custPhone: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: themeTokens.spacing.md,
  },
  btn: {
    flex: 1,
  },
})
