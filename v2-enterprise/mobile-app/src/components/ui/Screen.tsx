import React from 'react'
import { View, StyleSheet, ViewStyle, StyleProp, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { themeTokens } from '../../theme/tokens'

interface ScreenProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  bg?: string
}

export function Screen({ children, style, bg = themeTokens.colors.background }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
