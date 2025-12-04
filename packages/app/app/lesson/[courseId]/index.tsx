/**
 * セクション一覧画面（Duolingo風ツリーUI）
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { getCourseById, getAllLessons, type Lesson } from '@/mocks/lessonData'

export default function SectionListScreen() {
  const { colors, palette } = useTheme()
  const insets = useSafeAreaInsets()
  const { courseId } = useLocalSearchParams<{ courseId: string }>()

  const course = getCourseById(courseId ?? '')
  const allLessons = course ? getAllLessons(course) : []

  const handleLessonPress = (lesson: Lesson) => {
    if (lesson.status === 'locked' || !courseId) return
    router.push(`/lesson/${courseId}/${lesson.id}`)
  }

  // レッスンの状態に応じたスタイルを取得
  const getNodeStyle = (status: Lesson['status']) => {
    switch (status) {
      case 'completed':
        return {
          backgroundColor: palette.green,
          borderColor: palette.green,
          size: 56,
        }
      case 'available':
        return {
          backgroundColor: palette.orange,
          borderColor: palette.orange,
          size: 64,
        }
      case 'locked':
        return {
          backgroundColor: colors.background.primary,
          borderColor: colors.border,
          size: 56,
        }
    }
  }

  // レッスンのアイコンを取得
  const getNodeIcon = (status: Lesson['status']) => {
    switch (status) {
      case 'completed':
        return { name: 'check' as const, color: palette.white }
      case 'available':
        return { name: 'star' as const, color: palette.white }
      case 'locked':
        return { name: 'lock' as const, color: colors.text.secondary }
    }
  }

  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Text style={{ color: colors.text.primary }}>コースが見つかりません</Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: course.title,
          headerBackTitle: '戻る',
          headerStyle: { backgroundColor: colors.background.secondary },
          headerTintColor: colors.text.primary,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {course.sections.map((section, sectionIndex) => (
            <View key={section.id} style={styles.sectionContainer}>
              {/* セクション見出し */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: palette.orange }]}>
                  <Text style={[styles.sectionBadgeText, { color: palette.white }]}>
                    {section.title}
                  </Text>
                </View>
              </View>

              {/* レッスンノード */}
              {section.lessons.map((lesson, lessonIndex) => {
                const nodeStyle = getNodeStyle(lesson.status)
                const icon = getNodeIcon(lesson.status)
                const isLastInSection = lessonIndex === section.lessons.length - 1
                const isLastSection = sectionIndex === course.sections.length - 1

                return (
                  <View key={lesson.id} style={styles.nodeContainer}>
                    {/* 接続線（上） */}
                    {(lessonIndex > 0 || sectionIndex > 0) && (
                      <View
                        style={[
                          styles.connectorTop,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}

                    {/* ノード本体 */}
                    <TouchableOpacity
                      style={[
                        styles.node,
                        {
                          width: nodeStyle.size,
                          height: nodeStyle.size,
                          borderRadius: nodeStyle.size / 2,
                          backgroundColor: nodeStyle.backgroundColor,
                          borderColor: nodeStyle.borderColor,
                          borderWidth: lesson.status === 'locked' ? 2 : 0,
                        },
                      ]}
                      onPress={() => handleLessonPress(lesson)}
                      activeOpacity={lesson.status === 'locked' ? 1 : 0.7}
                    >
                      <FontAwesome name={icon.name} size={24} color={icon.color} />
                    </TouchableOpacity>

                    {/* レッスン名 */}
                    <Text
                      style={[
                        styles.lessonTitle,
                        {
                          color: lesson.status === 'locked'
                            ? colors.text.secondary
                            : colors.text.primary,
                          fontWeight: lesson.status === 'available' ? '700' : '500',
                        },
                      ]}
                    >
                      {lesson.title}
                    </Text>

                    {/* 接続線（下） */}
                    {!(isLastInSection && isLastSection) && (
                      <View
                        style={[
                          styles.connectorBottom,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 24,
    alignItems: 'center',
  },
  sectionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nodeContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  connectorTop: {
    width: 3,
    height: 20,
    marginBottom: 4,
  },
  connectorBottom: {
    width: 3,
    height: 20,
    marginTop: 4,
  },
  node: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lessonTitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
})
