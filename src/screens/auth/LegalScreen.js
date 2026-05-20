import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last updated: May 10, 2026',
      intro: 'These Terms of Service govern your use of Birik ("Service"), operated by Sercan Furunci ("we", "us"). By creating an account you agree to these terms.',
      sections: [
        {
          heading: '1. Eligibility',
          body: 'You must be at least 13 years old to use Birik. By registering, you confirm that you meet this requirement.',
        },
        {
          heading: '2. Your Account',
          body: 'You are responsible for keeping your password secure and for all activity that occurs under your account.\n\nYou must provide accurate information when registering. Do not impersonate others or create accounts on their behalf without permission.\n\nNotify us immediately if you suspect unauthorized access to your account.',
        },
        {
          heading: '3. Acceptable Use',
          body: 'You may use Birik only for lawful personal finance tracking. You agree not to:\n\n• Attempt to reverse-engineer, hack, or disrupt the Service or its infrastructure.\n• Upload malicious files, scripts, or content designed to harm other users or our systems.\n• Use the Service to store or process financial data of third parties without their consent.\n• Circumvent rate limits, authentication, or any other security measure.',
        },
        {
          heading: '4. Data You Enter',
          body: 'You retain ownership of all financial data you enter into Birik. We do not claim any rights over your transactions, budgets, or goals.\n\nYou grant us a limited license to store and process your data solely to provide the Service to you.',
        },
        {
          heading: '5. AI Statement Import',
          body: 'The AI Statement Import feature sends your uploaded bank statements to Anthropic\'s Claude API for one-time extraction. Extracted data is returned to you and stored in your account. Raw files are not retained on our servers.\n\nReview extracted transactions before saving — AI extraction may occasionally misread amounts or categories.',
        },
        {
          heading: '6. Subscription Reminders & Emails',
          body: 'By registering, you consent to receiving transactional emails from Birik, including account verification, password reset, and optional subscription bill reminders you configure.\n\nYou can disable bill reminder emails at any time by removing the reminder setting from each subscription inside the app.',
        },
        {
          heading: '7. Service Availability',
          body: 'We aim to keep Birik available at all times but do not guarantee uninterrupted access. We may perform maintenance, apply updates, or temporarily suspend the Service without prior notice.',
        },
        {
          heading: '8. Disclaimer of Warranties',
          body: 'Birik is provided "as is" without warranties of any kind. We are not financial advisors. Nothing in the Service constitutes financial, tax, or investment advice.\n\nWe are not liable for decisions you make based on data displayed in the app.',
        },
        {
          heading: '9. Limitation of Liability',
          body: 'To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including data loss.',
        },
        {
          heading: '10. Termination',
          body: 'You may delete your account at any time from Profile → Danger Zone → Delete Account. All your data will be permanently removed.\n\nWe reserve the right to suspend or terminate accounts that violate these terms.',
        },
        {
          heading: '11. Changes to These Terms',
          body: 'We may update these terms. The "Last updated" date at the top reflects the latest revision. Continued use of the Service after changes constitutes acceptance of the new terms.',
        },
        {
          heading: '12. Contact',
          body: 'Questions about these terms: support@furunci.tech',
        },
      ],
    },
    tr: {
      title: 'Kullanım Koşulları',
      updated: 'Son güncelleme: 10 Mayıs 2026',
      intro: 'Bu Kullanım Koşulları, Sercan Furunci ("biz", "bizim") tarafından işletilen Birik\'yi ("Hizmet") kullanımınızı düzenler. Hesap oluşturarak bu koşulları kabul etmiş sayılırsınız.',
      sections: [
        {
          heading: '1. Uygunluk',
          body: "Birik'yi kullanabilmek için en az 13 yaşında olmanız gerekir. Kayıt olarak bu şartı karşıladığınızı onaylamış olursunuz.",
        },
        {
          heading: '2. Hesabınız',
          body: 'Şifrenizi güvende tutmaktan ve hesabınızda gerçekleşen tüm etkinlikten siz sorumlusunuz.\n\nKayıt olurken doğru bilgi vermeniz zorunludur. Başkalarının kimliğine bürünmeyin veya izinleri olmadan adlarına hesap oluşturmayın.\n\nHesabınıza yetkisiz erişim şüphesi duyarsanız bizi hemen bilgilendirin.',
        },
        {
          heading: '3. Kabul Edilebilir Kullanım',
          body: "Birik'yi yalnızca yasal kişisel finans takibi için kullanabilirsiniz. Aşağıdakileri yapmamayı kabul edersiniz:\n\n• Hizmeti veya altyapısını tersine mühendislik, hackleme veya kesintiye uğratma girişiminde bulunmak.\n• Diğer kullanıcılara veya sistemlerimize zarar vermek amacıyla kötü amaçlı dosya, komut dosyası veya içerik yüklemek.\n• Üçüncü kişilerin finansal verilerini rızaları olmadan işlemek için Hizmeti kullanmak.\n• İstek sınırlarını, kimlik doğrulamayı veya diğer güvenlik önlemlerini aşmaya çalışmak.",
        },
        {
          heading: '4. Girdiğiniz Veriler',
          body: "Birik'ye girdiğiniz tüm finansal verilerin mülkiyeti size aittir. İşlemleriniz, bütçeleriniz veya hedefleriniz üzerinde herhangi bir hak talep etmiyoruz.\n\nSize Hizmeti sunmak amacıyla verilerinizi depolamak ve işlemek için bize sınırlı bir lisans vermiş olursunuz.",
        },
        {
          heading: '5. AI Ekstre İçe Aktarma',
          body: "AI Ekstre İçe Aktarma özelliği, yüklediğiniz banka ekstrelerini tek seferlik çıkarım için Anthropic'in Claude API'sine gönderir. Çıkarılan veriler size döndürülür ve hesabınızda saklanır. Ham dosyalar sunucularımızda tutulmaz.\n\nKaydetmeden önce çıkarılan işlemleri gözden geçirin; AI çıkarımı zaman zaman tutarları veya kategorileri yanlış okuyabilir.",
        },
        {
          heading: '6. Abonelik Hatırlatıcıları ve E-postalar',
          body: "Kayıt olarak Birik'dan işlem e-postaları almayı kabul etmiş olursunuz; bunlar arasında hesap doğrulama, şifre sıfırlama ve uygulama içinde yapılandırdığınız isteğe bağlı abonelik fatura hatırlatıcıları yer alır.\n\nFatura hatırlatıcısı e-postalarını, uygulama içinden ilgili aboneliğin hatırlatıcı ayarını kaldırarak istediğiniz zaman devre dışı bırakabilirsiniz.",
        },
        {
          heading: '7. Hizmet Erişilebilirliği',
          body: "Birik'yi her zaman erişilebilir tutmayı hedefliyoruz ancak kesintisiz erişimi garanti etmiyoruz. Önceden bildirimde bulunmaksızın bakım yapabilir, güncellemeler uygulayabilir veya Hizmeti geçici olarak askıya alabiliriz.",
        },
        {
          heading: '8. Garanti Reddi',
          body: 'Birik, herhangi bir garanti olmaksızın "olduğu gibi" sunulmaktadır. Finansal danışman değiliz. Hizmet içindeki hiçbir şey finansal, vergi veya yatırım tavsiyesi niteliği taşımaz.\n\nUygulamada gösterilen verilere dayanarak verdiğiniz kararlardan sorumlu değiliz.',
        },
        {
          heading: '9. Sorumluluk Sınırlaması',
          body: 'Yasaların izin verdiği azami ölçüde, veri kaybı dahil olmak üzere Hizmeti kullanımınızdan kaynaklanan dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz.',
        },
        {
          heading: '10. Hesap Sonlandırma',
          body: 'Hesabınızı istediğiniz zaman Profil → Tehlikeli Bölge → Hesabı Sil yolundan silebilirsiniz. Tüm verileriniz kalıcı olarak kaldırılacaktır.\n\nBu koşulları ihlal eden hesapları askıya alma veya sonlandırma hakkımızı saklı tutarız.',
        },
        {
          heading: '11. Koşullardaki Değişiklikler',
          body: 'Bu koşulları güncelleyebiliriz. Üstteki "Son güncelleme" tarihi en son revizyonu gösterir. Değişikliklerden sonra Hizmeti kullanmaya devam etmek yeni koşulları kabul ettiğiniz anlamına gelir.',
        },
        {
          heading: '12. İletişim',
          body: 'Bu koşullara ilişkin sorularınız için: support@furunci.tech',
        },
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: May 20, 2026',
      intro: 'Birik ("we", "us", "our") respects your privacy. This policy explains what data we collect, how we use it, and your rights.',
      sections: [
        {
          heading: '1. Data We Collect',
          body: 'Account information: email address, optional phone number, password (stored as a one-way bcrypt hash — we never see your plain password), display name, and preferred currency.\n\nFinancial data you enter: transactions (amount, category, description, date, type), monthly budgets, and subscription records.\n\nBank statements you upload: PDFs or images submitted to the AI Statement Import feature are processed in memory and discarded after extraction. We do not store the raw files.\n\nTechnical data: IP address (used only for rate limiting and abuse prevention), and browser/device information sent automatically with each request.',
        },
        {
          heading: '2. How We Use Your Data',
          body: 'To provide the service: store and display your transactions, budgets, and subscriptions; send verification and password-reset emails; process statement imports.\n\nTo secure your account: rate-limit login attempts, detect abuse, and authenticate API requests with JWT tokens.\n\nWe do not sell your data, share it with advertisers, or use it for marketing.',
        },
        {
          heading: '3. Third-Party Services',
          body: 'Neon (PostgreSQL hosting): stores your account and financial data. Encrypted at rest and in transit.\n\nRailway: hosts the backend API. Receives requests but does not retain personal data beyond logs.\n\nVercel: hosts the web frontend. Sees only static assets and client requests, no database access.\n\nResend: sends transactional email (verification, password reset). Receives recipient email and message content.\n\nAnthropic Claude API: processes uploaded bank statements. Statement content is sent for one-time extraction; per Anthropic\'s policy, API inputs are not used to train models.\n\nFrankfurter (open exchange-rate API): we query daily exchange rates without sending any user data.\n\nGoogle Favicon API: fetches subscription brand icons by domain name. No user identity is sent.',
        },
        {
          heading: '4. Data Retention',
          body: 'Your data is retained for as long as your account is active. When you delete your account, all transactions, budgets, and subscriptions are removed immediately and permanently.\n\nServer logs (containing IP addresses) are retained for up to 30 days for security analysis.',
        },
        {
          heading: '5. Your Rights',
          body: 'Access: You can view all of your data within the app.\n\nExport: You can export your transactions to CSV at any time.\n\nCorrection: You can edit any transaction, budget, or subscription directly in the app.\n\nDeletion: You can permanently delete your account inside the app — open Profile → Danger Zone → Delete Account. Your account, transactions, budgets, and subscriptions are removed immediately. If you prefer, you can also email us at the address below.\n\nIf you are in the EU, UK, or California, you also have rights under GDPR/UK GDPR/CCPA to request a copy or erasure of your data.',
        },
        {
          heading: '6. Cookies & Local Storage',
          body: 'We use a JWT authentication token stored securely on your device to keep you signed in. We use no advertising or tracking cookies.\n\nYour dark/light mode and language preferences are also saved locally so they persist between sessions.',
        },
        {
          heading: '7. Biometric Authentication',
          body: 'If you enable biometric login (Face ID, Touch ID, or fingerprint), your biometric data is processed entirely by your device\'s operating system — iOS Secure Enclave or Android Biometric API. Birik never receives, stores, or transmits your fingerprint or face data.\n\nThe app only receives an "authenticated" or "denied" signal from the OS. Your biometric credentials never leave your device.',
        },
        {
          heading: '8. Children',
          body: 'Birik is not intended for users under 13. We do not knowingly collect data from children. If you believe a child has registered, contact us and we will delete the account.',
        },
        {
          heading: '9. Security',
          body: 'Passwords are stored as bcrypt hashes. All traffic between your device and our servers uses HTTPS/TLS. Database connections are encrypted. We do our best to protect your data, but no system is 100% secure.',
        },
        {
          heading: '10. Changes to This Policy',
          body: 'We may update this policy. The "Last updated" date at the top reflects the latest revision. Material changes will be communicated via email or an in-app notice.',
        },
        {
          heading: '11. Contact',
          body: 'Questions, requests, or complaints: privacy@furunci.tech',
        },
      ],
    },
    tr: {
      title: 'Gizlilik Politikası',
      updated: 'Son güncelleme: 20 Mayıs 2026',
      intro: 'Birik ("biz", "bizim") gizliliğinize saygı duyar. Bu politika, hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı açıklar.',
      sections: [
        {
          heading: '1. Topladığımız Veriler',
          body: 'Hesap bilgileri: e-posta adresi, isteğe bağlı telefon numarası, şifre (tek yönlü bcrypt hash olarak saklanır — düz şifrenizi asla görmeyiz), görünen ad ve tercih edilen para birimi.\n\nGirdiğiniz finansal veriler: işlemler (tutar, kategori, açıklama, tarih, tür), aylık bütçeler ve abonelik kayıtları.\n\nYüklediğiniz banka ekstreleri: AI Ekstre İçe Aktarma özelliğine gönderilen PDF veya görseller bellekte işlenir ve çıkarımdan sonra silinir. Ham dosyaları saklamıyoruz.\n\nTeknik veriler: IP adresi (yalnızca hız sınırlama ve kötüye kullanımı engelleme için), tarayıcı/cihaz bilgileri (her istekte otomatik gönderilir).',
        },
        {
          heading: '2. Verileri Nasıl Kullanıyoruz',
          body: 'Hizmeti sağlamak için: işlemlerinizi, bütçelerinizi ve aboneliklerinizi saklayıp göstermek; doğrulama ve şifre sıfırlama e-postaları göndermek; ekstre içe aktarımlarını işlemek.\n\nHesabınızı güvende tutmak için: giriş denemelerini sınırlamak, kötüye kullanımı tespit etmek ve API isteklerini JWT token\'larıyla doğrulamak.\n\nVerilerinizi satmıyor, reklam verenlerle paylaşmıyor veya pazarlama için kullanmıyoruz.',
        },
        {
          heading: '3. Üçüncü Taraf Hizmetleri',
          body: 'Neon (PostgreSQL barındırma): hesap ve finansal verilerinizi saklar. Hem bekleme hem aktarım sırasında şifrelidir.\n\nRailway: backend API\'yi barındırır. İstekleri alır ancak loglar dışında kişisel veri tutmaz.\n\nVercel: web frontend\'i barındırır. Yalnızca statik dosyaları ve istemci isteklerini görür; veritabanına erişimi yoktur.\n\nResend: işlem e-postaları gönderir (doğrulama, şifre sıfırlama). Alıcı e-postasını ve mesaj içeriğini alır.\n\nAnthropic Claude API: yüklenen banka ekstrelerini işler. Ekstre içeriği tek seferlik çıkarım için gönderilir; Anthropic\'in politikasına göre API girdileri model eğitiminde kullanılmaz.\n\nFrankfurter (açık döviz kuru API\'si): kullanıcı verisi göndermeden günlük döviz kurlarını sorgular.\n\nGoogle Favicon API: abonelik marka ikonlarını alan adına göre çeker. Kullanıcı kimliği gönderilmez.',
        },
        {
          heading: '4. Veri Saklama',
          body: 'Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde tüm işlemleriniz, bütçeleriniz ve abonelikleriniz anında ve kalıcı olarak kaldırılır.\n\nSunucu logları (IP adresleri içeren) güvenlik analizi için en fazla 30 gün saklanır.',
        },
        {
          heading: '5. Haklarınız',
          body: 'Erişim: Tüm verilerinizi uygulama içinde görüntüleyebilirsiniz.\n\nDışa aktarma: İşlemlerinizi istediğiniz zaman CSV olarak dışa aktarabilirsiniz.\n\nDüzeltme: İşlem, bütçe veya aboneliği doğrudan uygulama içinde düzenleyebilirsiniz.\n\nSilme: Hesabınızı uygulama içinden kalıcı olarak silebilirsiniz — Profil → Tehlikeli Bölge → Hesabı Sil yolunu izleyin. Hesabınız, işlemleriniz, bütçeleriniz ve abonelikleriniz anında kaldırılır.\n\nAB, Birleşik Krallık veya California\'daysanız GDPR/UK GDPR/CCPA kapsamında verilerinizin bir kopyasını veya silinmesini talep etme haklarınız vardır.',
        },
        {
          heading: '6. Çerezler ve Yerel Depolama',
          body: 'Sizi oturumda tutmak için cihazınızda güvenli biçimde saklanan bir JWT kimlik doğrulama token\'ı kullanırız. Reklam veya takip çerezi kullanmıyoruz.\n\nKaranlık/aydınlık mod ve dil tercihleriniz de oturumlar arasında korunmak üzere yerel olarak saklanır.',
        },
        {
          heading: '7. Biyometrik Doğrulama',
          body: 'Biyometrik girişi (Face ID, Touch ID veya parmak izi) etkinleştirirseniz biyometrik veriniz tamamen cihazınızın işletim sistemi — iOS Güvenli Şifreleme veya Android Biyometrik API — tarafından işlenir. Birik parmak izi veya yüz verinizi hiçbir zaman almaz, saklamaz veya iletmez.\n\nUygulama yalnızca işletim sisteminden "doğrulandı" veya "reddedildi" sinyali alır. Biyometrik kimlik bilgileri cihazınızdan hiç çıkmaz.',
        },
        {
          heading: '8. Çocuklar',
          body: 'Birik 13 yaş altı kullanıcılar için tasarlanmamıştır. Çocuklardan bilerek veri toplamayız. Bir çocuğun kayıt olduğunu düşünüyorsanız bize ulaşın, hesabı sileriz.',
        },
        {
          heading: '9. Güvenlik',
          body: 'Şifreler bcrypt hash olarak saklanır. Cihazınız ile sunucularımız arasındaki tüm trafik HTTPS/TLS kullanır. Veritabanı bağlantıları şifrelidir. Verilerinizi korumak için elimizden geleni yaparız ancak hiçbir sistem %100 güvenli değildir.',
        },
        {
          heading: '10. Bu Politikadaki Değişiklikler',
          body: 'Bu politikayı güncelleyebiliriz. Üstteki "Son güncelleme" tarihi en son revizyonu gösterir. Önemli değişiklikler e-posta veya uygulama içi bildirim ile iletilecektir.',
        },
        {
          heading: '11. İletişim',
          body: 'Soru, talep veya şikayetler için: privacy@furunci.tech',
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
        {content.intro && (
          <Text style={[styles.intro, { color: colors.text2 }]}>{content.intro}</Text>
        )}

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
  updated: { fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  intro: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  section: { marginBottom: 20 },
  heading: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 22 },
});
