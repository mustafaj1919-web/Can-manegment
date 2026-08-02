import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPipeline, moveDealStage, createInteraction, getInteractions } from '../../../api/crmApi'
import { getStageConfig, DealItem } from '../types'
import { InteractionCard } from '../components/InteractionCard'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

interface LeadDetailScreenProps {
  dealId: string
  onBack: () => void
}

const STAGES = [
  { key: 'lead', label: 'مهتم جديد' },
  { key: 'contacted', label: 'تم التواصل' },
  { key: 'test_drive', label: 'تجربة قيادة' },
  { key: 'negotiating', label: 'قيد التفاوض' },
  { key: 'reserved', label: 'محجوز' },
  { key: 'won', label: 'مكتمل (فوز)' },
  { key: 'lost', label: 'خسر' },
]

export function LeadDetailScreen({ dealId, onBack }: LeadDetailScreenProps) {
  const queryClient = useQueryClient()

  const [stageModalVisible, setStageModalVisible] = useState(false)
  const [lostReason, setLostReason] = useState('')

  // New Interaction / Note modal state
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [interactionType, setInteractionType] = useState('call')
  const [noteText, setNoteText] = useState('')
  const [outcome, setOutcome] = useState('interested')

  const { data: pipeline, isLoading, isError } = useQuery({
    queryKey: ['crmPipeline'],
    queryFn: () => getPipeline(),
  })

  // Find target deal in pipeline data
  const deal = React.useMemo(() => {
    if (!pipeline?.by_stage) return null
    for (const list of Object.values(pipeline.by_stage)) {
      const match = list.find((d: DealItem) => d.id === dealId)
      if (match) return match
    }
    return null
  }, [pipeline, dealId])

  // Fetch interaction history for customer
  const { data: interactionsData } = useQuery({
    queryKey: ['crmInteractions', deal?.customer_id],
    queryFn: () => getInteractions({ customer_id: deal?.customer_id }),
    enabled: !!deal?.customer_id,
  })

  const stageMutation = useMutation({
    mutationFn: (nextStage: string) =>
      moveDealStage(dealId, {
        stage: nextStage,
        lostReason: nextStage === 'lost' ? lostReason : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmPipeline'] })
      setStageModalVisible(false)
      Alert.alert('نجاح', 'تم تحديث مرحلة الفرصة بنجاح')
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.message || 'تعذر نقل مرحلة الفرصة')
    },
  })

  const interactionMutation = useMutation({
    mutationFn: () =>
      createInteraction({
        customerId: deal!.customer_id,
        interactionType,
        notes: noteText.trim(),
        outcome,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmInteractions', deal?.customer_id] })
      setNoteModalVisible(false)
      setNoteText('')
      Alert.alert('نجاح', 'تم تسجيل التفاعل/الملاحظة بنجاح')
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.message || 'تعذر إضافة الملاحظة')
    },
  })

  if (isLoading) return <LoadingState message="جاري تفاصيل الفرصة..." />
  if (isError || !deal) {
    return (
      <Screen style={styles.screen}>
        <Button title="← عودة للفرص" onPress={onBack} variant="outline" style={styles.backBtn} />
        <EmptyState title="الفرصة غير موجودة" description="لم يتم العثور على سجلات لهذه الفرصة التجارية." />
      </Screen>
    )
  }

  const stageConfig = getStageConfig(deal.stage)

  const handlePhoneCall = () => {
    if (!deal.customer_phone) return
    const cleanPhone = deal.customer_phone.replace(/\s+/g, '')
    Linking.openURL(`tel:${cleanPhone}`).catch(() => Alert.alert('خطأ', 'تعذر إجراء الاتصال'))
  }

  const handleWhatsApp = () => {
    if (!deal.customer_phone) return
    let cleanPhone = deal.customer_phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('07')) cleanPhone = `964${cleanPhone.slice(1)}`
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => Alert.alert('خطأ', 'تعذر فتح واتساب'))
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← عودة للفرص</Text>
        </TouchableOpacity>
        <StatusBadge status={stageConfig.badgeStatus} label={stageConfig.label} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Customer Info Card */}
        <Card style={styles.card}>
          <Text variant="h2" style={styles.custName}>
            {deal.customer_name || 'عميل محتمل'}
          </Text>
          {deal.customer_phone && (
            <Text style={styles.custPhone} ltr>
              الهاتف: {deal.customer_phone}
            </Text>
          )}

          <View style={styles.contactActions}>
            <Button title="اتصال تلفوني 📞" onPress={handlePhoneCall} variant="primary" size="sm" style={styles.btn} />
            <Button title="مراسلة واتساب 💬" onPress={handleWhatsApp} variant="outline" size="sm" style={styles.btn} />
          </View>
        </Card>

        {/* Lead Stage & Quick Action */}
        <Card style={styles.card}>
          <View style={styles.stageHeader}>
            <View>
              <Text variant="h3" style={styles.sectionTitle}>
                مرحلة الفرصة التجارية
              </Text>
              <Text style={styles.stageDesc}>
                الحالية: {stageConfig.label} (منذ {deal.days_in_stage} يوم)
              </Text>
            </View>
            <Button
              title="نقل المرحلة"
              onPress={() => setStageModalVisible(true)}
              variant="outline"
              size="sm"
            />
          </View>

          {deal.expected_price && (
            <View style={styles.priceRow}>
              <Text style={styles.label}>السعر المتوقع:</Text>
              <Text variant="h2" style={styles.priceVal} ltr>
                {deal.expected_price.toLocaleString()} {deal.currency || 'IQD'}
              </Text>
            </View>
          )}
        </Card>

        {/* Assigned Vehicle */}
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            السيارة المهتم بها
          </Text>
          <Text variant="body" bold style={styles.carName}>
            {deal.car_name || 'لم يتم تعيين سيارة محددة بعد'}
          </Text>
        </Card>

        {/* Notes & Timeline History */}
        <View style={styles.timelineHeader}>
          <Text variant="h2" style={styles.timelineTitle}>
            سجل الملاحظات والتفاعلات
          </Text>
          <Button
            title="+ إضافة ملاحظة"
            onPress={() => setNoteModalVisible(true)}
            variant="primary"
            size="sm"
          />
        </View>

        {interactionsData?.items && interactionsData.items.length > 0 ? (
          interactionsData.items.map((item) => <InteractionCard key={item.id} interaction={item} />)
        ) : (
          <EmptyState title="لا توجد ملاحظات سابقة" description="اضغط على زر إضافة ملاحظة لتسجيل التفاعل الأول." />
        )}
      </ScrollView>

      {/* Stage Change Modal */}
      <Modal visible={stageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text variant="h2" style={styles.modalTitle}>
              نقل مرحلة الصفقة
            </Text>
            <Text style={styles.modalSub}>اختر المرحلة الجديدة لنقل الفرصة إليها:</Text>

            <View style={styles.stageGrid}>
              {STAGES.map((s) => (
                <Button
                  key={s.key}
                  title={s.label}
                  onPress={() => stageMutation.mutate(s.key)}
                  loading={stageMutation.isPending}
                  variant={deal.stage === s.key ? 'primary' : 'outline'}
                  size="sm"
                  style={styles.stageBtn}
                />
              ))}
            </View>

            <Button title="إلغاء" onPress={() => setStageModalVisible(false)} variant="ghost" style={styles.cancelBtn} />
          </Card>
        </View>
      </Modal>

      {/* Add Note / Interaction Modal */}
      <Modal visible={noteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text variant="h2" style={styles.modalTitle}>
              إضافة تفاعل / ملاحظة متابعة
            </Text>

            <Input
              label="تفاصيل الملاحظة أو نتيجة الاتصال"
              value={noteText}
              onChangeText={setNoteText}
              placeholder="اكتب الملاحظة..."
            />

            <View style={styles.modalActions}>
              <Button title="إلغاء" onPress={() => setNoteModalVisible(false)} variant="ghost" style={styles.btn} />
              <Button
                title="حفظ الملاحظة"
                onPress={() => interactionMutation.mutate()}
                loading={interactionMutation.isPending}
                style={styles.btn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.md,
  },
  navHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.sm,
  },
  backButton: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
  backBtn: {
    marginBottom: themeTokens.spacing.md,
  },
  content: {
    paddingBottom: themeTokens.spacing.xxl,
  },
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.md,
  },
  custName: {
    color: themeTokens.colors.primary,
  },
  custPhone: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: themeTokens.spacing.md,
  },
  btn: {
    flex: 1,
  },
  stageHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.primary,
  },
  stageDesc: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  priceRow: {
    marginTop: themeTokens.spacing.sm,
    paddingTop: themeTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  priceVal: {
    color: themeTokens.colors.primary,
  },
  carName: {
    color: themeTokens.colors.text,
    marginTop: 4,
  },
  timelineHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.sm,
    marginTop: themeTokens.spacing.xs,
  },
  timelineTitle: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeTokens.spacing.lg,
  },
  modalCard: {
    width: '100%',
    padding: themeTokens.spacing.xl,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalSub: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginBottom: themeTokens.spacing.md,
  },
  stageGrid: {
    gap: 6,
    marginBottom: themeTokens.spacing.md,
  },
  stageBtn: {
    width: '100%',
  },
  cancelBtn: {
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: themeTokens.spacing.md,
  },
})
