import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, fonts } from '../constants/tokens';

export default function Button({ onPress, title, loading, disabled, variant = 'primary', style }) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={handlePress}
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
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  text: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
