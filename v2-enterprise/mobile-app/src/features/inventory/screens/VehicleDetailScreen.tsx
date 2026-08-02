import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVehicleDetails, changeVehicleStatus, getVehicleImageUrl } from '../../../api/inventoryApi'
import { getStatusBadgeConfig } from '../types'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useAuthStore } from '../../../store/authStore'
import { themeTokens } from '../../../theme/tokens'

interface VehicleDetailScreenProps {
  vehicleId: string
  onBack: () => void
}

export function VehicleDetailScreen({ vehicleId, onBack }: VehicleDetailScreenProps) {
  const queryClient = useQueryClient()
  const { capabilities } = useAuthStore()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [statusModalVisible, setStatusModalVisible] = useState(false)

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ['vehicleDetail', vehicleId],
    queryFn: () => getVehicleDetails(vehicleId),
    enabled: !!vehicleId,
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => changeVehicleStatus(vehicleId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleDetail', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setStatusModalVisible(false)
      Alert.alert('نجاح', 'تم تحديث حالة السيارة بنجاح')
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.message || 'تعذر تحديث حالة السيارة')
    },
  })

  if (isLoading) return <LoadingState message="جاري تفاصيل السيارة..." />
  if (isError || !vehicle) {
    return (
      <Screen style={styles.screen}>
        <Button title="← عودة للمخزون" onPress={onBack} variant="outline" style={styles.backBtn} />
        <EmptyState title="السيارة غير موجودة" description="لم يتم العثور على سجلات لهذه السيارة." />
      </Screen>
    )
  }

  const badgeConfig = getStatusBadgeConfig(vehicle.status)
  const showFinancials = capabilities.canViewAccounting || capabilities.canViewExecutiveDashboard
  const canChangeStatus = capabilities.canManageSales || capabilities.canViewExecutiveDashboard

  const images = vehicle.images || []
  const currentImageFilename = images[selectedImageIndex]?.fileName
  const currentImageUrl = getVehicleImageUrl(currentImageFilename)

  const margin = vehicle.targetSellingPrice - vehicle.totalCost

  return (
    <Screen style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← عودة للمخزون</Text>
        </TouchableOpacity>
        <StatusBadge status={badgeConfig.badgeStatus} label={badgeConfig.label} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Image Gallery Hero */}
        <View style={styles.heroContainer}>
          {currentImageUrl ? (
            <Image source={{ uri: currentImageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>لا توجد صورة متوفرة</Text>
            </View>
          )}

          {images.length > 1 && (
            <ScrollView horizontal style={styles.thumbRow} showsHorizontalScrollIndicator={false}>
              {images.map((img, idx) => {
                const url = getVehicleImageUrl(img.fileName)
                const isSelected = idx === selectedImageIndex
                return (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[styles.thumbBox, isSelected && styles.thumbBoxSelected]}
                  >
                    {url && <Image source={{ uri: url }} style={styles.thumbImage} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}
        </View>

        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text variant="h1" style={styles.title}>
            {vehicle.brand ? `${vehicle.brand} ` : ''}
            {vehicle.model} {vehicle.year}
          </Text>
          {vehicle.trim && <Text style={styles.trimText}>{vehicle.trim}</Text>}
        </View>

        {/* Action Button for Status */}
        {canChangeStatus && (
          <Button
            title="تحديث حالة السيارة"
            onPress={() => setStatusModalVisible(true)}
            variant="outline"
            size="sm"
            style={styles.statusActionBtn}
          />
        )}

        {/* Technical Specs Card */}
        <Card style={styles.sectionCard}>
          <Text variant="h2" style={styles.sectionTitle}>
            المواصفات والتعريف
          </Text>

          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Text style={styles.label}>رقم الشاصي (VIN):</Text>
              <Text style={styles.val} ltr>
                {vehicle.chassisNumber}
              </Text>
            </View>

            {vehicle.engineNumber && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>رقم المحرك:</Text>
                <Text style={styles.val} ltr>
                  {vehicle.engineNumber}
                </Text>
              </View>
            )}

            {vehicle.color && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>اللون:</Text>
                <Text style={styles.val}>{vehicle.color}</Text>
              </View>
            )}

            {vehicle.plateNumber && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>رقم اللوحة:</Text>
                <Text style={styles.val} ltr>
                  {vehicle.plateNumber} ({vehicle.plateStatus || ''})
                </Text>
              </View>
            )}

            {vehicle.transmission && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>ناقل الحركة:</Text>
                <Text style={styles.val}>{vehicle.transmission}</Text>
              </View>
            )}

            {vehicle.fuelType && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>نوع الوقود:</Text>
                <Text style={styles.val}>{vehicle.fuelType}</Text>
              </View>
            )}

            {vehicle.mileage !== null && vehicle.mileage !== undefined && (
              <View style={styles.gridRow}>
                <Text style={styles.label}>المسافة المقطوعة:</Text>
                <Text style={styles.val} ltr>
                  {vehicle.mileage.toLocaleString()} كم
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Commercial Pricing Card */}
        <Card style={styles.sectionCard}>
          <Text variant="h2" style={styles.sectionTitle}>
            السعر والتفاصيل التجارية
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>سعر البيع المستهدف:</Text>
            <Text variant="h1" style={styles.mainPrice} ltr>
              {vehicle.targetSellingPrice.toLocaleString()} {vehicle.currency}
            </Text>
          </View>

          {/* Protected Financial Cost Data */}
          {showFinancials && (
            <View style={styles.financialSection}>
              <Text variant="h3" style={styles.financialTitle}>
                التكاليف والربحية (بيانات مالية محمية)
              </Text>

              <View style={styles.gridRow}>
                <Text style={styles.label}>كلفة الشراء الأولية:</Text>
                <Text style={styles.val} ltr>
                  {vehicle.purchaseCost.toLocaleString()} {vehicle.currency}
                </Text>
              </View>

              <View style={styles.gridRow}>
                <Text style={styles.label}>الجمارك والتكاليف الإضافية:</Text>
                <Text style={styles.val} ltr>
                  {(vehicle.customDuties + vehicle.maintenanceCost).toLocaleString()} {vehicle.currency}
                </Text>
              </View>

              <View style={styles.gridRow}>
                <Text style={styles.label}>إجمالي التكلفة الدفترية:</Text>
                <Text style={styles.val} bold ltr>
                  {vehicle.totalCost.toLocaleString()} {vehicle.currency}
                </Text>
              </View>

              <View style={[styles.gridRow, styles.marginHighlight]}>
                <Text style={styles.label}>هامش الربح المتوقع:</Text>
                <Text
                  style={[styles.val, margin < 0 ? styles.negativeMargin : styles.positiveMargin]}
                  bold
                  ltr
                >
                  {margin.toLocaleString()} {vehicle.currency}
                </Text>
              </View>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Change Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text variant="h2" style={styles.modalTitle}>
              تغيير حالة السيارة
            </Text>
            <Text style={styles.modalSubtitle}>اختر الحالة الجديدة للسيارة في المعرض:</Text>

            <View style={styles.statusOptions}>
              {['Available', 'Reserved', 'UnderMaintenance'].map((st) => (
                <Button
                  key={st}
                  title={getStatusBadgeConfig(st).label}
                  onPress={() => statusMutation.mutate(st)}
                  loading={statusMutation.isPending}
                  variant={vehicle.status === st ? 'primary' : 'outline'}
                  style={styles.statusOptBtn}
                />
              ))}
            </View>

            <Button
              title="إلغاء"
              onPress={() => setStatusModalVisible(false)}
              variant="ghost"
              style={styles.cancelBtn}
            />
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
  heroContainer: {
    height: 220,
    borderRadius: themeTokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: themeTokens.colors.border,
    marginBottom: themeTokens.spacing.md,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: themeTokens.colors.muted,
  },
  thumbRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row-reverse',
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: themeTokens.radius.sm,
    overflow: 'hidden',
    marginLeft: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbBoxSelected: {
    borderColor: themeTokens.colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  titleSection: {
    marginBottom: themeTokens.spacing.md,
  },
  title: {
    color: themeTokens.colors.primary,
  },
  trimText: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.muted,
  },
  statusActionBtn: {
    marginBottom: themeTokens.spacing.md,
  },
  sectionCard: {
    marginBottom: themeTokens.spacing.md,
  },
  sectionTitle: {
    color: themeTokens.colors.primary,
    marginBottom: themeTokens.spacing.md,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  grid: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  val: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.text,
  },
  priceContainer: {
    alignItems: 'center',
    paddingVertical: themeTokens.spacing.sm,
  },
  priceLabel: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginBottom: 4,
  },
  mainPrice: {
    color: themeTokens.colors.primary,
  },
  financialSection: {
    marginTop: themeTokens.spacing.md,
    paddingTop: themeTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
    gap: 8,
  },
  financialTitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginBottom: 6,
  },
  marginHighlight: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  positiveMargin: {
    color: themeTokens.colors.success,
  },
  negativeMargin: {
    color: themeTokens.colors.danger,
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
  modalSubtitle: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
    marginBottom: themeTokens.spacing.lg,
  },
  statusOptions: {
    gap: 8,
    marginBottom: themeTokens.spacing.md,
  },
  statusOptBtn: {
    width: '100%',
  },
  cancelBtn: {
    marginTop: 4,
  },
})
