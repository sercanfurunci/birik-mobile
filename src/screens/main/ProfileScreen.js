import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { API, authFetch } from '../../utils/api';
import { isBiometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled, authenticateWithBiometrics } from '../../utils/biometric';
import { CURRENCIES } from '../../constants/currencies';
import { spacing, radius, type, fonts } from '../../constants/tokens';
import Dropdown from '../../components/Dropdown';
import { getAllPrefs, setPref } from '../../utils/notificationPrefs';
import { requestNotificationPermission, scheduleSubscriptionReminders, scheduleRecurringReminders } from '../../utils/notifications';

function Section({ title, children, colors }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{
        ...type.label, color: colors.text3,
        marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
      }}>{title}</Text>
      <View style={{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { t, lang, langMode, setLangMode } = useLang();
  const { currentUser, updateUser, handleLogout } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [savingName, setSavingName] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(currentUser?.currency || 'USD');

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    master: true, budgets: true, goals: true, subscriptions: true, recurring: true,
  });

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    getBiometricLockEnabled().then(setBiometricEnabled);
    getAllPrefs().then(setNotifPrefs);
  }, []);

  const toggleNotifPref = async (key, val) => {
    if (val && key === 'master') {
      const granted = await requestNotificationPermission();
      if (!granted) { showToast(t('serverError'), 'error'); return; }
    }
    await setPref(key, val);
    const next = { ...notifPrefs, [key]: val };
    setNotifPrefs(next);

    const subsActive = next.master && next.subscriptions;
    const recActive = next.master && next.recurring;

    try {
      if (!subsActive) await scheduleSubscriptionReminders([]);
      if (!recActive) await scheduleRecurringReminders([]);
    } catch {}
  };

  const toggleBiometric = async (val) => {
    if (val) {
      const ok = await authenticateWithBiometrics();
      if (!ok) return;
    }
    await setBiometricLockEnabled(val);
    setBiometricEnabled(val);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  const initials = (currentUser?.username || currentUser?.email || '?').slice(0, 2).toUpperCase();
  const s = makeStyles(colors);

  const saveName = async () => {
    const trimmed = username.trim();
    if (!trimmed) { showToast(t('usernameRequired'), 'error'); return; }
    setSavingName(true);
    try {
      const res = await authFetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, currency: selectedCurrency }),
      });
      if (!res.ok) throw new Error();
      updateUser({ username: trimmed });
      showToast(t('toastProfileSaved'), 'success');
    } catch {
      showToast(t('serverError'), 'error');
    } finally {
      setSavingName(false);
    }
  };

  const saveCurrency = async (code) => {
    setSelectedCurrency(code);
    try {
      const res = await authFetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() || currentUser?.username || '', currency: code }),
      });
      if (!res.ok) throw new Error();
      updateUser({ currency: code });
      showToast(t('toastProfileSaved'), 'success');
    } catch {
      showToast(t('serverError'), 'error');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') { showToast(t('deleteAccountTypeWrong'), 'error'); return; }
    if (!deletePassword) { showToast(t('deleteAccountNeedPassword'), 'error'); return; }
    setDeleting(true);
    try {
      const res = await authFetch(`${API}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) throw new Error();
      await handleLogout();
    } catch {
      showToast(t('deleteAccountFailed'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Avatar header */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.headerTitle}>{t('profileTitle')}</Text>
          {currentUser?.email && (
            <Text style={s.headerSub}>{currentUser.email}</Text>
          )}
        </View>

        {/* Display name */}
        <Section title={t('displayName')} colors={colors}>
          <View style={s.nameRow}>
            <TextInput
              style={s.nameInput}
              value={username}
              onChangeText={setUsername}
              placeholder={t('displayNamePlaceholder')}
              placeholderTextColor={colors.text3}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <TouchableOpacity style={s.saveBtn} onPress={saveName} disabled={savingName}>
              {savingName
                ? <ActivityIndicator size="small" color={colors.bg} />
                : <Text style={s.saveBtnText}>{t('saveBtn')}</Text>
              }
            </TouchableOpacity>
          </View>
        </Section>

        {/* Linked accounts */}
        <Section title={t('linkedAccounts')} colors={colors}>
          <View style={s.linkedRow}>
            <Ionicons name="mail-outline" size={18} color={colors.text2} />
            <Text style={s.linkedLabel}>{t('linkedEmail')}</Text>
            <Text style={[s.linkedValue, !currentUser?.email && s.notLinked]} numberOfLines={1}>
              {currentUser?.email || t('notLinked')}
            </Text>
          </View>
          <View style={[s.linkedRow, s.linkedDivider]}>
            <Ionicons name="call-outline" size={18} color={colors.text2} />
            <Text style={s.linkedLabel}>{t('linkedPhone')}</Text>
            <Text style={[s.linkedValue, !currentUser?.phone && s.notLinked]}>
              {currentUser?.phone || t('notLinked')}
            </Text>
          </View>
        </Section>

        {/* Preferences (theme + language) */}
        <Section title={t('preferencesTitle')} colors={colors}>
          <View style={s.prefRow}>
            <Ionicons name={themeMode === 'system' ? 'phone-portrait-outline' : isDark ? 'moon' : 'sunny'} size={18} color={colors.text2} />
            <Text style={s.prefLabel}>{t('theme')}</Text>
            <Dropdown
              style={s.prefDropdown}
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: 'system', label: t('themeSystem') },
                { value: 'light', label: t('lightMode') },
                { value: 'dark', label: t('darkMode') },
              ]}
            />
          </View>
          <View style={[s.prefRow, s.prefDivider]}>
            <Ionicons name="language" size={18} color={colors.text2} />
            <Text style={s.prefLabel}>{t('language')}</Text>
            <Dropdown
              style={s.prefDropdown}
              value={langMode}
              onChange={setLangMode}
              options={[
                { value: 'system', label: t('langSystem') },
                { value: 'en', label: 'English' },
                { value: 'tr', label: 'Türkçe' },
              ]}
            />
          </View>
          {biometricAvailable && (
            <View style={[s.prefRow, s.prefDivider]}>
              <Ionicons name="finger-print" size={18} color={colors.text2} />
              <Text style={s.prefLabel}>{t('biometricLock')}</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#fff"
              />
            </View>
          )}
        </Section>

        {/* Notifications */}
        <Section title={t('notifications')} colors={colors}>
          <View style={s.notifRow}>
            <Ionicons name="notifications" size={18} color={colors.text2} />
            <View style={s.notifTextWrap}>
              <Text style={s.notifLabel}>{t('notifEnableAll')}</Text>
              <Text style={s.notifDesc}>{t('notifEnableAllDesc')}</Text>
            </View>
            <Switch
              value={notifPrefs.master}
              onValueChange={(v) => toggleNotifPref('master', v)}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor="#fff"
            />
          </View>
          {[
            { key: 'budgets', icon: 'pie-chart-outline', label: 'notifBudgets', desc: 'notifBudgetsDesc' },
            { key: 'goals', icon: 'trophy-outline', label: 'notifGoals', desc: 'notifGoalsDesc' },
            { key: 'subscriptions', icon: 'repeat-outline', label: 'notifSubscriptions', desc: 'notifSubscriptionsDesc' },
            { key: 'recurring', icon: 'time-outline', label: 'notifRecurring', desc: 'notifRecurringDesc' },
          ].map(row => (
            <View key={row.key} style={[s.notifRow, s.prefDivider, !notifPrefs.master && { opacity: 0.4 }]}>
              <Ionicons name={row.icon} size={18} color={colors.text2} />
              <View style={s.notifTextWrap}>
                <Text style={s.notifLabel}>{t(row.label)}</Text>
                <Text style={s.notifDesc}>{t(row.desc)}</Text>
              </View>
              <Switch
                value={notifPrefs.master && notifPrefs[row.key]}
                onValueChange={(v) => toggleNotifPref(row.key, v)}
                disabled={!notifPrefs.master}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </Section>

        {/* Currency */}
        <Section title={t('currencyLabel')} colors={colors}>
          <View style={s.currencyGrid}>
            {CURRENCIES.map(cur => {
              const active = selectedCurrency === cur.code;
              return (
                <TouchableOpacity
                  key={cur.code}
                  style={[s.currencyItem, active && s.currencyItemActive]}
                  onPress={() => saveCurrency(cur.code)}
                >
                  <Text style={[s.currencySymbol, active && { color: colors.brand }]}>{cur.symbol}</Text>
                  <Text style={[s.currencyCode, active && { color: colors.brand }]}>{cur.code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={s.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>

        {/* Legal links */}
        <View style={s.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
            <Text style={s.legalLink}>{t('termsOfService')}</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
            <Text style={s.legalLink}>{t('privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>

        {/* Advanced toggle */}
        <TouchableOpacity
          style={s.advancedToggle}
          onPress={() => setShowDanger(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.advancedToggleText}>
            {showDanger ? t('hideAdvanced') : t('showAdvanced')}
          </Text>
          <Ionicons name={showDanger ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text3} />
        </TouchableOpacity>

        {showDanger && (
          <View style={s.dangerBox}>
            <Text style={s.dangerTitle}>{t('dangerZone')}</Text>
            <Text style={s.dangerDesc}>{t('deleteAccountWarning')}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={15} color={colors.red} />
              <Text style={s.deleteBtnText}>{t('deleteAccountBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Delete modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{t('deleteAccountBtn')}</Text>
            <Text style={s.modalDesc}>{t('deleteAccountWarning')}</Text>

            <Text style={s.modalLabel}>{t('deleteAccountTypeLabel')}</Text>
            <TextInput
              style={s.modalInput}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder="DELETE"
              placeholderTextColor={colors.text3}
              autoCapitalize="characters"
            />

            <Text style={s.modalLabel}>{t('password')}</Text>
            <TextInput
              style={s.modalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={colors.text3}
              secureTextEntry
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowDeleteModal(false); setDeleteConfirm(''); setDeletePassword(''); }}
              >
                <Text style={s.cancelText}>{t('cancelBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, deleting && { opacity: 0.5 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmText}>{t('deleteAccountConfirmBtn')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing['4xl'] + spacing.sm },

  header: { alignItems: 'center', marginBottom: spacing['2xl'] + 4, paddingTop: spacing.sm },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.brandDim, borderWidth: 2.5, borderColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  avatarText: { fontFamily: fonts.serif, fontSize: 32, color: colors.brand, letterSpacing: -0.5 },
  headerTitle: { ...type.h2Serif, fontSize: 26, color: colors.text1 },
  headerSub: { ...type.caption, color: colors.text3, marginTop: spacing.xs },

  nameRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  nameInput: {
    flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text1,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, backgroundColor: colors.bg,
  },
  saveBtn: {
    backgroundColor: colors.brand, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
  },
  saveBtnText: { color: colors.bg, fontFamily: fonts.bodySemibold, fontSize: 14, letterSpacing: -0.2 },

  linkedRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md + 2, gap: spacing.sm + 2 },
  linkedDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  linkedLabel: { ...type.bodyMd, color: colors.text2, width: 56 },
  linkedValue: { flex: 1, ...type.bodyMd, color: colors.text1, textAlign: 'right' },
  notLinked: { color: colors.text3, fontStyle: 'italic' },

  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm + 2, gap: spacing.sm },
  currencyItem: {
    width: '22%', borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xs,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  currencyItemActive: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  currencySymbol: { fontFamily: fonts.monoMedium, fontSize: 20, color: colors.text1 },
  currencyCode: { fontFamily: fonts.mono, fontSize: 11, color: colors.text2, marginTop: 2 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md + 2, marginVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  signOutText: { ...type.body, fontFamily: fonts.bodySemibold, color: colors.red },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md },
  prefDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  prefLabel: { flex: 1, ...type.bodyMd, fontFamily: fonts.bodyMedium, color: colors.text1 },
  prefDropdown: { minWidth: 140 },

  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md },
  notifTextWrap: { flex: 1 },
  notifLabel: { ...type.bodyMd, fontFamily: fonts.bodyMedium, color: colors.text1 },
  notifDesc: { ...type.small, color: colors.text3, marginTop: 2 },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.xs },
  legalLink: { ...type.small, color: colors.text3, textDecorationLine: 'underline' },
  legalDot: { ...type.small, color: colors.text3 },

  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs + 2, paddingVertical: spacing.sm + 2, marginTop: spacing.md,
  },
  advancedToggleText: { ...type.caption, fontFamily: fonts.bodySemibold, color: colors.text3 },

  dangerBox: {
    marginTop: spacing.sm, padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.red + '50',
    backgroundColor: colors.red + '0A',
  },
  dangerTitle: { ...type.label, color: colors.red, marginBottom: spacing.sm },
  dangerDesc: { ...type.caption, color: colors.text2, marginBottom: spacing.md + 2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 1, paddingHorizontal: spacing.md + 2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.red, alignSelf: 'flex-start',
  },
  deleteBtnText: { ...type.bodyMd, fontFamily: fonts.bodySemibold, color: colors.red },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  modalBox: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: spacing['2xl'], borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { ...type.h2Serif, fontSize: 22, color: colors.text1, marginBottom: spacing.sm },
  modalDesc: { ...type.caption, color: colors.text2, marginBottom: spacing.lg },
  modalLabel: { ...type.label, color: colors.text2, marginBottom: spacing.xs + 2 },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.text1, fontFamily: fonts.body, fontSize: 14, backgroundColor: colors.bg, marginBottom: spacing.md + 2,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { color: colors.text1, fontFamily: fonts.bodySemibold, fontSize: 14 },
  confirmBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.red, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 },
});
