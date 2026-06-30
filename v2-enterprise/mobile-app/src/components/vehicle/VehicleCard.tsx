import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Vehicle } from '../../types/vehicle';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  style?: ViewStyle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onPress,
  isFavorite,
  onToggleFavorite,
  style,
}) => {
  const coverImage = vehicle.images && vehicle.images.length > 0
    ? `http://100.75.153.105/static/uploads/vehicles/${vehicle.images[0].filename}`
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, style]}
    >
      {/* Image Gallery Cover */}
      <View style={styles.imageContainer}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}
        
        {/* Status Badge */}
        <Badge
          label={
            vehicle.status === 'Available' ? 'متوفرة' :
            vehicle.status === 'Reserved' ? 'محجوزة' : 'مباعة'
          }
          type={
            vehicle.status === 'Available' ? 'success' :
            vehicle.status === 'Reserved' ? 'warning' : 'danger'
          }
          style={styles.statusBadge}
        />

        {/* Favorite Button */}
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          <Heart
            size={18}
            color={isFavorite ? colors.danger : colors.secondary}
            fill={isFavorite ? colors.danger : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Details Footer */}
      <View style={styles.detailsContainer}>
        <Text style={styles.brandTitle} numberOfLines={1}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.yearText}>{vehicle.year} · {vehicle.transmission === 'Automatic' ? 'أوتوماتيك' : 'عادي'}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            {formatCurrency(vehicle.price, 'USD')}
          </Text>
          {vehicle.mileage !== undefined && (
            <Text style={styles.mileageText}>
              {vehicle.mileage.toLocaleString()} كم
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  placeholderText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: colors.card,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsContainer: {
    padding: 12,
    alignItems: 'flex-end', // RTL
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  yearText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
    textAlign: 'right',
  },
  priceContainer: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  mileageText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
