import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Link, Tabs } from 'expo-router'
import { Pressable, Image } from 'react-native'

const lessonIcon = require('@/assets/images/tabs/lesson.png')
const tsumeshogiIcon = require('@/assets/images/tabs/tsumeshogi.png')

import { useTheme } from '@/components/useTheme'
import { useClientOnlyValue } from '@/components/useClientOnlyValue'

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name']
  color: string
}) {
  return <FontAwesome size={28} style={{ marginBottom: 4 }} {...props} />
}

export default function TabLayout() {
  const { colors } = useTheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
        },
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => (
            <Link href="/two" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="cog"
                    size={22}
                    color={colors.text.primary}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="lesson"
        options={{
          title: '駒塾',
          tabBarIcon: ({ color }) => (
            <Image
              source={lessonIcon}
              style={{ width: 28, height: 28, tintColor: color, marginBottom: 4 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tsumeshogi"
        options={{
          title: '詰将棋',
          tabBarIcon: ({ color }) => (
            <Image
              source={tsumeshogiIcon}
              style={{ width: 28, height: 28, tintColor: color, marginBottom: 4 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '設定',
          href: null, // タブバーから非表示
        }}
      />
    </Tabs>
  )
}
