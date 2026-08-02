import React from 'react'
import { View, StyleSheet } from 'react-native'
import { CrmInteraction } from '../types'
import { Text } from '../../../components/ui/Text'
import { Card } from '../../../components/ui/Card'
import { themeTokens } from '../../../theme/tokens'

interface InteractionCardProps {
  interaction: CrmInteraction
}

export function InteractionCard({ interaction }: InteractionCardProps) {
  const formattedDate = interaction.interaction_date
    ? new Date(interaction.interaction_date).toLocaleDateString('ar-IQ')
    : ''

  const formattedFollowUp = interaction.follow_up_date
    ? new Date(interaction.follow_up_date).toLocaleDateString('ar-IQ')
    : null

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{interaction.type_label || interaction.interaction_type}</Text>
        </View>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {interaction.notes && (
        <Text style={styles.notesText}>{interaction.notes}</Text>
      )}

      <View style={styles.footerRow}>
        {interaction.employee_name && (
          <Text style={styles.metaText}>الموظف: {interaction.employee_name}</Text>
        )}

        {formattedFollowUp && (
          <Text style={styles.followUpText}>
            موعد المتابعة: {formattedFollowUp}
          </Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: themeTokens.spacing.md,
    marginBottom: themeTokens.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: themeTokens.radius.sm,
  },
  typeText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.primary,
    fontWeight: themeTokens.fontWeight.bold,
  },
  dateText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.muted,
  },
  notesText: {
    fontSize: themeTokens.fontSize.xs,
    color: themeTokens.colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
  },
  metaText: {
    fontSize: 10,
    color: themeTokens.colors.muted,
  },
  followUpText: {
    fontSize: 10,
    color: themeTokens.colors.warning,
    fontWeight: themeTokens.fontWeight.bold,
  },
})
