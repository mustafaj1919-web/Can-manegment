import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { searchCustomers, createCustomer } from '../../../api/crmApi'
import { CustomerSearchItem } from '../types'
import { Text } from '../../../components/ui/Text'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { themeTokens } from '../../../theme/tokens'

interface CustomerSelectModalProps {
  visible: boolean
  onClose: () => void
  onSelectCustomer: (customer: CustomerSearchItem) => void
}

export function CustomerSelectModal({
  visible,
  onClose,
  onSelectCustomer,
}: CustomerSelectModalProps) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerSearchItem[]>([])
  const [loading, setLoading] = useState(false)

  // New Customer Inline Form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!visible) return
    let isMounted = true
    setLoading(true)

    const handler = setTimeout(() => {
      searchCustomers(search)
        .then((res) => {
          if (isMounted) {
            setCustomers(res)
            setLoading(false)
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false)
        })
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(handler)
    }
  }, [search, visible])

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل ورقم الهاتف')
      return
    }

    setCreating(true)
    try {
      const res = await createCustomer({ name: newName.trim(), phone: newPhone.trim() })
      setCreating(false)
      setShowNewForm(false)
      onSelectCustomer({
        id: res.customerId,
        name: newName.trim(),
        phone: newPhone.trim(),
      })
    } catch (err: any) {
      setCreating(false)
      Alert.alert('خطأ', err?.message || 'تعذر تسجيل العميل الجديد')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h2" style={styles.title}>
              اختيار / تسجيل العميل
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>إغلاق ✕</Text>
            </TouchableOpacity>
          </View>

          {showNewForm ? (
            <Card style={styles.newCard}>
              <Text variant="h3" style={styles.newTitle}>
                تسجيل عميل جديد سريعا
              </Text>
              <Input label="اسم العميل الكامل" value={newName} onChangeText={setNewName} placeholder="مثال: أحمد علي" />
              <Input label="رقم الهاتف" value={newPhone} onChangeText={setNewPhone} placeholder="07700000000" keyboardType="phone-pad" ltr />
              <View style={styles.newActions}>
                <Button title="إلغاء" onPress={() => setShowNewForm(false)} variant="outline" style={styles.btn} />
                <Button title="حفظ واختيار" onPress={handleCreateCustomer} loading={creating} style={styles.btn} />
              </View>
            </Card>
          ) : (
            <>
              <View style={styles.searchRow}>
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder="ابحث باسم العميل أو رقم الهاتف..."
                  style={styles.searchInput}
                />
                <Button
                  title="+ عميل جديد"
                  onPress={() => setShowNewForm(true)}
                  variant="outline"
                  size="sm"
                  style={styles.addBtn}
                />
              </View>

              {loading ? (
                <ActivityIndicator size="small" color={themeTokens.colors.primary} style={styles.loader} />
              ) : (
                <FlatList
                  data={customers}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => onSelectCustomer(item)}
                      style={styles.itemRow}
                    >
                      <View>
                        <Text variant="h3" style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemPhone} ltr>{item.phone}</Text>
                      </View>
                      <Text style={styles.selectText}>اختيار ←</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>لم يتم العثور على نتائج مطابقة.</Text>
                  }
                />
              )}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
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
    maxHeight: '80%',
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
  searchRow: {
    marginBottom: themeTokens.spacing.sm,
    gap: 8,
  },
  searchInput: {
    marginBottom: 6,
  },
  addBtn: {
    alignSelf: 'flex-start',
  },
  loader: {
    marginVertical: themeTokens.spacing.xl,
  },
  list: {
    maxHeight: 280,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  itemTitle: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.text,
  },
  itemPhone: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  selectText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
  emptyText: {
    textAlign: 'center',
    color: themeTokens.colors.muted,
    marginVertical: themeTokens.spacing.lg,
    fontSize: themeTokens.fontSize.xs,
  },
  newCard: {
    padding: themeTokens.spacing.md,
  },
  newTitle: {
    marginBottom: themeTokens.spacing.md,
  },
  newActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: themeTokens.spacing.md,
  },
  btn: {
    flex: 1,
  },
})
