import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { spacing, radius, type, fonts } from '../../constants/tokens';

const FEATURES = [
  { icon: 'flash-outline',         titleKey: 'landingFeature1Title', descKey: 'landingFeature1Desc' },
  { icon: 'stats-chart-outline',   titleKey: 'landingFeature2Title', descKey: 'landingFeature2Desc' },
  { icon: 'globe-outline',         titleKey: 'landingFeature3Title', descKey: 'landingFeature3Desc' },
  { icon: 'sparkles-outline',      titleKey: 'landingFeature4Title', descKey: 'landingFeature4Desc' },
  { icon: 'notifications-outline', titleKey: 'landingFeature5Title', descKey: 'landingFeature5Desc' },
  { icon: 'trophy-outline',        titleKey: 'landingFeature6Title', descKey: 'landingFeature6Desc' },
];

export default function LandingScreen({ navigation }) {
  const { colors, toggleTheme, isDark } = useTheme();
  const { t, lang, toggleLang } = useLang();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/birik-icon-fg.png')} style={styles.logoImg} />
            <Text style={[styles.brandName, { color: colors.text1 }]}>{t('appName')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={toggleLang} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text2, ...type.bodyMd, fontFamily: fonts.bodySemibold, fontSize: 12 }}>{lang === 'tr' ? 'EN' : 'TR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={colors.text2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.tag, { backgroundColor: colors.brandDim }]}>
            <Text style={{ color: colors.brand, ...type.label }}>{t('landingTagline')}</Text>
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
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('landingGetStarted')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text1 }]}>{t('landingSignIn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{t('landingFeaturesLabel') || 'Features'}</Text>

        {/* Features */}
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.brandDim }]}>
              <Ionicons name={f.icon} size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text1 }]}>{t(f.titleKey)}</Text>
              <Text style={[styles.featureDesc, { color: colors.text2 }]}>{t(f.descKey)}</Text>
            </View>
          </View>
        ))}

        {/* CTA */}
        <View style={[styles.cta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.ctaTitle, { color: colors.text1 }]}>{t('landingCtaTitle')}</Text>
          <Text style={[styles.ctaSub, { color: colors.text3 }]}>{t('landingCtaSub')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={[styles.primaryBtn, { backgroundColor: colors.brand, marginTop: spacing.lg, marginBottom: 0 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('landingGetStarted')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginBottom: spacing['4xl'] },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoImg: { width: 44, height: 44 },
  brandName: { ...type.h2Serif, fontSize: 22 },
  iconBtn: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  hero: { alignItems: 'center', marginBottom: spacing['4xl'] },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.xl },
  headline: { ...type.heroSerif, textAlign: 'center', marginBottom: spacing.lg },
  subtitle: { ...type.bodyLg, textAlign: 'center', marginBottom: spacing['2xl'], paddingHorizontal: spacing.lg },

  primaryBtn: {
    width: '100%', height: 54, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  primaryBtnText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 15, letterSpacing: -0.2 },

  secondaryBtn: {
    width: '100%', height: 54, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  secondaryBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, letterSpacing: -0.2 },

  sectionLabel: { ...type.label, marginBottom: spacing.md, marginLeft: spacing.xs },

  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, marginBottom: 3, letterSpacing: -0.2 },
  featureDesc: { ...type.caption },

  cta: {
    padding: spacing['2xl'], borderRadius: radius.xl, borderWidth: 1,
    alignItems: 'center', marginTop: spacing.xl,
  },
  ctaTitle: { ...type.h1Serif, fontSize: 26, lineHeight: 32, textAlign: 'center', marginBottom: spacing.sm },
  ctaSub: { ...type.caption, textAlign: 'center' },
});
