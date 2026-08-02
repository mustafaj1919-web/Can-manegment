import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { themeTokens } from '../../theme/tokens'

interface SkeletonLoaderProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = themeTokens.radius.sm,
  style,
}: SkeletonLoaderProps) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
})
