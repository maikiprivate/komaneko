import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Redirect, Tabs } from 'expo-router'
import type React from 'react'
import { Image, View } from 'react-native'

const lessonIcon = require('@/assets/images/tabs/lesson.png')
const tsumeshogiIcon = require('@/assets/images/tabs/tsumeshogi.png')

import { LogoHeader } from '@/components/icons/LogoHeader'
import { useClientOnlyValue } from '@/components/useClientOnlyValue'
import { useTheme } from '@/components/useTheme'
import { useAuth } from '@/lib/auth/AuthContext'

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name']
  color: string
}) {
  return <FontAwesome size={28} style={{ marginBottom: 4 }} {...props} />
}

export default function TabLayout() {
  const { colors, palette } = useTheme()
  const { isAuthenticated, isLoading } = useAuth()

  // 認証状態の読み込み中は何も表示しない
  if (isLoading) {
    return null
  }

  // 未認証の場合はウェルカム画面へリダイレクト
  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
        },
        headerStyle: {
          backgroundColor: palette.orange,
        },
        headerTintColor: '#FFFFFF',
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerLeft: () => (
            <View style={{ marginLeft: 15, marginTop: -2 }}>
              <LogoHeader width={119} height={27} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="lesson"
        options={{
          title: '',
          tabBarLabel: '駒塾',
          tabBarIcon: ({ color }) => (
            <Image
              source={lessonIcon}
              style={{ width: 28, height: 28, tintColor: color, marginBottom: 4 }}
            />
          ),
          headerLeft: () => (
            <View style={{ marginLeft: 15, marginTop: -2 }}>
              <LogoHeader width={119} height={27} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tsumeshogi"
        options={{
          title: '',
          tabBarLabel: '詰将棋',
          tabBarIcon: ({ color }) => (
            <Image
              source={tsumeshogiIcon}
              style={{ width: 28, height: 28, tintColor: color, marginBottom: 4 }}
            />
          ),
          headerLeft: () => (
            <View style={{ marginLeft: 15, marginTop: -2 }}>
              <LogoHeader width={119} height={27} />
            </View>
          ),
        }}
      />
    </Tabs>
  )
}
