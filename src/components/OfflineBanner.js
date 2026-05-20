import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const { pendingCount } = useAuth();
  const { t } = useLang();

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: isOnline ? '#2d7a3a' : '#7a2d2d' }]}>
      <Text style={styles.text}>
        {isOnline
          ? `${t('offlineSyncing')} (${pendingCount})`
          : pendingCount > 0
            ? `${t('offlineMode')} · ${pendingCount} ${t('offlinePending')}`
            : t('offlineMode')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
