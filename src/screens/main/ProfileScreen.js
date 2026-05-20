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
import Dropdown from '../../components/Dropdown';

function Section({ title, children, colors }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        color: colors.text3, fontSize: 11, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4,
      }}>{title}</Text>
      <View style={{
        backgroundColor: colors.surface, borderRadius: 16,
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

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    getBiometricLockEnabled().then(setBiometricEnabled);
  }, []);

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
    <SafeAreaView style={s.safe}>
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
  container: { padding: 16, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.brandDim, borderWidth: 2.5, borderColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.brand },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text1 },
  headerSub: { fontSize: 13, color: colors.text3, marginTop: 4 },

  nameRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  nameInput: {
    flex: 1, fontSize: 15, color: colors.text1,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg,
  },
  saveBtn: {
    backgroundColor: colors.brand, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },

  linkedRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  linkedDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  linkedLabel: { fontSize: 14, color: colors.text2, width: 56 },
  linkedValue: { flex: 1, fontSize: 14, color: colors.text1, textAlign: 'right' },
  notLinked: { color: colors.text3, fontStyle: 'italic' },

  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  currencyItem: {
    width: '22%', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  currencyItemActive: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  currencySymbol: { fontSize: 20, fontWeight: '700', color: colors.text1 },
  currencyCode: { fontSize: 11, color: colors.text2, marginTop: 2, fontWeight: '600' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginVertical: 8,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.red },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  prefDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  prefLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text1 },
  prefDropdown: { minWidth: 140 },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 4, marginBottom: 4 },
  legalLink: { fontSize: 12, color: colors.text3, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: colors.text3 },

  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginTop: 12,
  },
  advancedToggleText: { fontSize: 13, color: colors.text3, fontWeight: '600' },

  dangerBox: {
    marginTop: 8, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.red + '50',
    backgroundColor: colors.red + '0A',
  },
  dangerTitle: {
    fontSize: 12, fontWeight: '700', color: colors.red,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  dangerDesc: { fontSize: 13, color: colors.text2, lineHeight: 18, marginBottom: 14 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.red, alignSelf: 'flex-start',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: colors.red },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text1, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: colors.text2, lineHeight: 18, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text1, fontSize: 14, backgroundColor: colors.bg, marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { color: colors.text1, fontWeight: '600' },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.red, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});
