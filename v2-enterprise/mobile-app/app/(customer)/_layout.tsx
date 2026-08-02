import React from 'react'
import { Tabs } from 'expo-router'
import { themeTokens } from '../../src/theme/tokens'
import { Home, Car, Calendar, FileText, User } from 'lucide-react-native'

export default function CustomerLayout() {
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
          tabBarIcon: ({ color, size }) => <Home size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'عقودي',
          tabBarIcon: ({ color, size }) => <Car size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="installments"
        options={{
          title: 'الأقساط',
          tabBarIcon: ({ color, size }) => <Calendar size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'الوصولات',
          tabBarIcon: ({ color, size }) => <FileText size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }) => <User size={size || 20} color={color} />,
        }}
      />
    </Tabs>
  )
}
