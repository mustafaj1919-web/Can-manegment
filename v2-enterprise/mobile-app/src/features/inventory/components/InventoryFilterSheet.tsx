import React from 'react'
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import { Text } from '../../../components/ui/Text'
import { Button } from '../../../components/ui/Button'
import { themeTokens } from '../../../theme/tokens'

interface InventoryFilterSheetProps {
  visible: boolean
  currentStatus?: string
  onClose: () => void
  onApply: (status?: string) => void
  onReset: () => void
}

const STATUS_OPTIONS = [
  { value: 'All', label: 'جميع الحالات' },
  { value: 'Available', label: 'متاح للبيع' },
  { value: 'Reserved', label: 'محجوز' },
  { value: 'Sold', label: 'مباع' },
  { value: 'UnderMaintenance', label: 'تحت الصيانة' },
]

export function InventoryFilterSheet({
  visible,
  currentStatus = 'All',
  onClose,
  onApply,
  onReset,
}: InventoryFilterSheetProps) {
  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus)

  React.useEffect(() => {
    setSelectedStatus(currentStatus)
  }, [currentStatus, visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              تصفية السيارات بالمخزون
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>إغلاق</Text>
            </TouchableOpacity>
          </View>

          <Text variant="h3" style={styles.sectionTitle}>
            حالة السيارة
          </Text>

          <View style={styles.optionsRow}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSelectedStatus(opt.value)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.actionRow}>
            <Button
              title="إعادة ضبط"
              onPress={() => {
                setSelectedStatus('All')
                onReset()
              }}
              variant="outline"
              style={styles.actionBtn}
            />
            <Button
              title="تطبيق الفلتر"
              onPress={() => onApply(selectedStatus)}
              style={styles.actionBtn}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
    marginBottom: themeTokens.spacing.lg,
    paddingBottom: themeTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  title: {
    color: themeTokens.colors.primary,
  },
  closeText: {
    color: themeTokens.colors.muted,
    fontSize: themeTokens.fontSize.sm,
  },
  sectionTitle: {
    marginBottom: themeTokens.spacing.md,
  },
  optionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: themeTokens.spacing.xl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: themeTokens.radius.full,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  chipSelected: {
    backgroundColor: themeTokens.colors.primary,
    borderColor: themeTokens.colors.primary,
  },
  chipText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: themeTokens.fontWeight.bold,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
})
