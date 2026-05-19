import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';

export default function Splash() {
  const { colors } = useTheme();
  const { t } = useLang();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Image
          source={require('../../assets/birik-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.appName, { color: colors.text1 }]}>{t('appName')}</Text>
        <Text style={[styles.tagline, { color: colors.text3 }]}>{t('appSubtitle')}</Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator color={colors.brand} size="small" style={{ marginBottom: 16 }} />
        <Text style={[styles.credit, { color: colors.text3 }]}>{t('createdBy')}</Text>
        <Text style={[styles.creditName, { color: colors.text2 }]}>Sercan Furunci</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  center: { alignItems: 'center' },
  logo: { width: 120, height: 120, borderRadius: 26, marginBottom: 22, backgroundColor: 'transparent' },
  appName: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 6 },
  tagline: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  footer: { position: 'absolute', bottom: 56, alignItems: 'center' },
  credit: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  creditName: { fontSize: 14, fontWeight: '700' },
});
