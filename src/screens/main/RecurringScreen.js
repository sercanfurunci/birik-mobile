import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import { API, authFetch, queuedAuthFetch } from '../../utils/api';
import { cacheFetch } from '../../utils/cacheFetch';
import { scheduleRecurringReminders } from '../../utils/notifications';
import { useAuth } from '../../context/AuthContext';
import { BASE_CATS, INCOME_ONLY_CATS } from '../../constants/categories';
import Dropdown from '../../components/Dropdown';
import DatePickerField from '../../components/DatePickerField';
import { spacing, radius, type, fonts } from '../../constants/tokens';

const EXPENSE_CATS = BASE_CATS.filter(c => !INCOME_ONLY_CATS.includes(c));
const INCOME_CATS = INCOME_ONLY_CATS;
const FREQUENCIES = ['weekly', 'monthly', 'yearly'];

const FREQ_ICONS = {
  weekly: 'refresh-outline',
  monthly: 'calendar-outline',
  yearly: 'albums-outline',
};

function emptyForm() {
  return {
    description: '',
    amount: '',
    type: 'expense',
    category: 'other',
    frequency: 'monthly',
    day_of_period: '1',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    reminder_days: 1,
  };
}

const RECURRING_REMINDER_OPTS = [null, 0, 1, 3];

export default function RecurringScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const { showToast } = useToast();
  const { syncVersion } = useAuth();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const s = makeStyles(colors);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    await cacheFetch(`${API}/recurring`, (data) => {
      const rules = Array.isArray(data) ? data : [];
      setRules(rules);
      scheduleRecurringReminders(rules).catch(() => {});
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules, syncVersion]);

  const openAdd = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      description: rule.description || '',
      amount: String(rule.amount || ''),
      type: rule.type || 'expense',
      category: rule.category || 'other',
      frequency: rule.frequency || 'monthly',
      day_of_period: String(rule.day_of_period || '1'),
      start_date: rule.start_date ? rule.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
      end_date: rule.end_date ? rule.end_date.split('T')[0] : '',
      is_active: rule.is_active !== false,
      reminder_days: rule.reminder_days === undefined || rule.reminder_days === null ? null : rule.reminder_days,
    });
    setShowModal(true);
  };

  const saveRule = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { showToast(t('amountPlaceholder'), 'error'); return; }

    const payload = {
      description: form.description.trim() || null,
      amount: amt,
      type: form.type,
      category: form.category,
      frequency: form.frequency,
      day_of_period: form.frequency === 'monthly' ? (parseInt(form.day_of_period) || 1) : null,
      start_date: form.start_date || new Date().toISOString().split('T')[0],
      end_date: form.end_date || null,
      is_active: form.is_active,
      reminder_days: form.reminder_days,
    };

    setSaving(true);
    try {
      let res;
      if (editingRule) {
        res = await queuedAuthFetch(`${API}/recurring/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await queuedAuthFetch(`${API}/recurring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (editingRule) {
        setRules(prev => prev.map(r => r.id === editingRule.id ? data : r));
      } else {
        setRules(prev => [data, ...prev]);
      }
      showToast(t('recSaved'), 'success');
      setShowModal(false);
    } catch {
      showToast(t('serverError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule) => {
    try {
      const res = await queuedAuthFetch(`${API}/recurring/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, is_active: !rule.is_active }),
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => r.id === rule.id ? data : r));
      }
    } catch {}
  };

  const deleteRule = async (rule) => {
    try {
      const res = await queuedAuthFetch(`${API}/recurring/${rule.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== rule.id));
        showToast(t('recDeleted'), 'success');
      }
    } catch {}
    setDeleteTarget(null);
  };

  const catList = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const renderRule = ({ item }) => {
    const amtColor = item.type === 'income' ? colors.green : colors.red;
    const sign = item.type === 'income' ? '+' : '-';
    return (
      <View style={s.ruleCard}>
        <View style={s.ruleLeft}>
          <View style={[s.ruleIcon, { backgroundColor: amtColor + '20' }]}>
            <Ionicons name={FREQ_ICONS[item.frequency] || 'refresh-outline'} size={18} color={amtColor} />
          </View>
          <View style={s.ruleInfo}>
            <View style={s.ruleTitleRow}>
              <Text style={s.ruleTitle} numberOfLines={1}>
                {item.description || t(item.category) || item.category}
              </Text>
              {!item.is_active && (
                <View style={s.pausedBadge}>
                  <Text style={s.pausedText}>{t('recPaused')}</Text>
                </View>
              )}
            </View>
            <Text style={s.ruleMeta}>
              {t('rec_' + item.frequency)} · {t(item.category)}
              {item.next_run_date ? ` · ${t('recNextRun')}: ${formatDate(item.next_run_date)}` : ''}
            </Text>
          </View>
        </View>
        <View style={s.ruleRight}>
          <Text style={[s.ruleAmount, { color: amtColor }]}>
            {sign}{symbol}{Number(item.amount).toFixed(2)}
          </Text>
          <View style={s.ruleActions}>
            <TouchableOpacity style={s.ruleActionBtn} onPress={() => toggleActive(item)}>
              <Ionicons
                name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22} color={colors.text3}
              />
            </TouchableOpacity>
            <TouchableOpacity style={s.ruleActionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="pencil-outline" size={20} color={colors.text3} />
            </TouchableOpacity>
            <TouchableOpacity style={s.ruleActionBtn} onPress={() => setDeleteTarget(item)}>
              <Ionicons name="trash-outline" size={20} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('recTitle')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={24} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : rules.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="repeat-outline" size={52} color={colors.text3} />
          <Text style={s.emptyText}>{t('recEmpty')}</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
            <Text style={s.emptyBtnText}>{t('recAdd')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={r => String(r.id)}
          renderItem={renderRule}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* Add/Edit modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={[s.dragHandle, { backgroundColor: colors.border }]} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingRule ? t('recEdit') : t('recAdd')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[s.closeBtn, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="close" size={18} color={colors.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type toggle */}
              <Text style={s.fieldLabel}>{t('type')}</Text>
              <View style={s.typeRow}>
                {['expense', 'income'].map(tp => (
                  <TouchableOpacity
                    key={tp}
                    style={[s.typeChip, form.type === tp && {
                      backgroundColor: tp === 'income' ? colors.green + '20' : colors.red + '20',
                      borderColor: tp === 'income' ? colors.green : colors.red,
                    }]}
                    onPress={() => {
                      const newCats = tp === 'income' ? INCOME_CATS : EXPENSE_CATS;
                      setForm(f => ({ ...f, type: tp, category: newCats[0] }));
                    }}
                  >
                    <Text style={[s.typeChipText, form.type === tp && {
                      color: tp === 'income' ? colors.green : colors.red,
                    }]}>
                      {t(tp === 'income' ? 'incomeOption' : 'expenseOption')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Dropdown
                style={{ marginBottom: 14 }}
                label={t('category')}
                value={form.category}
                onChange={(val) => setForm(f => ({ ...f, category: val }))}
                options={catList.map(cat => ({ value: cat, label: t(cat) }))}
              />

              {/* Description */}
              <Text style={s.fieldLabel}>{t('description')} ({t('goalOptional')})</Text>
              <TextInput
                style={s.input}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder={t('descriptionPlaceholder')}
                placeholderTextColor={colors.text3}
              />

              {/* Amount */}
              <Text style={s.fieldLabel}>{t('amount')}</Text>
              <TextInput
                style={s.input}
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={colors.text3}
                keyboardType="decimal-pad"
              />

              {/* Frequency */}
              <Text style={s.fieldLabel}>{t('recFrequency')}</Text>
              <View style={s.freqRow}>
                {FREQUENCIES.map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[s.freqChip, form.frequency === freq && s.freqChipActive]}
                    onPress={() => setForm(f => ({ ...f, frequency: freq }))}
                  >
                    <Text style={[s.freqChipText, form.frequency === freq && { color: colors.brand }]}>
                      {t('rec_' + freq)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day of month (only for monthly) */}
              {form.frequency === 'monthly' && (
                <>
                  <Text style={s.fieldLabel}>{t('recDayOfMonth')} (1–28)</Text>
                  <TextInput
                    style={s.input}
                    value={form.day_of_period}
                    onChangeText={v => setForm(f => ({ ...f, day_of_period: v }))}
                    placeholder="1"
                    placeholderTextColor={colors.text3}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <DatePickerField label={t('recStartDate')} value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} style={{ marginBottom: 14 }} />
              <DatePickerField label={`${t('recEndDate')} (${t('goalOptional')})`} value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} style={{ marginBottom: 14 }} />

              {/* Reminder */}
              <Dropdown
                style={{ marginBottom: 6 }}
                label={t('recReminder')}
                value={form.reminder_days === null ? 'none' : form.reminder_days}
                onChange={(v) => setForm(f => ({ ...f, reminder_days: v === 'none' ? null : v }))}
                options={RECURRING_REMINDER_OPTS.map(v => ({
                  value: v === null ? 'none' : v,
                  label: v === null ? t('subReminderNone') : v === 0 ? t('recReminderSameDay') : t(`recReminder${v}`),
                }))}
              />
              <Text style={{ color: colors.text3, fontSize: 12, marginBottom: 14, marginLeft: 2 }}>{t('recReminderHelp')}</Text>

              {/* Active toggle */}
              <View style={s.activeRow}>
                <Text style={s.activeLabel}>{t('recActive')}</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                  trackColor={{ false: colors.border2, true: colors.brandDim }}
                  thumbColor={form.is_active ? colors.brand : colors.text3}
                />
              </View>

              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.5 }]}
                onPress={saveRule}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.bg} />
                  : <Text style={s.submitBtnText}>{t('saveBtn')}</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: 16 }]}>
            <Text style={s.modalTitle}>{t('recDeleteTitle')}</Text>
            <Text style={s.deleteDesc}>
              {deleteTarget?.description || t(deleteTarget?.category) || deleteTarget?.category}
            </Text>
            <View style={s.delActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={s.cancelText}>{t('cancelBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.delConfirmBtn} onPress={() => deleteRule(deleteTarget)}>
                <Text style={s.delConfirmText}>{t('deleteBtn')}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { ...type.h2Serif, fontSize: 24, color: colors.text1 },
  addBtn: { padding: spacing.xs },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { ...type.body, fontSize: 15, color: colors.text3, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: colors.brand, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, marginTop: spacing.xs,
  },
  emptyBtnText: { color: colors.bg, fontFamily: fonts.bodySemibold },

  ruleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md + 2, flexDirection: 'row', alignItems: 'center',
  },
  ruleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleIcon: { width: 40, height: 40, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  ruleInfo: { flex: 1 },
  ruleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: 3 },
  ruleTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text1, flex: 1, letterSpacing: -0.2 },
  pausedBadge: {
    backgroundColor: colors.text3 + '30', borderRadius: radius.sm - 2,
    paddingHorizontal: spacing.xs + 2, paddingVertical: 2,
  },
  pausedText: { ...type.label, fontSize: 9, color: colors.text3 },
  ruleMeta: { ...type.small, fontSize: 12, color: colors.text3, lineHeight: 16 },
  ruleRight: { alignItems: 'flex-end', gap: spacing.xs + 2 },
  ruleAmount: { fontFamily: fonts.monoMedium, fontSize: 15 },
  ruleActions: { flexDirection: 'row', gap: 2 },
  ruleActionBtn: { padding: spacing.xs },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing['2xl'], paddingTop: spacing.lg, maxHeight: '90%', borderWidth: 1, borderColor: colors.border,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xl },
  closeBtn: { width: 32, height: 32, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] },
  modalTitle: { ...type.h2Serif, fontSize: 22, color: colors.text1 },

  fieldLabel: { ...type.label, color: colors.text2, marginBottom: spacing.sm, marginTop: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 11, color: colors.text1,
    fontFamily: fonts.body, fontSize: 15, backgroundColor: colors.bg, marginBottom: spacing.md + 2,
  },

  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md + 2 },
  typeChip: {
    flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  typeChipText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text2 },

  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg,
  },
  catChipActive: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  catChipText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text2 },

  freqRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md + 2 },
  freqChip: {
    flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  freqChipActive: { borderColor: colors.brand, backgroundColor: colors.brandDim },
  freqChipText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text2 },

  activeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xl, paddingVertical: spacing.xs,
  },
  activeLabel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text1 },

  submitBtn: {
    backgroundColor: colors.brand, borderRadius: radius.md + 2,
    paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.xs,
  },
  submitBtnText: { color: colors.bg, fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: -0.2 },

  deleteDesc: { ...type.body, fontSize: 14, color: colors.text2, marginBottom: spacing.xl, marginTop: spacing.sm },
  delActions: { flexDirection: 'row', gap: spacing.sm + 2 },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { color: colors.text1, fontFamily: fonts.bodySemibold },
  delConfirmBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.red, alignItems: 'center',
  },
  delConfirmText: { color: '#fff', fontFamily: fonts.bodyBold },
});
