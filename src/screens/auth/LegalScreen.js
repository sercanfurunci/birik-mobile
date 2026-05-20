import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last updated: May 2026',
      sections: [
        {
          heading: '1. Acceptance of Terms',
          body: 'By creating an account or using Birik, you agree to these Terms of Service. If you do not agree, please do not use the app.',
        },
        {
          heading: '2. Description of Service',
          body: 'Birik is a personal finance management application that allows you to track income, expenses, subscriptions, and savings goals. The service is provided free of charge.',
        },
        {
          heading: '3. User Accounts',
          body: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to notify us immediately of any unauthorized use of your account.',
        },
        {
          heading: '4. Acceptable Use',
          body: 'You agree not to misuse the service, attempt to access accounts of other users, reverse-engineer any part of the app, or use the service for any unlawful purpose.',
        },
        {
          heading: '5. Data and Privacy',
          body: 'Your financial data is stored securely. We do not sell your personal data to third parties. Please review our Privacy Policy for full details on how we handle your data.',
        },
        {
          heading: '6. Disclaimer of Warranties',
          body: 'Birik is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free operation. The app is not a licensed financial advisor and does not provide financial advice.',
        },
        {
          heading: '7. Limitation of Liability',
          body: 'To the fullest extent permitted by law, Birik and its developers shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.',
        },
        {
          heading: '8. Account Deletion',
          body: 'You may delete your account at any time from the Profile screen. Upon deletion, all your data will be permanently removed from our servers.',
        },
        {
          heading: '9. Changes to Terms',
          body: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.',
        },
        {
          heading: '10. Contact',
          body: 'For any questions about these terms, please contact us through the app or at our support channels.',
        },
      ],
    },
    tr: {
      title: 'Kullanım Koşulları',
      updated: 'Son güncelleme: Mayıs 2026',
      sections: [
        {
          heading: '1. Koşulların Kabulü',
          body: "Birik; gelir, gider, abonelik ve birikim hedeflerini takip etmenizi sağlayan kişisel finans yönetimi uygulamasıdır. Hizmet ücretsiz olarak sunulmaktadır.",
        },
        {
          heading: '2. Hizmetin Tanımı',
          body: 'Birik; gelir, gider, abonelik ve birikim hedeflerini takip etmenizi sağlayan kişisel finans yönetimi uygulamasıdır. Hizmet ücretsiz olarak sunulmaktadır.',
        },
        {
          heading: '3. Kullanıcı Hesapları',
          body: 'Hesap bilgilerinizin gizliliğini korumak sizin sorumluluğunuzdadır. Doğru bilgi sağlamayı ve hesabınıza yetkisiz erişim durumunda bizi derhal bilgilendirmeyi kabul edersiniz.',
        },
        {
          heading: '4. Kabul Edilebilir Kullanım',
          body: 'Hizmeti kötüye kullanmamayı, diğer kullanıcıların hesaplarına erişmeye çalışmamayı, uygulamayı tersine mühendislik yöntemiyle incelememeyI ve yasadışı amaçlarla kullanmamayı kabul edersiniz.',
        },
        {
          heading: '5. Veri ve Gizlilik',
          body: 'Finansal verileriniz güvenli biçimde saklanır. Kişisel verilerinizi üçüncü taraflara satmıyoruz. Verilerinizi nasıl işlediğimiz hakkında ayrıntılı bilgi için Gizlilik Politikamızı inceleyin.',
        },
        {
          heading: '6. Garanti Reddi',
          body: 'Birik, herhangi bir garanti olmaksızın "olduğu gibi" sunulmaktadır. Kesintisiz veya hatasız çalışmayı garanti etmiyoruz. Uygulama lisanslı bir finansal danışman değildir ve finansal tavsiye sunmaz.',
        },
        {
          heading: '7. Sorumluluğun Sınırlandırılması',
          body: 'Yasaların izin verdiği azami ölçüde, Birik ve geliştiricileri, hizmetin kullanımından kaynaklanabilecek dolaylı veya arızi zararlardan sorumlu tutulamaz.',
        },
        {
          heading: '8. Hesap Silme',
          body: 'Hesabınızı istediğiniz zaman Profil ekranından silebilirsiniz. Hesap silme işleminin ardından tüm verileriniz sunucularımızdan kalıcı olarak kaldırılır.',
        },
        {
          heading: '9. Değişiklikler',
          body: 'Bu koşulları zaman zaman güncelleyebiliriz. Değişikliklerden sonra uygulamayı kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.',
        },
        {
          heading: '10. İletişim',
          body: 'Bu koşullar hakkında sorularınız için uygulama üzerinden veya destek kanallarımız aracılığıyla bize ulaşabilirsiniz.',
        },
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: May 2026',
      sections: [
        {
          heading: '1. Information We Collect',
          body: 'We collect information you provide when creating an account (email or phone number) and the financial data you enter (transactions, budgets, goals, subscriptions). We do not collect payment card information.',
        },
        {
          heading: '2. How We Use Your Information',
          body: 'Your data is used solely to provide the Birik service — to display your financial summary, analytics, and enable app features. We do not use your data for advertising purposes.',
        },
        {
          heading: '3. Data Storage and Security',
          body: 'Your data is stored on secure servers with encryption in transit (HTTPS). We apply industry-standard security measures to protect your information.',
        },
        {
          heading: '4. Data Sharing',
          body: 'We do not sell, rent, or share your personal or financial data with third parties for marketing purposes. Data may be shared only when required by law.',
        },
        {
          heading: '5. AI-Powered Features',
          body: 'When you use the statement import feature, the uploaded image or PDF is sent to an AI service for transaction extraction. This data is processed only for this purpose and is not stored by the AI provider.',
        },
        {
          heading: '6. Your Rights',
          body: 'You have the right to access, correct, or delete your data at any time. You can delete your entire account and all associated data from the Profile screen.',
        },
        {
          heading: '7. Data Retention',
          body: 'We retain your data as long as your account is active. When you delete your account, all data is permanently removed from our systems.',
        },
        {
          heading: '8. Cookies and Local Storage',
          body: 'The app uses local device storage (AsyncStorage) to remember your preferences such as theme and language settings. No tracking cookies are used.',
        },
        {
          heading: '9. Children\'s Privacy',
          body: 'Birik is not intended for users under the age of 13. We do not knowingly collect data from children.',
        },
        {
          heading: '10. Changes to This Policy',
          body: 'We may update this Privacy Policy periodically. We will notify you of significant changes through the app.',
        },
        {
          heading: '11. Contact',
          body: 'For privacy-related questions or requests, please contact us through the app or our support channels.',
        },
      ],
    },
    tr: {
      title: 'Gizlilik Politikası',
      updated: 'Son güncelleme: Mayıs 2026',
      sections: [
        {
          heading: '1. Topladığımız Bilgiler',
          body: 'Hesap oluştururken sağladığınız bilgileri (e-posta veya telefon numarası) ve girdiğiniz finansal verileri (işlemler, bütçeler, hedefler, abonelikler) toplarız. Ödeme kartı bilgisi toplamıyoruz.',
        },
        {
          heading: '2. Bilgilerinizi Nasıl Kullanıyoruz',
          body: 'Verileriniz yalnızca Birik hizmetini sunmak amacıyla kullanılır: finansal özetinizi göstermek, analiz sağlamak ve uygulama özelliklerini etkinleştirmek. Verilerinizi reklam amacıyla kullanmıyoruz.',
        },
        {
          heading: '3. Veri Depolama ve Güvenlik',
          body: 'Verileriniz, aktarım sırasında şifreleme (HTTPS) ile güvenli sunucularda saklanır. Bilgilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz.',
        },
        {
          heading: '4. Veri Paylaşımı',
          body: 'Kişisel veya finansal verilerinizi pazarlama amacıyla üçüncü taraflara satmıyor, kiralamıyor veya paylaşmıyoruz. Veriler yalnızca yasal zorunluluk halinde paylaşılabilir.',
        },
        {
          heading: '5. Yapay Zeka Destekli Özellikler',
          body: 'Hesap özeti içe aktarma özelliğini kullandığınızda, yüklenen görüntü veya PDF işlem çıkarımı için bir yapay zeka hizmetine gönderilir. Bu veri yalnızca bu amaçla işlenir ve yapay zeka sağlayıcısı tarafından saklanmaz.',
        },
        {
          heading: '6. Haklarınız',
          body: 'Verilerinize istediğiniz zaman erişme, düzeltme veya silme hakkına sahipsiniz. Hesabınızı ve tüm ilgili verileri Profil ekranından silebilirsiniz.',
        },
        {
          heading: '7. Veri Saklama',
          body: 'Hesabınız aktif olduğu sürece verilerinizi saklarız. Hesabınızı sildiğinizde tüm veriler sistemlerimizden kalıcı olarak kaldırılır.',
        },
        {
          heading: '8. Çerezler ve Yerel Depolama',
          body: 'Uygulama, tema ve dil tercihleri gibi ayarlarınızı hatırlamak için cihazın yerel depolama alanını (AsyncStorage) kullanır. İzleme çerezi kullanılmaz.',
        },
        {
          heading: '9. Çocukların Gizliliği',
          body: 'Birik, 13 yaşın altındaki kullanıcılara yönelik değildir. Çocuklardan bilerek veri toplamıyoruz.',
        },
        {
          heading: '10. Politika Değişiklikleri',
          body: 'Bu Gizlilik Politikasını periyodik olarak güncelleyebiliriz. Önemli değişiklikler hakkında sizi uygulama üzerinden bilgilendireceğiz.',
        },
        {
          heading: '11. İletişim',
          body: 'Gizlilikle ilgili sorularınız veya talepleriniz için uygulama üzerinden ya da destek kanallarımız aracılığıyla bize ulaşabilirsiniz.',
        },
      ],
    },
  },
};

export default function LegalScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { lang } = useLang();
  const type = route?.params?.type || 'terms';
  const content = CONTENT[type][lang] || CONTENT[type]['en'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.brand, fontSize: 15, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{content.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.text3 }]}>{content.updated}</Text>

        {content.sections.map((sec, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.heading, { color: colors.text1 }]}>{sec.heading}</Text>
            <Text style={[styles.body, { color: colors.text2 }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 48 },
  updated: { fontSize: 12, marginBottom: 24, fontStyle: 'italic' },
  section: { marginBottom: 20 },
  heading: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 22 },
});
