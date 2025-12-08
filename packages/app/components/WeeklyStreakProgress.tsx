/**
 * 週間ストリーク進捗コンポーネント
 * ホーム画面とストリーク更新画面で共通利用
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/components/useTheme'

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export interface DayProgress {
  date: number
  completed: boolean
}

interface WeeklyStreakProgressProps {
  /** 週間の進捗データ（月曜始まり、7日分） */
  weeklyProgress: DayProgress[]
  /** 今日のインデックス（0=月曜, 6=日曜） */
  todayIndex: number
  /** コンパクト表示（ホーム用） */
  compact?: boolean
  /** 今日の完了をアニメーションで表示 */
  animateTodayCheck?: boolean
}

export function WeeklyStreakProgress({
  weeklyProgress,
  todayIndex,
  compact = false,
  animateTodayCheck = false,
}: WeeklyStreakProgressProps) {
  const { colors, palette } = useTheme()

  // 今日のチェックアニメーション
  const animationProgress = useRef(new Animated.Value(0)).current
  // 前回のanimateTodayCheckの値を追跡
  const prevAnimateTodayCheck = useRef(false)

  useEffect(() => {
    // false → true の変化を検知したときのみアニメーション開始
    if (animateTodayCheck && !prevAnimateTodayCheck.current) {
      // 値を確実にリセット
      animationProgress.setValue(0)

      // アニメーション開始
      Animated.timing(animationProgress, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start()
    }

    prevAnimateTodayCheck.current = animateTodayCheck
  }, [animateTodayCheck, animationProgress])

  // アニメーション補間値
  const animatedBgColor = animationProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['transparent', palette.streakOrange, palette.streakOrange],
  })
  // コネクターは左から右に伸びるようにflexで制御
  const animatedConnectorFlex = animationProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 1],
  })
  const animatedCheckScale = animationProgress.interpolate({
    inputRange: [0, 0.5, 0.7, 1],
    outputRange: [0, 0, 1.2, 1],
  })
  const animatedCheckOpacity = animationProgress.interpolate({
    inputRange: [0, 0.5, 0.6, 1],
    outputRange: [0, 0, 1, 1],
  })

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.weekRow}>
        {DAY_LABELS.map((day, index) => {
          const dayData = weeklyProgress[index]
          const nextDayData = weeklyProgress[index + 1]
          const isToday = index === todayIndex
          const isFuture = index > todayIndex
          const showConnector = dayData?.completed && nextDayData?.completed

          // 今日のアニメーション対象かどうか
          const shouldAnimateToday = animateTodayCheck && isToday
          // 昨日→今日のコネクターをアニメーションするか
          const isYesterdayConnector = animateTodayCheck && index === todayIndex - 1 && dayData?.completed

          return (
            <View key={day} style={[
              styles.dayColumnWrapper,
              index === DAY_LABELS.length - 1 && styles.dayColumnWrapperLast,
            ]}>
              <View style={styles.dayColumn}>
                {/* 曜日ラベル */}
                <Text
                  style={[
                    styles.dayLabel,
                    compact && styles.dayLabelCompact,
                    { color: isToday ? palette.streakOrange : colors.text.secondary },
                    isToday && styles.dayLabelToday,
                  ]}
                >
                  {day}
                </Text>

                {/* 日付サークル */}
                {shouldAnimateToday ? (
                  <Animated.View
                    style={[
                      styles.dayCircle,
                      compact && styles.dayCircleCompact,
                      {
                        backgroundColor: animatedBgColor,
                        borderColor: palette.streakOrange,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Animated.View
                      style={{
                        transform: [{ scale: animatedCheckScale }],
                        opacity: animatedCheckOpacity,
                      }}
                    >
                      <FontAwesome
                        name="check"
                        size={compact ? 12 : 14}
                        color={palette.white}
                      />
                    </Animated.View>
                  </Animated.View>
                ) : (
                  <View
                    style={[
                      styles.dayCircle,
                      compact && styles.dayCircleCompact,
                      dayData?.completed
                        ? { backgroundColor: palette.streakOrange }
                        : isFuture
                          ? { backgroundColor: colors.border }
                          : {
                              backgroundColor: 'transparent',
                              borderColor: colors.border,
                              borderWidth: 2,
                            },
                      isToday && !dayData?.completed && {
                        borderColor: palette.streakOrange,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    {dayData?.completed ? (
                      <FontAwesome
                        name="check"
                        size={compact ? 12 : 14}
                        color={palette.white}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.dateText,
                          compact && styles.dateTextCompact,
                          {
                            color: isToday
                              ? palette.streakOrange
                              : colors.text.secondary,
                          },
                        ]}
                      >
                        {dayData?.date || ''}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* コネクター（最後の日以外） */}
              {index < DAY_LABELS.length - 1 && (
                isYesterdayConnector ? (
                  // 昨日→今日のコネクター：左から右に伸びるアニメーション
                  <View
                    style={[
                      styles.connectorWrapper,
                      compact && styles.connectorWrapperCompact,
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.connectorFill,
                        compact && styles.connectorFillCompact,
                        {
                          backgroundColor: palette.streakOrange,
                          flex: animatedConnectorFlex,
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.connector,
                      compact && styles.connectorCompact,
                      {
                        backgroundColor: showConnector
                          ? palette.streakOrange
                          : 'transparent',
                      },
                    ]}
                  />
                )
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  containerCompact: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dayColumnWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  dayColumnWrapperLast: {
    flex: 0,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  connector: {
    flex: 1,
    height: 6,
    marginBottom: 13,
    marginHorizontal: -4,
    borderRadius: 3,
  },
  connectorCompact: {
    height: 5,
    marginBottom: 11,
    marginHorizontal: -3,
  },
  // アニメーション用コネクターラッパー（左から右に伸びる）
  connectorWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    marginBottom: 13,
    marginHorizontal: -4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  connectorWrapperCompact: {
    height: 5,
    marginBottom: 11,
    marginHorizontal: -3,
  },
  connectorFill: {
    height: 6,
    borderRadius: 3,
  },
  connectorFillCompact: {
    height: 5,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayLabelCompact: {
    fontSize: 11,
  },
  dayLabelToday: {
    fontWeight: '700',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateTextCompact: {
    fontSize: 11,
  },
})
