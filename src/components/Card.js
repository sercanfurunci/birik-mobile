import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
