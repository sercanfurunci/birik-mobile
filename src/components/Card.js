import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow } from '../constants/tokens';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md + 2,
    borderWidth: 1,
    ...shadow.sm,
  },
});
