import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API } from '../../utils/api';
import { spacing, radius, type, fonts } from '../../constants/tokens';
import { startPhoneVerification } from '../../utils/firebaseAuth';

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
      <Text style={{ color: strengthColor, ...type.label, fontSize: 10 }}>{strengthLabel}</Text>
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const pwError = validatePassword(password, t);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError(t('passwordMismatch')); return; }

    if (verifyMethod === 'sms') {
      const trimmed = phone.trim();
      if (!/^\+[1-9]\d{6,14}$/.test(trimmed)) { setError(t('invalidPhone')); return; }
      setLoading(true);
      try {
        await startPhoneVerification(trimmed);
        navigation.navigate('VerifyPhone', { phone: trimmed, password });
      } catch {
        setError(t('phoneSendError'));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.green} style={{ marginBottom: spacing.xl }} />
          <Text style={{ ...type.h2Serif, fontSize: 24, color: colors.text1, marginBottom: spacing.md, textAlign: 'center' }}>
            {verifyMethod === 'email' ? t('checkYourEmail') : t('accountCreated')}
          </Text>
          {verifyMethod === 'email' && (
            <Text style={{ ...type.body, fontSize: 14, color: colors.text2, textAlign: 'center', marginBottom: spacing.sm }}>
              {t('verificationSent')} {email}
            </Text>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing['2xl'] }}>
            <Text style={{ color: colors.brand, fontFamily: fonts.bodySemibold, fontSize: 15 }}>{t('backToSignIn')}</Text>
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
            <Text style={{ color: colors.text3, fontFamily: fonts.body, fontSize: 14 }}>← {t('backToLanding')}</Text>
          </TouchableOpacity>

          <View style={styles.brand}>
            <Image source={require('../../../assets/birik-icon-fg.png')} style={styles.brandIcon} />
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
                <Text style={{ color: colors.red, ...type.small, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setTermsAccepted(v => !v)} style={styles.termsRow} activeOpacity={0.7}>
              <View style={[styles.checkbox, { borderColor: termsAccepted ? colors.brand : colors.border, backgroundColor: termsAccepted ? colors.brand : 'transparent' }]}>
                {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ color: colors.text2, ...type.small, fontSize: 13, flex: 1, lineHeight: 18 }}>
                {t('registerAgreePrefix')}{' '}
                <Text style={{ color: colors.brand, textDecorationLine: 'underline' }} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>{t('termsOfService')}</Text>
                {' '}{t('registerAnd')}{' '}
                <Text style={{ color: colors.brand, textDecorationLine: 'underline' }} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>{t('privacyPolicy')}</Text>
                {' '}{t('registerAgreeAccept')}
              </Text>
            </TouchableOpacity>

            <Button title={loading ? t('creatingAccount') : t('createAccountBtn')} onPress={handleSubmit} loading={loading} disabled={!termsAccepted} style={{ marginTop: 16, opacity: termsAccepted ? 1 : 0.4 }} />
          </View>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.text2, fontFamily: fonts.body, fontSize: 14 }}>{t('alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.brand, fontFamily: fonts.bodySemibold, fontSize: 14 }}>{t('signInLink')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], paddingTop: spacing.sm },
  backBtn: { marginBottom: spacing['2xl'] },
  brand: { alignItems: 'center', marginBottom: spacing['3xl'] },
  brandIcon: { width: 96, height: 96, marginBottom: spacing.xs },
  brandName: { ...type.h1Serif, fontSize: 28 },
  brandSub: { ...type.body, fontSize: 14, marginTop: spacing.xs },
  card: { padding: spacing['2xl'], borderRadius: radius.lg + 2, borderWidth: 1, marginBottom: spacing.xl },
  cardTitle: { ...type.h2Serif, fontSize: 20, marginBottom: spacing.xl },
  toggle: { flexDirection: 'row', borderRadius: radius.sm + 2, padding: spacing.xs, borderWidth: 1, marginBottom: spacing.xl, gap: spacing.xs },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  toggleText: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  errorBox: { padding: spacing.md, borderRadius: radius.sm + 2, borderWidth: 1, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, marginTop: spacing.lg },
  checkbox: { width: 20, height: 20, borderRadius: radius.sm - 3, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
});
