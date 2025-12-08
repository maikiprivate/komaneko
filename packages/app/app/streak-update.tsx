/**
 * ストリーク更新画面
 *
 * その日の最初の学習完了時に表示されるフルスクリーン演出
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { WeeklyStreakProgress } from '@/components/WeeklyStreakProgress'
import {
  calculateWeeklyProgress,
  getStreakData,
  type WeeklyStreakInfo,
} from '@/lib/streak/streakStorage'

const characterImage = require('@/assets/images/character/sitting.png')

export default function StreakUpdateScreen() {
  const { colors, palette } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ count: string }>()
  const streakCount = Number(params.count) || 1

  // AsyncStorageからストリークデータを取得
  const [streakInfo, setStreakInfo] = useState<WeeklyStreakInfo | null>(null)

  useEffect(() => {
    const loadStreakData = async () => {
      const data = await getStreakData()
      const info = calculateWeeklyProgress(data)
      // 今日のデータをfalseにしてアニメーションで表示させる
      const modifiedProgress = info.weeklyProgress.map((day, index) => ({
        ...day,
        completed: index === info.todayIndex ? false : day.completed,
      }))
      setStreakInfo({
        ...info,
        weeklyProgress: modifiedProgress,
      })
    }
    loadStreakData()
  }, [])

  // 週間進捗のアニメーション開始フラグ（親アニメーション完了後にtrue）
  const [startWeeklyAnimation, setStartWeeklyAnimation] = useState(false)

  // アニメーション値
  const fireScale = useRef(new Animated.Value(0)).current
  const countScale = useRef(new Animated.Value(0)).current
  const cardSlide = useRef(new Animated.Value(50)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const buttonOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // アニメーション
    Animated.sequence([
      // 1. 火のアイコンがポップイン
      Animated.spring(fireScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      // 2. カウントがポップイン
      Animated.spring(countScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      // 3. カードがスライドイン
      Animated.parallel([
        Animated.spring(cardSlide, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // 4. ボタンがフェードイン
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 親アニメーション完了後に週間進捗のアニメーションを開始
      setStartWeeklyAnimation(true)
    })
  }, [fireScale, countScale, cardSlide, cardOpacity, buttonOpacity])

  const handleContinue = () => {
    router.back()
  }

  // 励ましメッセージ
  const getMessage = () => {
    if (!streakInfo) return ''
    // 今日を含めた完了日数（アニメーション前なので+1）
    const completedDays = streakInfo.weeklyProgress.filter(d => d.completed).length + 1
    if (completedDays >= 7) return 'パーフェクトウィーク達成にゃ！'
    if (streakInfo.todayIndex < 6) return 'この調子でパーフェクトウィークを目指すにゃ！'
    return '今週もよく頑張ったにゃ！'
  }

  // データ読み込み中は何も表示しない
  if (!streakInfo) {
    return null
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* 火のアイコン */}
          <Animated.View
            style={[
              styles.fireContainer,
              { transform: [{ scale: fireScale }] },
            ]}
          >
            <View style={[styles.fireCircle, { backgroundColor: palette.streakOrange }]}>
              <FontAwesome name="fire" size={48} color={palette.white} />
            </View>
          </Animated.View>

          {/* 駒猫キャラクター */}
          <View style={styles.characterContainer}>
            <Image
              source={characterImage}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </View>

          {/* カウント */}
          <Animated.View
            style={[
              styles.countContainer,
              { transform: [{ scale: countScale }] },
            ]}
          >
            <Text style={[styles.countNumber, { color: palette.streakOrange }]}>
              {streakCount}
            </Text>
            <Text style={[styles.countLabel, { color: colors.text.primary }]}>
              日連続！
            </Text>
          </Animated.View>

          {/* 週間進捗カード */}
          <Animated.View
            style={[
              styles.weekCard,
              {
                backgroundColor: colors.card.background,
                transform: [{ translateY: cardSlide }],
                opacity: cardOpacity,
              },
            ]}
          >
            <WeeklyStreakProgress
              weeklyProgress={streakInfo.weeklyProgress}
              todayIndex={streakInfo.todayIndex}
              animateTodayCheck={startWeeklyAnimation}
            />
            <View style={[styles.messageDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.messageText, { color: colors.text.secondary }]}>
              {getMessage()}
            </Text>
          </Animated.View>

          <View style={styles.spacer} />

          {/* 続けるボタン */}
          <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.orange }]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: palette.white }]}>
                続ける
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fireContainer: {
    marginBottom: 8,
  },
  fireCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    fontSize: 64,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: -2,
  },
  countLabel: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    marginLeft: 8,
  },
  weekCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  characterContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  characterImage: {
    width: 220,
    height: 220,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
