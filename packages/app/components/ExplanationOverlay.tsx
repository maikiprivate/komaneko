/**
 * 解説オーバーレイコンポーネント（ボトムシート形式）
 *
 * 問題正解後に画面下部からスライドアップして表示。
 * 駒猫が解説を表示する。
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useEffect, useRef } from 'react'
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  const insets = useSafeAreaInsets()

  const translateY = useRef(new Animated.Value(400)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // 表示アニメーション（下からスライドアップ）
      translateY.setValue(400)
      backdropOpacity.setValue(0)

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, translateY, backdropOpacity])

  if (!visible) {
    return null
  }

  return (
    <View style={styles.overlay}>
      {/* 半透明背景 */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: Animated.multiply(backdropOpacity, 0.3) },
        ]}
      />

      {/* ボトムシート */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: palette.correctLight,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* 正解ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.checkIcon, { backgroundColor: palette.correctFeedback }]}>
              <FontAwesome name="check" size={16} color="#fff" />
            </View>
            <Text style={[styles.headerText, { color: palette.correctFeedback }]}>
              正解！
            </Text>
          </View>
        </View>

        {/* 解説カード */}
        <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
          <Image
            source={characterImage}
            style={styles.characterImage}
            resizeMode="contain"
          />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: palette.orange }]}>
              駒猫のワンポイント
            </Text>
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
            {isLastProblem ? '完了' : '次の問題へ'}
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
    justifyContent: 'flex-end',
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
  bottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  characterImage: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 24,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
})
