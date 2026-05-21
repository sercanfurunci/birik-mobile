import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { API } from '../../utils/api';
import { spacing, radius, type, fonts } from '../../constants/tokens';

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, padding: spacing.xl }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: spacing['3xl'] }}>
          <Text style={{ color: colors.text3, fontFamily: fonts.body, fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="mail-outline" size={56} color={colors.brand} style={{ marginBottom: spacing.xl }} />
            <Text style={{ ...type.h2Serif, fontSize: 24, color: colors.text1, marginBottom: spacing.md }}>{t('resetEmailSent')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.brand, fontFamily: fonts.bodySemibold, fontSize: 15 }}>{t('backToSignIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text1 }]}>{t('forgotPasswordTitle')}</Text>
            <Text style={[styles.desc, { color: colors.text2 }]}>{t('forgotPasswordDesc')}</Text>
            <Input label={t('email')} value={email} onChangeText={setEmail} placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: spacing.lg }} />
            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}44` }]}>
                <Text style={{ color: colors.red, ...type.small, fontSize: 13 }}>{error}</Text>
              </View>
            )}
            <Button title={loading ? t('sendingResetLink') : t('sendResetLink')} onPress={handleSend} loading={loading} disabled={!email.trim()} style={{ marginTop: spacing.md }} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing['2xl'], borderRadius: radius.lg + 2, borderWidth: 1 },
  title: { ...type.h2Serif, fontSize: 22, marginBottom: spacing.sm },
  desc: { ...type.body, fontSize: 14, lineHeight: 20, marginBottom: spacing.xl },
  errorBox: { padding: spacing.md, borderRadius: radius.sm + 2, borderWidth: 1, marginTop: spacing.sm },
});
