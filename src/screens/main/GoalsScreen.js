import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { API, authFetch, queuedAuthFetch } from '../../utils/api';
import { notifyGoalProgress } from '../../utils/notifications';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DatePickerField from '../../components/DatePickerField';

const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💍', '📱', '🎓', '💰', '🏖️', '🎮', '🏋️', '🎸'];

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const { t, formatDate } = useLang();
  const { symbol } = useCurrency();
  const { showToast } = useToast();
  const { syncVersion } = useAuth();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [goalName, setGoalName] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    authFetch(`${API}/goals`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setGoals(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [syncVersion]);

  const openAdd = () => {
    setEditingGoal(null);
    setGoalName(''); setGoalEmoji('🎯'); setGoalTarget(''); setGoalSaved(''); setGoalDate('');
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditingGoal(g);
    setGoalName(g.name || '');
    setGoalEmoji(g.emoji || '🎯');
    setGoalTarget(String(g.target_amount || ''));
    setGoalSaved(String(g.saved_amount || ''));
    setGoalDate(g.target_date || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!goalName.trim() || !goalTarget) return;
    setSaving(true);
    try {
      const body = {
        name: goalName.trim(),
        emoji: goalEmoji,
        target_amount: parseFloat(goalTarget),
        saved_amount: parseFloat(goalSaved || '0'),
        target_date: goalDate || null,
      };
      const url = editingGoal ? `${API}/goals/${editingGoal.id}` : `${API}/goals`;
      const method = editingGoal ? 'PUT' : 'POST';
      const res = await queuedAuthFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(prev => editingGoal ? prev.map(g => g.id === editingGoal.id ? data : g) : [...prev, data]);
        showToast(t('toastGoalSaved'));
        setShowModal(false);
        const target = parseFloat(data.target_amount) || 0;
        const saved = parseFloat(data.saved_amount) || 0;
        const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
        notifyGoalProgress(data.name, data.id, pct).catch(() => {});
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.message || t('errorGeneric'));
      }
    } catch {
      showToast(t('errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (g) => {
    setDeleteTarget(g);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const g = deleteTarget;
    setDeleteTarget(null);
    const res = await queuedAuthFetch(`${API}/goals/${g.id}`, { method: 'DELETE' });
    if (res.ok) {
      setGoals(prev => prev.filter(x => x.id !== g.id));
      showToast(t('toastGoalDeleted'));
    }
  };

  const getStatus = (g) => {
    const target = parseFloat(g.target_amount) || 0;
    const saved = parseFloat(g.saved_amount || 0);
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    if (pct >= 100) return { label: t('goalComplete'), color: colors.green, pct };
    if (!g.target_date) return { label: null, color: null, pct };
    const due = new Date(g.target_date + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.round((due - now) / 86400000);
    if (diffDays < 0) return { label: t('goalOverdue'), color: colors.red, pct };
    if (diffDays === 0) return { label: t('goalToday'), color: colors.gold, pct };
    return { label: `${diffDays} ${t('goalDaysLeft')}`, color: null, pct };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('navGoals')}</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24 }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary header */}
        {goals.length > 0 && (() => {
          const totalTarget = goals.reduce((s, g) => s + (parseFloat(g.target_amount) || 0), 0);
          const totalSaved = goals.reduce((s, g) => s + (parseFloat(g.saved_amount) || 0), 0);
          const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
          return (
            <Card style={[styles.summaryCard, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('totalGoals')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {symbol}{fmt(totalTarget)}
                  </Text>
                  <Text style={[styles.summarySub, { color: colors.text3 }]}>{goals.length} {t('goalsSummary').toLowerCase()}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('totalSaved')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.green }]} numberOfLines={1} adjustsFontSizeToFit>
                    {symbol}{fmt(totalSaved)}
                  </Text>
                  <Text style={[styles.summarySub, { color: colors.brand, fontWeight: '700' }]}>
                    {overallPct.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={[styles.summaryBar, { backgroundColor: colors.surface2 }]}>
                <View style={[styles.summaryBarFill, { width: `${overallPct}%`, backgroundColor: colors.brand }]} />
              </View>
            </Card>
          );
        })()}

        {goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🎯</Text>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>{t('goalEmpty')}</Text>
          </View>
        ) : (
          goals.map(g => {
            const { label, color, pct } = getStatus(g);
            const target = parseFloat(g.target_amount) || 0;
            const saved = parseFloat(g.saved_amount || 0);
            const done = pct >= 100;
            const barColor = done ? colors.green : colors.brand;

            return (
              <Card key={g.id} style={[styles.goalCard, { borderColor: colors.border }]}>
                <View style={styles.goalTop}>
                  <Text style={{ fontSize: 32 }}>{g.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.goalName, { color: colors.text1 }]} numberOfLines={1}>{g.name}</Text>
                      {label && (
                        <View style={[styles.badge, { backgroundColor: `${color || colors.brand}18` }]}>
                          <Text style={[styles.badgeText, { color: color || colors.brand }]}>{label}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={[styles.goalAmts, { color: colors.text3 }]}>
                        {symbol}{fmt(saved)} / {symbol}{fmt(target)}
                      </Text>
                      <Text style={[styles.goalPct, { color: barColor }]}>{pct}%</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>

                {!done && (
                  <Text style={[styles.remaining, { color: colors.text3 }]}>
                    {symbol}{fmt(target - saved)} {t('goalRemaining')}
                    {g.target_date ? ` · ${formatDate(g.target_date)}` : ''}
                  </Text>
                )}

                <View style={styles.goalActions}>
                  <TouchableOpacity onPress={() => openEdit(g)}>
                    <Text style={{ color: colors.brand, fontSize: 13, fontWeight: '600' }}>{t('editBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(g)}>
                    <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600' }}>{t('deleteBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>
                  {editingGoal ? t('goalEdit') : t('goalAdd')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="close" size={18} color={colors.text2} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{t('goalEmoji')}</Text>
              <View style={styles.emojiGrid}>
                {EMOJIS.map(em => (
                  <TouchableOpacity key={em} onPress={() => setGoalEmoji(em)}
                    style={[styles.emojiBtn, goalEmoji === em && { backgroundColor: colors.brandDim, borderColor: colors.brand, borderWidth: 1.5 }]}>
                    <Text style={{ fontSize: 24 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label={t('goalName')} value={goalName} onChangeText={setGoalName} placeholder={t('goalNamePlaceholder')} style={{ marginBottom: 16 }} />
              <Input label={t('goalTarget')} value={goalTarget} onChangeText={setGoalTarget} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />
              <Input label={t('goalSaved')} value={goalSaved} onChangeText={setGoalSaved} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />
              <DatePickerField label={`${t('goalTargetDate')} (${t('goalOptional')})`} value={goalDate} onChange={setGoalDate} style={{ marginBottom: 24 }} />

              <Button title={saving ? t('savingBtn') : t('saveBtn')} onPress={handleSave} loading={saving} disabled={!goalName.trim() || !goalTarget} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setDeleteTarget(null)}>
          <Pressable onPress={() => {}} style={[styles.deleteSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }]} />
            <View style={[styles.deleteIconWrap, { backgroundColor: `${colors.red}18` }]}>
              <Ionicons name="trash-outline" size={28} color={colors.red} />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text1 }]}>{t('deleteGoal')}</Text>
            <Text style={[styles.deleteSub, { color: colors.text3 }]} numberOfLines={2}>
              {deleteTarget?.emoji} {deleteTarget?.name}
              {'\n'}
              <Text style={{ fontWeight: '600', color: colors.text2 }}>
                {symbol}{fmt(deleteTarget?.target_amount)}
              </Text>
            </Text>
            <TouchableOpacity style={[styles.deleteConfirmBtn, { backgroundColor: colors.red }]} onPress={confirmDelete}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('deleteBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteCancelBtn, { borderColor: colors.border }]} onPress={() => setDeleteTarget(null)}>
              <Text style={{ color: colors.text2, fontWeight: '600', fontSize: 15 }}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  summaryCard: { padding: 20, marginBottom: 16 },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  summarySub: { fontSize: 11 },
  divider: { width: 1, marginHorizontal: 20, alignSelf: 'stretch' },
  summaryBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  summaryBarFill: { height: '100%', borderRadius: 3 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  goalCard: { padding: 16, marginBottom: 10 },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  goalName: { fontSize: 16, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  goalAmts: { fontSize: 13 },
  goalPct: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  remaining: { fontSize: 12, marginBottom: 12 },
  goalActions: { flexDirection: 'row', gap: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiBtn: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000008' },
  deleteSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  deleteIconWrap: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  deleteTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  deleteConfirmBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  deleteCancelBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
});
