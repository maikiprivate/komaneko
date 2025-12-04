/**
 * ゲーム画面共通フッター
 *
 * 詰将棋・駒塾で共通のアクションボタン（やり直し/ヒント/解答）を提供
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/components/useTheme'

interface GameFooterProps {
  /** やり直しボタン押下時 */
  onReset: () => void
  /** ヒントボタン押下時 */
  onHint: () => void
  /** 解答ボタン押下時 */
  onSolution: () => void
  /** ボタンを無効化するか */
  disabled?: boolean
}

export function GameFooter({ onReset, onHint, onSolution, disabled = false }: GameFooterProps) {
  const { colors, palette } = useTheme()

  const disabledOpacity = disabled ? 0.4 : 1

  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: colors.background.primary, borderTopColor: palette.orange },
      ]}
    >
      <TouchableOpacity
        style={[styles.actionButton, { opacity: disabledOpacity }]}
        onPress={onReset}
        disabled={disabled}
      >
        <FontAwesome name="refresh" size={20} color={colors.gamification.success} />
        <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>やり直し</Text>
      </TouchableOpacity>
      <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
      <TouchableOpacity
        style={[styles.actionButton, { opacity: disabledOpacity }]}
        onPress={onHint}
        disabled={disabled}
      >
        <FontAwesome name="lightbulb-o" size={20} color={palette.orange} />
        <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>ヒント</Text>
      </TouchableOpacity>
      <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
      <TouchableOpacity
        style={[styles.actionButton, { opacity: disabledOpacity }]}
        onPress={onSolution}
        disabled={disabled}
      >
        <FontAwesome name="key" size={20} color={colors.gamification.heart} />
        <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>解答</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerDivider: {
    width: 1,
    height: 32,
  },
})
