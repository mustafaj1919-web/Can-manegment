import React from 'react'
import { Tabs } from 'expo-router'
import { themeTokens } from '../../src/theme/tokens'
import { Wallet, FileText, Receipt } from 'lucide-react-native'

export default function CashierLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeTokens.colors.primary,
        tabBarInactiveTintColor: themeTokens.colors.muted,
        tabBarStyle: {
          backgroundColor: themeTokens.colors.surface,
          borderTopColor: themeTokens.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <Wallet size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contracts/index"
        options={{
          title: 'العقود',
          tabBarIcon: ({ color, size }) => <FileText size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="receipts/index"
        options={{
          title: 'الوصولات',
          tabBarIcon: ({ color, size }) => <Receipt size={size || 20} color={color} />,
        }}
      />
    </Tabs>
  )
}
