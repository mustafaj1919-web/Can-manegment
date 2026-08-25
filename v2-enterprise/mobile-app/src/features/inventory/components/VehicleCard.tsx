import React from 'react'
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { VehicleListItem, getStatusBadgeConfig } from '../types'
import { getVehicleImageUrl } from '../../../api/inventoryApi'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { themeTokens } from '../../../theme/tokens'
import { Car } from 'lucide-react-native'

interface VehicleCardProps {
  vehicle: VehicleListItem
  onPress: () => void
}

export function VehicleCard({ vehicle, onPress }: VehicleCardProps) {
  const imageUrl = getVehicleImageUrl(vehicle.coverImage)
  const badgeConfig = getStatusBadgeConfig(vehicle.status)

  const formattedPrice = vehicle.targetSellingPrice
    ? `${vehicle.targetSellingPrice.toLocaleString()} ${vehicle.currency || 'USD'}`
    : 'غير محدد'

  const vinMasked = vehicle.chassisNumber && vehicle.chassisNumber.length > 6
    ? `••••••••${vehicle.chassisNumber.slice(-5)}`
    : vehicle.chassisNumber || '—'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {/* Horizontal Image Container 96x88 */}
          <View style={styles.imageBox}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <Car size={24} color={themeTokens.colors.muted} />
              </View>
            )}
          </View>

          {/* Info Column */}
          <View style={styles.infoCol}>
            <View style={styles.topRow}>
              <Text variant="h3" style={styles.titleText}>
                {vehicle.brand ? `${vehicle.brand} ` : ''}{vehicle.model}
              </Text>
              <StatusBadge status={badgeConfig.badgeStatus} label={badgeConfig.label} />
            </View>

            <Text style={styles.subText}>
              {vehicle.year} {vehicle.trim ? `• ${vehicle.trim}` : ''}
            </Text>

            <Text style={styles.vinText} ltr>
              VIN {vinMasked}
            </Text>

            <View style={styles.bottomRow}>
              <Text style={styles.priceText} bold ltr>
                {formattedPrice}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: themeTokens.spacing.sm,
    marginBottom: themeTokens.spacing.sm,
    backgroundColor: themeTokens.colors.surface,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  imageBox: {
    width: 96,
    height: 88,
    borderRadius: themeTokens.radius.sm,
    overflow: 'hidden',
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    color: themeTokens.colors.primary,
    fontSize: themeTokens.fontSize.sm,
    flex: 1,
    marginLeft: 6,
  },
  subText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  vinText: {
    fontSize: 11,
    color: themeTokens.colors.muted,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  priceText: {
    fontSize: themeTokens.fontSize.sm,
    color: themeTokens.colors.primary,
  },
})
