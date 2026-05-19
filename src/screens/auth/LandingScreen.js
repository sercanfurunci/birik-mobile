import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';

export default function LandingScreen({ navigation }) {
  const { colors, toggleTheme, isDark } = useTheme();
  const { t, lang, toggleLang } = useLang();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={[styles.logo, { color: colors.brand }]}>⬡</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={toggleLang} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text2, fontSize: 12, fontWeight: '600' }}>{lang === 'en' ? 'TR' : 'EN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 14 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.tag, { backgroundColor: colors.brandDim }]}>
            <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '600' }}>{t('landingTagline')}</Text>
          </View>

          <Text style={[styles.headline, { color: colors.text1 }]}>
            {t('landingHeadline1')}{'\n'}
            <Text style={{ color: colors.brand }}>{t('landingHeadline2')}</Text>
          </Text>

          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            {t('landingSubtitle')}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={[styles.primaryBtn, { backgroundColor: colors.brand }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{t('landingGetStarted')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text2 }]}>{t('landingSignIn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        {[
          { icon: '⚡', title: 'Add a transaction in seconds', desc: 'Type a description, enter the amount, pick a category.' },
          { icon: '📊', title: 'See your spending at a glance', desc: 'Dashboard shows balance, recent activity, and 30-day breakdown.' },
          { icon: '🎯', title: 'Set savings goals', desc: 'Create goals and watch the progress bar fill up as you save.' },
          { icon: '🔄', title: 'Track subscriptions', desc: 'Never lose track of recurring services and billing dates.' },
        ].map((f, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text1 }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.text3 }]}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* CTA */}
        <View style={[styles.cta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.ctaTitle, { color: colors.text1 }]}>Start tracking today.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={[styles.primaryBtn, { backgroundColor: colors.brand }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{t('landingGetStarted')}</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text3, fontSize: 12, marginTop: 8 }}>Free forever · No credit card</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 40 },
  logo: { fontSize: 28, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', marginBottom: 40 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  headline: { fontSize: 44, fontWeight: '700', textAlign: 'center', lineHeight: 50, marginBottom: 16, letterSpacing: -1 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 20 },
  primaryBtn: { width: '100%', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { width: '100%', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  featureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 20 },
  cta: { padding: 24, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  ctaTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, letterSpacing: -0.5 },
});
