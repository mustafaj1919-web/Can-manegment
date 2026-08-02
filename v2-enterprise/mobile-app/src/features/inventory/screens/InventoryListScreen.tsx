import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getInventory } from '../../../api/inventoryApi'
import { VehicleCard } from '../components/VehicleCard'
import { InventoryFilterSheet } from '../components/InventoryFilterSheet'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useAuthStore } from '../../../store/authStore'
import { themeTokens } from '../../../theme/tokens'

interface InventoryListScreenProps {
  onSelectVehicle: (id: string) => void
  onOpenScanner?: () => void
}

export function InventoryListScreen({
  onSelectVehicle,
  onOpenScanner,
}: InventoryListScreenProps) {
  const queryClient = useQueryClient()
  const { activeBranch } = useAuthStore()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [page, setPage] = useState(1)
  const [filterSheetVisible, setFilterSheetVisible] = useState(false)

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [search])

  // Invalidate query when branch changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }, [activeBranch?.id])

  const queryKey = useMemo(
    () => ['inventory', { status: statusFilter, search: debouncedSearch, page, branch: activeBranch?.id }],
    [statusFilter, debouncedSearch, page, activeBranch?.id]
  )

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getInventory({
        status: statusFilter,
        search: debouncedSearch,
        page,
        perPage: 25,
      }),
    staleTime: 20000,
  })

  const vehicles = data?.data || []
  const total = data?.total || 0

  return (
    <Screen style={styles.screen}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث برقم الشاصي، الموديل، اللون..."
            style={styles.searchInput}
            ltr={false}
          />
        </View>

        <View style={styles.actionsRow}>
          <Button
            title={`تصفية (${statusFilter === 'All' ? 'الكل' : statusFilter})`}
            onPress={() => setFilterSheetVisible(true)}
            variant="outline"
            size="sm"
          />

          {onOpenScanner && (
            <Button
              title="مسح الشاصي 📷"
              onPress={onOpenScanner}
              variant="primary"
              size="sm"
            />
          )}
        </View>

        {/* Active Filter Chips */}
        {statusFilter !== 'All' && (
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={styles.activeChip}
              onPress={() => setStatusFilter('All')}
            >
              <Text style={styles.activeChipText}>حالة: {statusFilter} ✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Vehicles List */}
      {isLoading ? (
        <LoadingState message="جاري جلب قائمة المخزون..." />
      ) : isError ? (
        <EmptyState
          title="تعذر تحميل المخزون"
          description="تأكد من الاتصال بالشبكة وحاول مجدداً."
        />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VehicleCard vehicle={item} onPress={() => onSelectVehicle(item.id)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={[themeTokens.colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="لا توجد سيارات مطابقة"
              description="جرب البحث بكلمة أخرى أو تغيير خيارات التصفية."
            />
          }
        />
      )}

      {/* Filter Bottom Sheet */}
      <InventoryFilterSheet
        visible={filterSheetVisible}
        currentStatus={statusFilter}
        onClose={() => setFilterSheetVisible(false)}
        onApply={(status) => {
          setStatusFilter(status || 'All')
          setPage(1)
          setFilterSheetVisible(false)
        }}
        onReset={() => {
          setStatusFilter('All')
          setPage(1)
          setFilterSheetVisible(false)
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    padding: themeTokens.spacing.md,
  },
  header: {
    marginBottom: themeTokens.spacing.sm,
  },
  searchRow: {
    marginBottom: themeTokens.spacing.xs,
  },
  searchInput: {
    marginBottom: 0,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    marginTop: 8,
  },
  activeChip: {
    backgroundColor: themeTokens.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: themeTokens.radius.full,
  },
  activeChipText: {
    color: '#FFFFFF',
    fontSize: themeTokens.fontSize.xs,
  },
  listContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
})
