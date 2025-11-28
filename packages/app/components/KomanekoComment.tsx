/**
 * 駒猫コメントコンポーネント
 * Duolingoチェス風のキャラクター + 吹き出しUI
 */

import { Image, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/components/useTheme'

const characterImages = {
  sitting: require('@/assets/images/character/sitting.png'),
  peek: require('@/assets/images/character/peek.png'),
}

type CharacterVariant = keyof typeof characterImages

interface KomanekoCommentProps {
  message: string
  variant?: CharacterVariant
}

export function KomanekoComment({ message, variant = 'sitting' }: KomanekoCommentProps) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <Image source={characterImages[variant]} style={styles.characterIcon} resizeMode="contain" />
      <View style={styles.bubbleWrapper}>
        {/* 吹き出しの三角形（しっぽ）- 枠線用と塗りつぶし用の2層 */}
        <View style={styles.tailWrapper}>
          <View style={[styles.bubbleTailBorder, { borderRightColor: colors.border }]} />
          <View style={[styles.bubbleTailFill, { borderRightColor: colors.card.background }]} />
        </View>
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.card.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.message, { color: colors.text.primary }]}>{message}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  characterIcon: {
    width: 80,
    height: 80,
  },
  bubbleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  tailWrapper: {
    width: 10,
    height: 20,
    marginRight: -1,
    zIndex: 1,
  },
  bubbleTailBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubbleTailFill: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubble: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
})
