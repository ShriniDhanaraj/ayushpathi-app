import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '@/lib/colors'

interface Props {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
}

export default function Button({ label, onPress, disabled, loading, variant = 'primary', fullWidth = true }: Props) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        fullWidth && { width: '100%' },
      ]}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? colors.white : colors.brand[600]} size="small" />
        : <Text style={[styles.label, !isPrimary && styles.labelSecondary]}>{label}</Text>
      }
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: colors.brand[600] },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.gray[200] },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '600', color: colors.white },
  labelSecondary: { color: colors.gray[700] },
})
