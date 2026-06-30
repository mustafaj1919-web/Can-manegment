import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Vehicle, VehicleFilters } from '../types/vehicle';
import { vehicleService } from '../services/vehicleService';
import { VehicleCard } from '../components/vehicle/VehicleCard';
import { favoriteStore } from '../store/favoriteStore';

interface PublicShowroomScreenProps {
  onSelectVehicle: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const PublicShowroomScreen: React.FC<PublicShowroomScreenProps> = ({
  onSelectVehicle,
  favorites,
  onToggleFavorite,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [availableFilters, setAvailableFilters] = useState<VehicleFilters | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<string>('');

  const fetchVehicles = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    const res = await vehicleService.getVehicles({
      brand: selectedBrand || undefined,
      year: selectedYear || undefined,
      fuelType: selectedFuel || undefined,
      search: search || undefined,
    });

    if (res.success && res.data) {
      setVehicles(res.data.items);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const fetchFilters = async () => {
    const res = await vehicleService.getFilters();
    if (res.success && res.data) {
      setAvailableFilters(res.data);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [selectedBrand, selectedYear, selectedFuel]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleSearchSubmit = () => {
    fetchVehicles();
  };

  const resetFilters = () => {
    setSelectedBrand('');
    setSelectedYear(null);
    setSelectedFuel('');
    setShowFilters(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Header Banner */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>معرض الأصدقاء للسيارات</Text>
        <Text style={styles.headerSubtitle}>اكتشف سيارتك المثالية بأفضل عروض التقسيط</Text>
        
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity 
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          >
            <SlidersHorizontal size={18} color={showFilters ? colors.white : colors.primary} />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن ماركة، موديل، لون..."
              placeholderTextColor={colors.secondary}
              textAlign="right"
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Search size={18} color={colors.secondary} style={styles.searchIcon} />
          </View>
        </View>
      </View>

      {/* Expanded Filters Drawer */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>إعادة تعيين</Text>
            </TouchableOpacity>
            <Text style={styles.filterTitle}>تصفية النتائج</Text>
          </View>
          
          {/* Brand Filter */}
          {availableFilters?.brands && availableFilters.brands.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>الماركة</Text>
              <View style={styles.badgeRow}>
                {availableFilters.brands.map(b => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => setSelectedBrand(selectedBrand === b ? '' : b)}
                    style={[styles.badge, selectedBrand === b && styles.badgeActive]}
                  >
                    <Text style={[styles.badgeText, selectedBrand === b && styles.badgeTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Year Filter */}
          {availableFilters?.years && availableFilters.years.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>سنة الصنع</Text>
              <View style={styles.badgeRow}>
                {availableFilters.years.slice(0, 8).map(y => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setSelectedYear(selectedYear === y ? null : y)}
                    style={[styles.badge, selectedYear === y && styles.badgeActive]}
                  >
                    <Text style={[styles.badgeText, selectedYear === y && styles.badgeTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Vehicles List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري تحميل السيارات...</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchVehicles(true)} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد سيارات متوفرة تطابق خياراتك حالياً.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() => onSelectVehicle(item.id)}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 13,
  },
  searchIcon: {
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtersContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  resetText: {
    fontSize: 12,
    color: colors.danger,
  },
  filterGroup: {
    marginVertical: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },
});
