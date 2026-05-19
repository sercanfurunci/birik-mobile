import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API } from '../../utils/api';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else setError(t('serverError'));
    } catch {
      setError(t('serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, padding: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <Text style={{ color: colors.text3, fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>📧</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text1, marginBottom: 12 }}>{t('resetEmailSent')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.brand, fontSize: 15, fontWeight: '600' }}>{t('backToSignIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text1 }]}>{t('forgotPasswordTitle')}</Text>
            <Text style={[styles.desc, { color: colors.text2 }]}>{t('forgotPasswordDesc')}</Text>
            <Input label={t('email')} value={email} onChangeText={setEmail} placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: 16 }} />
            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}44` }]}>
                <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
              </View>
            )}
            <Button title={loading ? t('sendingResetLink') : t('sendResetLink')} onPress={handleSend} loading={loading} disabled={!email.trim()} style={{ marginTop: 12 }} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 18, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
});
