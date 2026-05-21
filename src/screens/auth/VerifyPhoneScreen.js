import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { spacing, radius, type, fonts } from '../../constants/tokens';
import Button from '../../components/Button';
import { API } from '../../utils/api';
import {
  confirmCode, startPhoneVerification, hasConfirmation, clearConfirmation,
} from '../../utils/firebaseAuth';

const RESEND_COOLDOWN = 30;

export default function VerifyPhoneScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { phone, password } = route.params || {};

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setCooldown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => { clearConfirmation(); };
  }, []);

  const handleVerify = async () => {
    setError('');
    if (code.length < 6) { setError(t('invalidOtp')); return; }
    if (!hasConfirmation()) { setError(t('phoneSendError')); return; }
    setLoading(true);
    try {
      const firebaseToken = await confirmCode(code);
      const res = await fetch(`${API}/auth/register-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, firebaseToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('serverError')); return; }
      clearConfirmation();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { justRegistered: true, phone } }],
      });
    } catch (e) {
      setError(t('invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await startPhoneVerification(phone);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError(t('phoneSendError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text2} />
            <Text style={{ color: colors.text3, fontFamily: fonts.body, fontSize: 14 }}>{t('backToLanding')}</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.brandDim }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.brand} />
            </View>

            <Text style={[styles.title, { color: colors.text1 }]}>{t('otpCode')}</Text>
            <Text style={[styles.sub, { color: colors.text3 }]}>
              {t('smsSent')} {phone}
            </Text>

            <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.codeRow}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View
                  key={i}
                  style={[styles.codeBox, { borderColor: code.length === i ? colors.brand : colors.border, backgroundColor: colors.surface2 }]}
                >
                  <Text style={[styles.codeChar, { color: colors.text1 }]}>{code[i] || ''}</Text>
                </View>
              ))}
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              style={styles.hiddenInput}
              caretHidden
            />

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}44` }]}>
                <Text style={{ color: colors.red, ...type.small, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <Button
              title={loading ? t('verifyingCode') : t('verifyAndCreate')}
              onPress={handleVerify}
              loading={loading}
              disabled={code.length < 6}
              style={{ marginTop: spacing.lg, opacity: code.length < 6 ? 0.5 : 1 }}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || resending}
              style={{ alignSelf: 'center', marginTop: spacing.lg }}
            >
              <Text style={{
                color: cooldown > 0 ? colors.text3 : colors.brand,
                fontFamily: fonts.bodySemibold, fontSize: 13,
              }}>
                {cooldown > 0 ? t('resendIn', { sec: cooldown }) : t('resendCode')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing['2xl'] },
  card: { padding: spacing['2xl'], borderRadius: radius.lg + 2, borderWidth: 1 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: { ...type.h2Serif, fontSize: 22, textAlign: 'center', marginBottom: spacing.xs },
  sub: { ...type.body, fontSize: 14, textAlign: 'center', marginBottom: spacing['2xl'] },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
  codeBox: {
    flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  codeChar: { fontFamily: fonts.monoMedium, fontSize: 22 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  errorBox: { padding: spacing.md, borderRadius: radius.sm + 2, borderWidth: 1, marginTop: spacing.sm },
});
