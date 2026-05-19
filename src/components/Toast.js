import { View, Text, StyleSheet } from 'react-native';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function ToastContainer() {
  const { toasts } = useToast();
  const { colors } = useTheme();

  if (!toasts.length) return null;

  return (
    <View style={styles.container}>
      {toasts.map(toast => (
        <View
          key={toast.id}
          style={[styles.toast, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}
        >
          <Text style={{ color: toast.type === 'error' ? colors.red : colors.green, fontSize: 14, marginRight: 8 }}>
            {toast.type === 'error' ? '✕' : '✓'}
          </Text>
          <Text style={{ color: colors.text1, fontSize: 14 }}>{toast.msg}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    left: 16,
    zIndex: 999,
    alignItems: 'flex-end',
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
