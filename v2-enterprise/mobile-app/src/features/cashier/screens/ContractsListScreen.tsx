import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getInstallmentsList } from '../../../api/cashierApi'
import { InstallmentContractCard } from '../components/InstallmentContractCard'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Input } from '../../../components/ui/Input'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

interface ContractsListScreenProps {
  onSelectPlan: (id: string) => void
  onBack: () => void
}

const FILTERS = [
  { key: 'all', label: 'جميع العقود' },
  { key: 'overdue', label: 'المتأخرات' },
  { key: 'due_today', label: 'مستحق اليوم' },
  { key: 'unpaid', label: 'غير مسددة' },
  { key: 'paid', label: 'مكتملة السداد' },
]

export function ContractsListScreen({ onSelectPlan, onBack }: ContractsListScreenProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['installmentPlans', search, filter],
    queryFn: () => getInstallmentsList({ search: search.trim() || undefined, filter }),
  })

  return (
    <Screen style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← عودة محطة الصندوق</Text>
        </TouchableOpacity>
        <Text variant="h2" style={styles.title}>
          عقود الأقساط والتحصيل
        </Text>
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="ابحث باسم العميل، رقم العقد، رقم الهاتف، السيارة..."
        style={styles.searchInput}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isSelected = filter === f.key
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {isLoading ? (
        <LoadingState message="جاري جلب عقود الأقساط..." />
      ) : isError ? (
        <EmptyState title="تعذر جلب عقود الأقساط" description="يرجى التحقق من الشبكة وإعادة المحاولة." />
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InstallmentContractCard plan={item} onPress={() => onSelectPlan(item.id)} />
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
              title="لا توجد عقود أقساط مطابقة"
              description="لم يتم العثور على نتائج تطابق معايير البحث."
            />
          }
        />
      )}
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
    paddingVertical: 4,
  },
  backText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.accent,
    fontWeight: themeTokens.fontWeight.bold,
  },
  title: {
    fontSize: themeTokens.fontSize.md,
    color: themeTokens.colors.primary,
  },
  searchInput: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    marginBottom: themeTokens.spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: themeTokens.radius.full,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginLeft: 6,
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
  listContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
})
