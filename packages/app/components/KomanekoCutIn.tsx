/**
 * 駒猫カットインコンポーネント
 * Duolingo風のキャラクター演出UI
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/components/useTheme'

const characterImage = require('@/assets/images/character/peek.png')

interface KomanekoCutInProps {
  /** 表示するメッセージ */
  message: string
  /** 表示するかどうか */
  visible: boolean
}

export function KomanekoCutIn({ message, visible }: KomanekoCutInProps) {
  const { colors, palette } = useTheme()
  const slideAnim = useRef(new Animated.Value(-300)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  // フェードアウト中にメッセージが消えないよう、最後のメッセージを保持
  const [displayedMessage, setDisplayedMessage] = useState(message)

  // メッセージが変更されたら更新（空文字の場合は前の値を維持）
  useEffect(() => {
    if (message) {
      setDisplayedMessage(message)
    }
  }, [message])

  useEffect(() => {
    if (visible) {
      // アニメーション値をリセット
      slideAnim.setValue(-300)
      scaleAnim.setValue(0.8)
      opacityAnim.setValue(0)

      // スライドイン + スケールアップ
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // フェードアウト
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, slideAnim, scaleAnim, opacityAnim])

  // 非表示でもアニメーションのためにレンダリング（opacityで制御）
  return (
    <Animated.View
      style={[styles.overlay, { opacity: opacityAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* キャラクター */}
        <View style={styles.characterContainer}>
          <Image source={characterImage} style={styles.characterIcon} resizeMode="contain" />
        </View>

        {/* 吹き出し */}
        <View style={[styles.bubble, { backgroundColor: palette.white }]}>
          <View style={[styles.bubbleTail, { borderRightColor: palette.white }]} />
          <Text style={[styles.message, { color: colors.text.primary }]}>
            {displayedMessage}
          </Text>
        </View>
      </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: '95%',
  },
  characterContainer: {
    marginRight: -20,
    zIndex: 1,
  },
  characterIcon: {
    width: 120,
    height: 120,
  },
  bubble: {
    flex: 1,
    paddingLeft: 36,
    paddingRight: 24,
    paddingVertical: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleTail: {
    position: 'absolute',
    left: -12,
    top: '50%',
    marginTop: -12,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  message: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
})
