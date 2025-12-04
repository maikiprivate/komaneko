/**
 * 成り選択ダイアログ
 *
 * 駒を成るか成らないかを選択するダイアログ
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/components/useTheme'

interface PromotionDialogProps {
  /** ダイアログを表示するか */
  visible: boolean
  /** 成り/不成りを選択した時のコールバック */
  onSelect: (promote: boolean) => void
}

export function PromotionDialog({ visible, onSelect }: PromotionDialogProps) {
  const { colors, palette } = useTheme()

  if (!visible) {
    return null
  }

  return (
    <View style={styles.overlay}>
      <View style={[styles.dialog, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          成りますか？
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.orange }]}
            onPress={() => onSelect(true)}
          >
            <Text style={[styles.buttonText, { color: palette.white }]}>成る</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => onSelect(false)}
          >
            <Text style={[styles.buttonText, { color: colors.text.primary }]}>不成</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 200,
  },
  dialog: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
