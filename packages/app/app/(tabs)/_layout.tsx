import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Redirect, Tabs } from 'expo-router'
import type React from 'react'
import { useState } from 'react'
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native'

const lessonIcon = require('@/assets/images/tabs/lesson.png')
const tsumeshogiIcon = require('@/assets/images/tabs/tsumeshogi.png')

import { LogoHeader } from '@/components/icons/LogoHeader'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { useClientOnlyValue } from '@/components/useClientOnlyValue'
import { useTheme } from '@/components/useTheme'
import { useAuth } from '@/lib/auth/AuthContext'

const HEADER_ICON_SIZE = 24
const TAB_ICON_SIZE = 28

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name']
  color: string
}) {
  return <FontAwesome size={TAB_ICON_SIZE} style={styles.tabIcon} {...props} />
}

export default function TabLayout() {
  const { colors, palette } = useTheme()
  const { isAuthenticated, isLoading } = useAuth()
  const [isSettingsVisible, setIsSettingsVisible] = useState(false)

  // 認証状態の読み込み中は何も表示しない
  if (isLoading) {
    return null
  }

  // 未認証の場合はウェルカム画面へリダイレクト
  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />
  }

  return (
    <>
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
          headerTintColor: palette.white,
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
              <View style={styles.headerLeft}>
                <LogoHeader width={119} height={27} />
              </View>
            ),
            headerRight: () => (
              <TouchableOpacity
                style={styles.headerRight}
                onPress={() => setIsSettingsVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="設定"
              >
                <FontAwesome name="gear" size={HEADER_ICON_SIZE} color={palette.white} />
              </TouchableOpacity>
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
              style={[styles.tabIconImage, { tintColor: color }]}
            />
          ),
          headerLeft: () => (
            <View style={styles.headerLeft}>
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
              style={[styles.tabIconImage, { tintColor: color }]}
            />
          ),
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <LogoHeader width={119} height={27} />
            </View>
          ),
        }}
      />
      </Tabs>
      <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  headerLeft: {
    marginLeft: 15,
    marginTop: -2,
  },
  headerRight: {
    marginRight: 15,
    padding: 4,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabIconImage: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    marginBottom: 4,
  },
})
