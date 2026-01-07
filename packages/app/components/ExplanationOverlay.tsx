/**
 * 解説オーバーレイコンポーネント
 *
 * 問題正解後に駒猫が解説を表示する。
 * 解説文が空の場合は表示しない。
 */

import { useEffect, useRef } from 'react'
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useTheme } from '@/components/useTheme'

const characterImage = require('@/assets/images/character/sitting.png')

interface ExplanationOverlayProps {
  /** 表示するかどうか */
  visible: boolean
  /** 解説文 */
  explanation: string
  /** 次へ押下時のコールバック */
  onNext: () => void
  /** 最後の問題かどうか（ボタンラベル切り替え用） */
  isLastProblem: boolean
}

export function ExplanationOverlay({
  visible,
  explanation,
  onNext,
  isLastProblem,
}: ExplanationOverlayProps) {
  const { colors, palette } = useTheme()

  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    if (visible) {
      // 表示アニメーション
      opacity.setValue(0)
      translateY.setValue(20)

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, opacity, translateY])

  if (!visible) {
    return null
  }

  return (
    <View style={styles.overlay}>
      {/* 半透明背景 */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: Animated.multiply(opacity, 0.6) },
        ]}
      />

      {/* コンテンツ */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* 駒猫キャラクター */}
        <Image
          source={characterImage}
          style={styles.characterImage}
          resizeMode="contain"
        />

        {/* 吹き出し */}
        <View style={styles.bubbleContainer}>
          <View style={styles.tailWrapper}>
            <View
              style={[styles.bubbleTailBorder, { borderBottomColor: colors.border }]}
            />
            <View
              style={[styles.bubbleTailFill, { borderBottomColor: colors.card.background }]}
            />
          </View>
          <View
            style={[
              styles.bubble,
              { backgroundColor: colors.card.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.explanationText, { color: colors.text.primary }]}>
              {explanation}
            </Text>
          </View>
        </View>

        {/* 次へボタン */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: palette.orange }]}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastProblem ? '完了' : '次へ'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
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
    zIndex: 200,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: 360,
  },
  characterImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  bubbleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  tailWrapper: {
    width: 20,
    height: 12,
    marginBottom: -1,
    zIndex: 1,
  },
  bubbleTailBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleTailFill: {
    position: 'absolute',
    top: 2,
    left: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubble: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  nextButton: {
    marginTop: 20,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})
