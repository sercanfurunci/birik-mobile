import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { authenticateWithBiometrics } from '../utils/biometric';

export default function BioLockScreen({ user, onUnlock, onSignOut }) {
  const { colors } = useTheme();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);

  const tryUnlock = async () => {
    if (loading) return;
    setLoading(true);
    const ok = await authenticateWithBiometrics();
    setLoading(false);
    if (ok) onUnlock();
  };

  const displayName = user?.username || user?.email?.split('@')[0] || '';

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <Image source={require('../../assets/birik-icon-fg.png')} style={s.logo} />
      <Text style={[s.appName, { color: colors.text1 }]}>Birik</Text>

      {!!displayName && (
        <Text style={[s.greeting, { color: colors.text3 }]}>
          {displayName}
        </Text>
      )}

      <TouchableOpacity
        onPress={tryUnlock}
        activeOpacity={0.8}
        style={[s.unlockBtn, { backgroundColor: colors.brand }]}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.unlockBtnText}>{t('bioUnlockBtn')}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={onSignOut} activeOpacity={0.7} style={s.signOutLink}>
        <Text style={[s.signOutText, { color: colors.text3 }]}>{t('bioUsePassword')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  logo: { width: 110, height: 110, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  greeting: { fontSize: 15, marginBottom: 48 },
  unlockBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  unlockBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signOutLink: { paddingVertical: 8 },
  signOutText: { fontSize: 14 },
});
