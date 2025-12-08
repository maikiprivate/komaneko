/**
 * レッスン結果画面
 *
 * レッスン完了後に正答率と次のアクションを表示
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { recordLearningCompletion } from '@/lib/streak/recordLearningCompletion'
import { getNextLesson } from '@/mocks/lessonData'

const confettiBackground = require('@/assets/images/background/confetti.png')
const characterImage = require('@/assets/images/character/sitting.png')

export default function LessonResultScreen() {
  const { colors, palette } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    correct: string
    total: string
    courseId: string
    lessonId: string
    time: string
  }>()

  // ストリーク更新チェック（画面表示時に1回だけ実行）
  // チェック完了までボタンを非表示にする
  const [isReady, setIsReady] = useState(false)
  const hasNavigatedToStreak = useRef(false)

  useEffect(() => {
    const checkStreak = async () => {
      try {
        const result = await recordLearningCompletion()
        if (result.updated) {
          // ストリーク画面へ遷移する場合はisReadyをtrueにしない
          // これによりナビゲーション完了までスピナーが表示され続ける
          hasNavigatedToStreak.current = true
          router.push(`/streak-update?count=${result.newCount}`)
          return
        }
      } catch (error) {
        console.error('[LessonResult] Failed to check streak:', error)
      }
      setIsReady(true)
    }
    checkStreak()
  }, [])

  // ストリーク画面から戻ってきたときにボタンを表示
  useFocusEffect(
    useCallback(() => {
      if (hasNavigatedToStreak.current && !isReady) {
        setIsReady(true)
      }
    }, [isReady])
  )

  // 必須パラメータの検証
  if (!params.courseId || !params.lessonId) {
    return (
      <View style={[styles.background, { backgroundColor: palette.gameBackground }]}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            パラメータが不足しています
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: palette.orange }]}
            onPress={() => router.dismissAll()}
          >
            <Text style={[styles.buttonText, { color: palette.white }]}>ホームに戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const correctCount = Number(params.correct) || 0
  const totalCount = Number(params.total) || 0
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const isPerfect = correctCount === totalCount
  const timeString = params.time || '0:00'

  // 正答率に応じたメッセージ
  const getMessage = () => {
    if (percentage === 100) return 'パーフェクトにゃ！すごいにゃ〜！'
    if (percentage >= 80) return 'よくできたにゃ！その調子にゃ〜'
    if (percentage >= 60) return 'まあまあにゃ！もう少し頑張るにゃ'
    return '復習するにゃ！何度もやれば覚えるにゃ〜'
  }

  // ホームに戻る
  const handleGoHome = () => {
    router.dismissAll()
  }

  // 同じレッスンをもう一度（復習）
  // dismissTo + push: スタックをセクション一覧まで戻してから新画面を開く
  // これにより「戻る」でセクション一覧に戻れる正しいスタック構造になる
  const handleRetry = () => {
    router.dismissTo(`/lesson/${params.courseId}`)
    router.push(`/lesson/${params.courseId}/${params.lessonId}`)
  }

  // 次のレッスンへ
  const nextLesson = getNextLesson(params.courseId, params.lessonId)

  const handleNextLesson = () => {
    if (nextLesson) {
      // dismissTo + push: スタックをセクション一覧まで戻してから次のレッスンを開く
      router.dismissTo(`/lesson/${params.courseId}`)
      router.push(`/lesson/${params.courseId}/${nextLesson.id}`)
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.background, { backgroundColor: palette.gameBackground }]}>
        <View style={styles.confettiContainer}>
          <Image
            source={confettiBackground}
            style={{ width: screenWidth, height: screenWidth * 1.5 }}
            resizeMode="cover"
          />
        </View>
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
        <View style={styles.spacerTop} />

        {/* 駒猫キャラクター（丸フレーム付き） */}
        <View style={styles.characterSection}>
          <View style={[styles.characterFrame, { backgroundColor: palette.greenLight }]}>
            <Image source={characterImage} style={styles.characterImage} resizeMode="contain" />
          </View>
        </View>

        {/* タイトルとメッセージ */}
        <View style={styles.messageSection}>
          <Text style={[styles.title, { color: palette.orange }]}>レッスン完了！</Text>
          <Text style={[styles.comment, { color: colors.text.secondary }]}>{getMessage()}</Text>
        </View>

        {/* 正答率プログレスバー */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.background.primary }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: isPerfect ? palette.green : palette.orange,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressPercent,
                { color: isPerfect ? palette.green : palette.orange },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>

        {/* 統計情報カード */}
        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: colors.background.primary }]}>
            <FontAwesome name="check-circle" size={18} color={palette.green} />
            <View style={styles.statValueRow}>
              <Text style={[styles.statValueMain, { color: colors.text.primary }]}>
                {correctCount}
              </Text>
              <Text style={[styles.statValueSub, { color: colors.text.secondary }]}>
                /{totalCount}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>正答数</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background.primary }]}>
            <FontAwesome name="clock-o" size={18} color={palette.orange} />
            <View style={styles.statValueRow}>
              <Text style={[styles.statValueTime, { color: colors.text.primary }]}>
                {timeString}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>完了時間</Text>
          </View>
          {/* TODO: ハートシステム実装後、実際の残り体力を表示する */}
          <View style={[styles.statCard, { backgroundColor: colors.background.primary }]}>
            <FontAwesome name="heart" size={18} color={palette.red} />
            <View style={styles.statValueRow}>
              <Text style={[styles.statValueMain, { color: colors.text.primary }]}>7</Text>
              <Text style={[styles.statValueSub, { color: colors.text.secondary }]}>/10</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>体力</Text>
          </View>
        </View>

        <View style={styles.spacerBottom} />

        {/* アクションボタン（ストリークチェック完了後に表示） */}
        {/* TODO: accessibilityLabel と accessibilityRole を追加する */}
        {isReady ? (
          <View style={styles.actions}>
            {!isPerfect && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { backgroundColor: colors.background.primary },
                ]}
                onPress={handleRetry}
              >
                <Text style={[styles.buttonText, { color: colors.text.primary }]}>
                  間違えた問題を復習
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: palette.orange }]}
              onPress={isPerfect && nextLesson ? handleNextLesson : handleGoHome}
            >
              <Text style={[styles.buttonText, { color: palette.white }]}>
                {isPerfect && nextLesson ? '次のレッスンへ' : '終了する'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <ActivityIndicator size="large" color={palette.orange} />
          </View>
        )}
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  spacerTop: {
    flex: 0.8,
  },
  characterSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  characterFrame: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  characterImage: {
    width: 200,
    height: 200,
    marginTop: 30,
  },
  messageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  comment: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '800',
    minWidth: 60,
    textAlign: 'right',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    height: 34,
    gap: 2,
  },
  statValueMain: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statValueSub: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  statValueTime: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  spacerBottom: {
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
