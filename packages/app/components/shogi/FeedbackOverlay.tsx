/**
 * 正解/不正解フィードバック表示
 *
 * ○×を画面中央に表示し、アニメーション後に自動で非表示
 */

import { useEffect, useRef, useCallback } from 'react'
import { Animated, StyleSheet } from 'react-native'

import { useTheme } from '@/components/useTheme'

/** フィードバックの種類 */
export type FeedbackType = 'none' | 'correct' | 'incorrect'

interface FeedbackOverlayProps {
  /** フィードバックタイプ */
  type: FeedbackType
  /** 非表示完了時のコールバック */
  onComplete?: () => void
}

export function FeedbackOverlay({ type, onComplete }: FeedbackOverlayProps) {
  const { colors, palette } = useTheme()

  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.5)).current

  const animate = useCallback(() => {
    opacity.setValue(0)
    scale.setValue(0.5)

    // 表示アニメーション
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start()

    // 1秒後に非表示アニメーション
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onComplete?.()
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [opacity, scale, onComplete])

  useEffect(() => {
    if (type !== 'none') {
      const cleanup = animate()
      return cleanup
    }
  }, [type, animate])

  if (type === 'none') {
    return null
  }

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Animated.Text
        style={[
          styles.symbol,
          {
            color: type === 'correct' ? palette.correctFeedback : colors.gamification.error,
            transform: [{ scale }],
          },
        ]}
      >
        {type === 'correct' ? '○' : '×'}
      </Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  symbol: {
    fontSize: 280,
    fontWeight: 'bold',
  },
})
