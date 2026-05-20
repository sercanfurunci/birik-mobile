import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { authenticateWithBiometrics } from '../../utils/biometric';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API } from '../../utils/api';

export default function LoginScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { handleAuthSuccess, pendingBioUser, completeBioLogin } = useAuth();

  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBioLogin = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) completeBioLogin();
  };

  useEffect(() => {
    if (pendingBioUser) handleBioLogin();
  }, []);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const body = loginMethod === 'email' ? { email, password } : { phone, password };
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? t('loginInvalidCredentials') : t('serverError'));
        return;
      }
      if (!data?.user) { setError(t('serverError')); return; }
      await handleAuthSuccess(data.user, data.token);
    } catch {
      setError(t('serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
            style={styles.backBtn}
          >
            <Text style={{ color: colors.text3, fontSize: 14 }}>← {t('backToLanding')}</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={styles.brand}>
            <Image source={require('../../../assets/birik-icon-fg.png')} style={styles.brandIcon} />
            <Text style={[styles.brandName, { color: colors.text1 }]}>{t('appName')}</Text>
            <Text style={[styles.brandSub, { color: colors.text3 }]}>{t('appSubtitle')}</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text1 }]}>{t('signInTitle')}</Text>

            {/* Method toggle */}
            <View style={[styles.toggle, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              {['email', 'sms'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => { setLoginMethod(m); setError(''); }}
                  style={[styles.toggleBtn, loginMethod === m && { backgroundColor: colors.brand }]}
                >
                  <Text style={[styles.toggleText, { color: loginMethod === m ? '#fff' : colors.text3 }]}>
                    {m === 'email' ? t('verifyMethodEmail') : t('verifyMethodSms')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loginMethod === 'email' ? (
              <Input label={t('email')} value={email} onChangeText={setEmail} placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: 16 }} />
            ) : (
              <Input label={t('phoneNumber')} value={phone} onChangeText={setPhone} placeholder={t('phonePlaceholder')} keyboardType="phone-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />
            )}

            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{t('password')}</Text>
                {loginMethod === 'email' && (
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={{ color: colors.brand, fontSize: 13, fontWeight: '600' }}>{t('forgotPassword')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Input value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}44` }]}>
                <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <Button title={loading ? t('signingIn') : t('signInBtn')} onPress={handleSubmit} loading={loading} style={{ marginTop: 16 }} />

            {!!pendingBioUser && (
              <TouchableOpacity onPress={handleBioLogin} style={styles.bioRow} activeOpacity={0.7}>
                <View style={[styles.bioBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                  <Ionicons name="finger-print" size={26} color={colors.brand} />
                </View>
                <Text style={[styles.bioLabel, { color: colors.text3 }]}>{t('bioUnlockBtn')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.text2, fontSize: 14 }}>{t('noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: colors.brand, fontSize: 14, fontWeight: '600' }}>{t('registerLink')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  backBtn: { marginBottom: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandIcon: { width: 96, height: 96, marginBottom: 4 },
  brandName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  brandSub: { fontSize: 14, marginTop: 4 },
  card: { padding: 24, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 20 },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 4, borderWidth: 1, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bioRow: { alignItems: 'center', marginTop: 20, gap: 8 },
  bioBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  bioLabel: { fontSize: 12 },
});
