/**
 * コース一覧画面（駒塾タブ）
 */

import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { getCourses, type CourseData } from '@/lib/api/lesson'

const textbookIcon = require('@/assets/images/icons/textbook.png')

export default function LessonScreen() {
  const { colors, palette } = useTheme()
  const router = useRouter()
  const [courses, setCourses] = useState<CourseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const fetchCourses = useCallback(() => {
    cancelledRef.current = false
    setIsLoading(true)
    setError(null)

    getCourses()
      .then((data) => {
        if (cancelledRef.current) return
        setCourses(data)
      })
      .catch((err) => {
        if (!cancelledRef.current) setError(err.message || 'データの取得に失敗しました')
      })
      .finally(() => {
        if (!cancelledRef.current) setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchCourses()
    return () => {
      cancelledRef.current = true
    }
  }, [fetchCourses])

  const handleRetry = useCallback(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleCoursePress = (course: CourseData) => {
    router.push(`/lesson/${course.id}`)
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.button.primary} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.button.primary }]}
              onPress={handleRetry}
            >
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>再試行</Text>
            </TouchableOpacity>
          </View>
        ) : courses.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            コースがありません
          </Text>
        ) : (
          courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={[styles.courseCard, { backgroundColor: colors.card.background }]}
              onPress={() => handleCoursePress(course)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: palette.orange }]}>
                  <Image source={textbookIcon} style={styles.iconImage} resizeMode="contain" />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.courseTitle, { color: colors.text.primary }]}>
                    {course.title}
                  </Text>
                  <Text style={[styles.courseDescription, { color: colors.text.secondary }]}>
                    {course.description}
                  </Text>
                  <Text style={[styles.sectionCount, { color: colors.text.secondary }]}>
                    {course.sections.length > 0 ? `${course.sections.length}セクション` : '準備中'}
                  </Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: colors.background.secondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${course.progress.progressPercent}%`,
                        backgroundColor: course.progress.progressPercent === 100 ? palette.green : palette.orange,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text.secondary }]}>
                  {course.progress.progressPercent}%
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loader: {
    marginTop: 24,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  errorText: {
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
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  cardTitleContainer: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  courseDescription: {
    fontSize: 13,
  },
  sectionCount: {
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
})
