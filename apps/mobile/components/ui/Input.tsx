import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { colors } from '@/lib/colors'

interface Props extends TextInputProps {
  label: string
  error?: string
  secureToggle?: boolean
}

export default function Input({ label, error, secureToggle, style, ...props }: Props) {
  const [hidden, setHidden] = useState(true)

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, error ? styles.inputError : undefined, style]}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={secureToggle ? hidden : props.secureTextEntry}
          {...props}
        />
        {secureToggle && (
          <Pressable onPress={() => setHidden(h => !h)} style={styles.eye}>
            <Text style={styles.eyeText}>{hidden ? '👁' : '🙈'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: colors.gray[700] },
  row: { position: 'relative' },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.red[700] },
  eye: { position: 'absolute', right: 14, top: 12 },
  eyeText: { fontSize: 16 },
  error: { fontSize: 12, color: colors.red[700] },
})
