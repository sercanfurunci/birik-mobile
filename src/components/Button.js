import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Button({ onPress, title, loading, disabled, variant = 'primary', style }) {
  const { colors } = useTheme();

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        isPrimary && { backgroundColor: colors.brand },
        isSecondary && { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.text2} size="small" />
      ) : (
        <Text style={[
          styles.text,
          isPrimary && { color: '#fff' },
          isSecondary && { color: colors.text2 },
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
