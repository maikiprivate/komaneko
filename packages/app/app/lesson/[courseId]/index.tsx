/**
 * セクション一覧画面
 * - セクションごとにグループ化
 * - タイムライン風のレッスンリスト
 * - スティッキーセクションヘッダー
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { getCourseById, type Lesson } from '@/mocks/lessonData'

export default function SectionListScreen() {
  const { colors, palette } = useTheme()
  const insets = useSafeAreaInsets()
  const { courseId } = useLocalSearchParams<{ courseId: string }>()

  const course = getCourseById(courseId ?? '')

  const handleLessonPress = (lesson: Lesson) => {
    if (lesson.status === 'locked' || !courseId) return
    router.push(`/lesson/${courseId}/${lesson.id}`)
  }

  // レッスンの状態に応じたスタイル
  const getLessonStyle = (status: Lesson['status']) => {
    switch (status) {
      case 'completed':
        return {
          nodeBg: palette.green,
          nodeColor: palette.white,
          textColor: colors.text.primary,
          lineColor: palette.green,
        }
      case 'available':
        return {
          nodeBg: palette.orange,
          nodeColor: palette.white,
          textColor: colors.text.primary,
          lineColor: palette.orange,
        }
      case 'locked':
        return {
          nodeBg: colors.border,
          nodeColor: colors.text.secondary,
          textColor: colors.text.secondary,
          lineColor: colors.border,
        }
    }
  }

  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <Text style={{ color: colors.text.primary }}>コースが見つかりません</Text>
      </View>
    )
  }

  // SectionList用のデータ形式に変換
  const sections = course.sections.map((section, sectionIndex) => ({
    ...section,
    sectionNumber: sectionIndex + 1,
    data: section.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      lessonIndex,
      isFirst: lessonIndex === 0,
      isLast: lessonIndex === section.lessons.length - 1,
      prevLesson: lessonIndex > 0 ? section.lessons[lessonIndex - 1] : null,
    })),
  }))

  return (
    <>
      <Stack.Screen options={{ title: course.title }} />
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <SectionList
          sections={sections}
          stickySectionHeadersEnabled={true}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles.sectionLabel, { color: palette.orange }]}>
                セクション {section.sectionNumber}
              </Text>
              <Text style={[styles.sectionTitle, { color: '#333333' }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionAccentBar, { backgroundColor: palette.orange }]} />
            </View>
          )}
          renderItem={({ item: lesson }) => {
            const style = getLessonStyle(lesson.status)
            const prevStyle = lesson.prevLesson ? getLessonStyle(lesson.prevLesson.status) : null

            return (
              <View
                style={[
                  styles.lessonItem,
                  { backgroundColor: colors.background.primary },
                  lesson.isFirst && styles.lessonItemFirst,
                  lesson.isLast && styles.lessonItemLast,
                ]}
              >
                {/* タイムライン（左側の線とノード） */}
                <View style={styles.timeline}>
                  {/* 上部の線 */}
                  {!lesson.isFirst && (
                    <View
                      style={[
                        styles.lineTop,
                        { backgroundColor: prevStyle?.lineColor ?? colors.border },
                      ]}
                    />
                  )}

                  {/* ノード（丸） */}
                  <View style={[styles.node, { backgroundColor: style.nodeBg }]}>
                    {lesson.status === 'locked' ? (
                      <FontAwesome name="lock" size={12} color={style.nodeColor} />
                    ) : lesson.status === 'completed' ? (
                      <FontAwesome name="check" size={12} color={style.nodeColor} />
                    ) : (
                      <Text style={[styles.nodeNumber, { color: style.nodeColor }]}>
                        {lesson.lessonIndex + 1}
                      </Text>
                    )}
                  </View>

                  {/* 下部の線 */}
                  {!lesson.isLast && (
                    <View
                      style={[
                        styles.lineBottom,
                        { backgroundColor: style.lineColor },
                      ]}
                    />
                  )}
                </View>

                {/* レッスン情報（右側） */}
                <TouchableOpacity
                  style={[
                    styles.lessonContent,
                    lesson.status === 'available' && styles.lessonContentActive,
                    lesson.status === 'available' && { borderColor: palette.orange },
                  ]}
                  onPress={() => handleLessonPress(lesson)}
                  activeOpacity={lesson.status === 'locked' ? 1 : 0.7}
                >
                  <Text style={[styles.lessonTitle, { color: style.textColor }]}>
                    {lesson.title}
                  </Text>
                  {lesson.status === 'available' && (
                    <FontAwesome name="play-circle" size={20} color={palette.orange} />
                  )}
                  {lesson.status === 'completed' && (
                    <FontAwesome name="check-circle" size={20} color={palette.green} />
                  )}
                </TouchableOpacity>
              </View>
            )
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionAccentBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  lessonItem: {
    flexDirection: 'row',
    minHeight: 56,
    paddingRight: 16,
  },
  lessonItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 16,
  },
  lessonItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingBottom: 16,
  },
  timeline: {
    width: 56,
    alignItems: 'center',
  },
  lineTop: {
    width: 3,
    height: 12,
  },
  lineBottom: {
    width: 3,
    flex: 1,
    minHeight: 12,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  lessonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  lessonContentActive: {
    borderWidth: 2,
    backgroundColor: 'rgba(255, 149, 0, 0.05)',
  },
  lessonTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
})
