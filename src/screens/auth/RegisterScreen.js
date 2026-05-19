import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API } from '../../utils/api';

function validatePassword(password, t) {
  if (password.length < 8) return t('passwordTooShort');
  if (!/[A-Z]/.test(password)) return t('passwordNeedsUpper');
  if (!/[0-9]/.test(password)) return t('passwordNeedsNumber');
  return null;
}

function PasswordStrength({ password, colors }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)];
  const count = checks.filter(Boolean).length;
  const strengthColor = count === 3 ? colors.green : count >= 2 ? colors.gold : colors.red;
  const strengthLabel = count === 3 ? 'Strong' : count >= 2 ? 'Fair' : 'Weak';

  if (!password) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < count ? strengthColor : colors.border }} />
        ))}
      </View>
      <Text style={{ color: strengthColor, fontSize: 11, fontWeight: '600' }}>{strengthLabel}</Text>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();

  const [verifyMethod, setVerifyMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'done'

  const handleSubmit = async () => {
    setError('');
    const pwError = validatePassword(password, t);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError(t('passwordMismatch')); return; }
    setLoading(true);
    try {
      const body = verifyMethod === 'email'
        ? { email, password }
        : { phone, password };
      const endpoint = verifyMethod === 'email' ? '/auth/register' : '/auth/register-phone';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      setStep('done');
    } catch {
      setError(t('serverError'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>✅</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text1, marginBottom: 12, textAlign: 'center' }}>
            {verifyMethod === 'email' ? t('checkYourEmail') : t('accountCreated')}
          </Text>
          {verifyMethod === 'email' && (
            <Text style={{ fontSize: 14, color: colors.text2, textAlign: 'center', marginBottom: 8 }}>
              {t('verificationSent')} {email}
            </Text>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 24 }}>
            <Text style={{ color: colors.brand, fontSize: 15, fontWeight: '600' }}>{t('backToSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ color: colors.text3, fontSize: 14 }}>← {t('backToLanding')}</Text>
          </TouchableOpacity>

          <View style={styles.brand}>
            <Text style={[styles.brandIcon, { color: colors.brand }]}>⬡</Text>
            <Text style={[styles.brandName, { color: colors.text1 }]}>{t('appName')}</Text>
            <Text style={[styles.brandSub, { color: colors.text3 }]}>{t('appSubtitle')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text1 }]}>{t('createAccountTitle')}</Text>

            <View style={[styles.toggle, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              {['email', 'sms'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => { setVerifyMethod(m); setError(''); }}
                  style={[styles.toggleBtn, verifyMethod === m && { backgroundColor: colors.brand }]}
                >
                  <Text style={[styles.toggleText, { color: verifyMethod === m ? '#fff' : colors.text3 }]}>
                    {m === 'email' ? t('verifyMethodEmail') : t('verifyMethodSms')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {verifyMethod === 'email' ? (
              <Input label={t('email')} value={email} onChangeText={setEmail} placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: 16 }} />
            ) : (
              <Input label={t('phoneNumber')} value={phone} onChangeText={setPhone} placeholder={t('phonePlaceholder')} keyboardType="phone-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />
            )}

            <View style={{ marginBottom: 16 }}>
              <Input label={t('password')} value={password} onChangeText={setPassword} placeholder={t('passwordPlaceholder')} secureTextEntry autoCapitalize="none" />
              <PasswordStrength password={password} colors={colors} />
            </View>

            <Input label={t('confirmPassword')} value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry autoCapitalize="none" style={{ marginBottom: 16 }} />

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}44` }]}>
                <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <Button title={loading ? t('creatingAccount') : t('createAccountBtn')} onPress={handleSubmit} loading={loading} style={{ marginTop: 16 }} />
          </View>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.text2, fontSize: 14 }}>{t('alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.brand, fontSize: 14, fontWeight: '600' }}>{t('signInLink')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legalRow}>
            <Text style={{ color: colors.text3, fontSize: 12 }}>{t('registerAgreeTerms')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
              <Text style={{ color: colors.text3, fontSize: 12, textDecorationLine: 'underline' }}>{t('termsOfService')}</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text3, fontSize: 12 }}> {t('registerAnd')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
              <Text style={{ color: colors.text3, fontSize: 12, textDecorationLine: 'underline' }}>{t('privacyPolicy')}</Text>
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
  brandIcon: { fontSize: 40, marginBottom: 8 },
  brandName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  brandSub: { fontSize: 14, marginTop: 4 },
  card: { padding: 24, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 20 },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 4, borderWidth: 1, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '600' },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 16 },
});
