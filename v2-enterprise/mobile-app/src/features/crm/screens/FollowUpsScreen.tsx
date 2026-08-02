import React from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getInteractions } from '../../../api/crmApi'
import { InteractionCard } from '../components/InteractionCard'
import { Screen } from '../../../components/ui/Screen'
import { Text } from '../../../components/ui/Text'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'
import { EmptyState } from '../../../components/ui/EmptyState'
import { themeTokens } from '../../../theme/tokens'

interface FollowUpsScreenProps {
  onBack: () => void
}

export function FollowUpsScreen({ onBack }: FollowUpsScreenProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['crmFollowUps'],
    queryFn: () => getInteractions({ page: 1 }),
  })

  const dueSoon = data?.due_soon || data?.items || []

  return (
    <Screen style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← عودة للمبيعات</Text>
        </TouchableOpacity>
        <Text variant="h2" style={styles.title}>
          متابعات اليوم والزيارات القادمة
        </Text>
      </View>

      {isLoading ? (
        <LoadingState message="جاري جلب قائمة المتابعات..." />
      ) : isError ? (
        <EmptyState title="تعذر جلب المتابعات" description="يرجى التحقق من الشبكة وإعادة المحاولة." />
      ) : (
        <FlatList
          data={dueSoon}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InteractionCard interaction={item} />}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد متابعات مستحقة اليوم"
              description="جميع المتابعات الحالية محدثة ولا توجد تذكيرات مستحقة."
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
    marginBottom: themeTokens.spacing.md,
    paddingBottom: themeTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
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
  listContent: {
    paddingBottom: themeTokens.spacing.xxl,
  },
})
