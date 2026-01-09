/**
 * セクション一覧画面
 * - セクションごとにグループ化
 * - タイムライン風のレッスンリスト
 * - スティッキーセクションヘッダー
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { getCourse, type CourseData, type LessonSummary } from '@/lib/api/lesson'

/** レッスンの状態 */
type LessonStatus = 'available' | 'completed' | 'locked'

/**
 * レッスンの状態を判定
 *
 * @param lessonId - 判定対象のレッスンID
 * @param completedSet - 完了済みレッスンIDのSet
 * @param previousLessonId - 前のレッスンのID（最初のレッスンはnull）
 */
const getLessonStatus = (
  lessonId: string,
  completedSet: Set<string>,
  previousLessonId: string | null
): LessonStatus => {
  // 完了済みなら completed
  if (completedSet.has(lessonId)) {
    return 'completed'
  }

  // 最初のレッスン or 前のレッスンが完了 → available
  const isFirstLesson = previousLessonId === null
  const isPreviousCompleted = previousLessonId !== null && completedSet.has(previousLessonId)
  if (isFirstLesson || isPreviousCompleted) {
    return 'available'
  }

  // それ以外は locked
  return 'locked'
}

export default function SectionListScreen() {
  const { colors, palette } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { courseId } = useLocalSearchParams<{ courseId: string }>()

  const [course, setCourse] = useState<CourseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const fetchCourse = useCallback(() => {
    if (!courseId) {
      setError('コースIDが指定されていません')
      setIsLoading(false)
      return
    }

    cancelledRef.current = false
    setIsLoading(true)
    setError(null)

    getCourse(courseId)
      .then((data) => {
        if (cancelledRef.current) return
        setCourse(data)
      })
      .catch((err) => {
        if (!cancelledRef.current) setError(err.message || 'データの取得に失敗しました')
      })
      .finally(() => {
        if (!cancelledRef.current) setIsLoading(false)
      })
  }, [courseId])

  useEffect(() => {
    fetchCourse()
    return () => {
      cancelledRef.current = true
    }
  }, [fetchCourse])

  // SectionList用のデータ形式に変換（メモ化）
  // Note: Hooksは早期リターンより前に配置する必要がある
  const sections = useMemo(() => {
    if (!course) return []

    const completedSet = new Set(course.completedLessonIds ?? [])
    // セクションをまたいで前のレッスン情報を追跡
    let previousLessonId: string | null = null
    let previousStatus: LessonStatus | null = null

    return course.sections.map((section, sectionIndex) => ({
      ...section,
      sectionNumber: sectionIndex + 1,
      data: section.lessons.map((lesson, lessonIndex) => {
        const status = getLessonStatus(lesson.id, completedSet, previousLessonId)

        const result = {
          ...lesson,
          lessonIndex,
          status,
          isFirst: lessonIndex === 0,
          isLast: lessonIndex === section.lessons.length - 1,
          prevStatus: previousStatus,
        }

        // 次のレッスンのために現在の情報を保存
        previousLessonId = lesson.id
        previousStatus = status
        return result
      }),
    }))
  }, [course])

  const handleRetry = useCallback(() => {
    fetchCourse()
  }, [fetchCourse])

  const handleLessonPress = useCallback(
    (lesson: LessonSummary, status: LessonStatus) => {
      if (!courseId) return
      // ロックされたレッスンは開けない
      if (status === 'locked') return
      router.push(`/lesson/${courseId}/${lesson.id}`)
    },
    [courseId, router]
  )

  // レッスンの状態に応じたスタイル
  const getLessonStyle = useCallback(
    (status: LessonStatus) => {
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
    },
    [colors, palette]
  )

  // ローディング表示
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '読み込み中...' }} />
        <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
          <ActivityIndicator color={colors.button.primary} />
        </View>
      </>
    )
  }

  // エラー表示
  if (error || !course) {
    return (
      <>
        <Stack.Screen options={{ title: 'エラー' }} />
        <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            {error || 'コースが見つかりません'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.button.primary }]}
            onPress={handleRetry}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>再試行</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  // セクションが空の場合
  if (sections.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: course.title }} />
        <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            セクションがありません
          </Text>
        </View>
      </>
    )
  }

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
            <View style={[styles.sectionHeader, { backgroundColor: colors.background.primary }]}>
              <Text style={[styles.sectionLabel, { color: palette.orange }]}>
                セクション {section.sectionNumber}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionAccentBar, { backgroundColor: palette.orange }]} />
            </View>
          )}
          renderItem={({ item: lesson }) => {
            const style = getLessonStyle(lesson.status)
            const prevStyle = lesson.prevStatus ? getLessonStyle(lesson.prevStatus) : null

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
                  {/* 上部の線（1番目はスペーサーで高さを揃える） */}
                  <View
                    style={[
                      styles.lineTop,
                      {
                        backgroundColor: lesson.isFirst
                          ? 'transparent'
                          : (prevStyle?.lineColor ?? colors.border),
                      },
                    ]}
                  />

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

                  {/* 下部の線（最後はスペーサーで高さを揃える） */}
                  <View
                    style={[
                      styles.lineBottom,
                      {
                        backgroundColor: lesson.isLast
                          ? 'transparent'
                          : style.lineColor,
                      },
                    ]}
                  />
                </View>

                {/* レッスン情報（右側） */}
                <TouchableOpacity
                  style={[
                    styles.lessonContent,
                    lesson.status === 'available' && styles.lessonContentActive,
                    lesson.status === 'available' && { borderColor: palette.orange },
                  ]}
                  onPress={() => handleLessonPress(lesson, lesson.status)}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
