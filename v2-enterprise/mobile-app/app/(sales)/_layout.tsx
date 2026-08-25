import React from 'react'
import { Tabs } from 'expo-router'
import { themeTokens } from '../../src/theme/tokens'
import { Users, Briefcase, Car } from 'lucide-react-native'

export default function SalesLayout() {
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
          tabBarIcon: ({ color, size }) => <Users size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="crm/index"
        options={{
          title: 'الفرص CRM',
          tabBarIcon: ({ color, size }) => <Briefcase size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory/index"
        options={{
          title: 'المخزون',
          tabBarIcon: ({ color, size }) => <Car size={size || 20} color={color} />,
        }}
      />
    </Tabs>
  )
}
