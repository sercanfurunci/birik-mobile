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
import { cacheFetch, setCached } from '../../utils/cacheFetch';
import { notifyGoalProgress } from '../../utils/notifications';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DatePickerField from '../../components/DatePickerField';
import { spacing, radius, type, fonts } from '../../constants/tokens';

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
  const [detailGoal, setDetailGoal] = useState(null);

  const [goalName, setGoalName] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    cacheFetch(`${API}/goals`, (d) => {
      if (Array.isArray(d)) setGoals(d);
      setLoading(false);
    });
  }, [syncVersion]);

  const openAdd = () => {
    setEditingGoal(null);
    setGoalName(''); setGoalEmoji('🎯'); setGoalTarget(''); setGoalSaved(''); setGoalDate('');
    setShowModal(true);
  };

  const openEdit = (g) => {
    setDetailGoal(null);
    setEditingGoal(g);
    setGoalName(g.name || '');
    setGoalEmoji(g.emoji || '🎯');
    setGoalTarget(String(g.target_amount || ''));
    setGoalSaved(String(g.saved_amount || ''));
    setGoalDate(g.target_date ? String(g.target_date).split('T')[0] : '');
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
        setGoals(prev => {
          const next = editingGoal ? prev.map(g => g.id === editingGoal.id ? data : g) : [...prev, data];
          setCached(`${API}/goals`, next).catch(() => {});
          return next;
        });
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
    setDetailGoal(null);
    setDeleteTarget(g);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const g = deleteTarget;
    setDeleteTarget(null);
    const res = await queuedAuthFetch(`${API}/goals/${g.id}`, { method: 'DELETE' });
    if (res.ok) {
      setGoals(prev => {
        const next = prev.filter(x => x.id !== g.id);
        setCached(`${API}/goals`, next).catch(() => {});
        return next;
      });
      showToast(t('toastGoalDeleted'));
    }
  };

  const getStatus = (g) => {
    const target = parseFloat(g.target_amount) || 0;
    const saved = parseFloat(g.saved_amount || 0);
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    if (pct >= 100) return { label: t('goalComplete'), color: colors.green, pct };
    if (!g.target_date) return { label: null, color: null, pct };
    const dateOnly = String(g.target_date).split('T')[0];
    const [y, m, d] = dateOnly.split('-').map(Number);
    if (!y || !m || !d) return { label: null, color: null, pct };
    const due = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
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
          <Ionicons name="add" size={22} color="#fff" />
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
                  <Text style={[styles.summarySub, { color: colors.brand, fontFamily: fonts.monoMedium }]}>
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
            <Ionicons name="flag-outline" size={44} color={colors.text3} style={{ marginBottom: spacing.lg }} />
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
              <TouchableOpacity key={g.id} activeOpacity={0.8} onPress={() => setDetailGoal(g)}>
                <Card style={[styles.goalCard, { borderColor: colors.border }]}>
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
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!detailGoal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailGoal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {detailGoal && (() => {
            const { label, color, pct } = getStatus(detailGoal);
            const target = parseFloat(detailGoal.target_amount) || 0;
            const saved = parseFloat(detailGoal.saved_amount || 0);
            const remaining = Math.max(0, target - saved);
            const done = pct >= 100;
            const barColor = done ? colors.green : colors.brand;
            const dateLabel = detailGoal.target_date ? formatDate(detailGoal.target_date) : '—';
            const stats = [
              [t('goalTarget'), `${symbol}${fmt(target)}`],
              [t('goalSaved'), `${symbol}${fmt(saved)}`],
              [t('goalRemaining'), `${symbol}${fmt(remaining)}`],
              [t('goalTargetDate'), dateLabel],
            ];
            return (
              <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                <View style={[styles.detailContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                    <Text style={{ fontSize: 40 }}>{detailGoal.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                      <Text style={[styles.detailName, { color: colors.text1 }]} numberOfLines={1}>{detailGoal.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ color: barColor, fontFamily: fonts.monoMedium, fontSize: 14 }}>{pct}%</Text>
                        {label && (
                          <View style={[styles.badge, { backgroundColor: `${color || colors.brand}18` }]}>
                            <Text style={[styles.badgeText, { color: color || colors.brand }]}>{label}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setDetailGoal(null)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={22} color={colors.text3} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.surface2, height: 8 }]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>
                  </View>

                  <View style={[styles.statsGrid, { borderColor: colors.border }]}>
                    {stats.map(([lbl, value], i) => (
                      <View key={lbl} style={[styles.statCell, {
                        backgroundColor: colors.surface2,
                        borderRightColor: colors.border,
                        borderBottomColor: colors.border,
                        borderRightWidth: i % 2 === 0 ? 1 : 0,
                        borderBottomWidth: i < 2 ? 1 : 0,
                      }]}>
                        <Text style={[styles.statLabel, { color: colors.text3 }]}>{lbl}</Text>
                        <Text style={[styles.statValue, { color: colors.text1 }]}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.detailBtns}>
                    <TouchableOpacity onPress={() => openEdit(detailGoal)} style={[styles.detailBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text1, fontFamily: fonts.bodySemibold, fontSize: 14 }}>{t('editBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(detailGoal)} style={[styles.detailBtn, { backgroundColor: `${colors.red}15`, borderColor: `${colors.red}40` }]}>
                      <Text style={{ color: colors.red, fontFamily: fonts.bodySemibold, fontSize: 14 }}>{t('deleteBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>

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
              <Text style={{ fontFamily: fonts.monoMedium, color: colors.text2 }}>
                {symbol}{fmt(deleteTarget?.target_amount)}
              </Text>
            </Text>
            <TouchableOpacity style={[styles.deleteConfirmBtn, { backgroundColor: colors.red }]} onPress={confirmDelete}>
              <Text style={{ color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 15 }}>{t('deleteBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteCancelBtn, { borderColor: colors.border }]} onPress={() => setDeleteTarget(null)}>
              <Text style={{ color: colors.text2, fontFamily: fonts.bodyMedium, fontSize: 15 }}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  headerTitle: { ...type.h2Serif, fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: radius.sm + 2, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  summaryCard: { padding: spacing.xl, marginBottom: spacing.lg },
  summaryLabel: { ...type.label, marginBottom: spacing.xs + 2 },
  summaryValue: { fontFamily: fonts.monoMedium, fontSize: 22, letterSpacing: -0.4, marginBottom: spacing.xs },
  summarySub: { fontFamily: fonts.body, fontSize: 11 },
  divider: { width: 1, marginHorizontal: spacing.xl, alignSelf: 'stretch' },
  summaryBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  summaryBarFill: { height: '100%', borderRadius: 3 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { ...type.body, fontSize: 14, textAlign: 'center' },
  goalCard: { padding: spacing.lg, marginBottom: spacing.sm + 2 },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  goalName: { fontFamily: fonts.bodySemibold, fontSize: 16, letterSpacing: -0.2, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.md, marginLeft: spacing.sm },
  badgeText: { ...type.label, fontSize: 10 },
  goalAmts: { fontFamily: fonts.mono, fontSize: 13 },
  goalPct: { fontFamily: fonts.monoMedium, fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  remaining: { fontFamily: fonts.body, fontSize: 12 },
  detailContainer: { borderRadius: radius.lg + 2, borderWidth: 1, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1 },
  detailName: { ...type.h2Serif, fontSize: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, margin: spacing.lg, borderRadius: radius.sm + 2, overflow: 'hidden' },
  statCell: { width: '50%', padding: spacing.md },
  statLabel: { ...type.label, fontSize: 9, marginBottom: spacing.xs },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 14 },
  detailBtns: { flexDirection: 'row', gap: spacing.sm + 2, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  detailBtn: { flex: 1, height: 44, borderRadius: radius.sm + 2, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modal: { padding: spacing['2xl'], paddingBottom: spacing['4xl'] + 8 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing['2xl'] },
  closeBtn: { width: 32, height: 32, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] + 4 },
  modalTitle: { ...type.h2Serif, fontSize: 22 },
  fieldLabel: { ...type.label, marginBottom: spacing.sm },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  emojiBtn: { width: 48, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000008' },
  deleteSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing['2xl'], paddingBottom: spacing['4xl'] },
  deleteIconWrap: { width: 60, height: 60, borderRadius: radius.lg + 2, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  deleteTitle: { ...type.h2Serif, fontSize: 20, textAlign: 'center', marginBottom: spacing.sm },
  deleteSub: { ...type.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'] + 4 },
  deleteConfirmBtn: { paddingVertical: 15, borderRadius: radius.md + 2, alignItems: 'center', marginBottom: spacing.sm + 2 },
  deleteCancelBtn: { paddingVertical: 15, borderRadius: radius.md + 2, alignItems: 'center', borderWidth: 1 },
});
