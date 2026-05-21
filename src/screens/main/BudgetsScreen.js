import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCategories } from '../../context/CategoriesContext';
import { useToast } from '../../context/ToastContext';
import { API, authFetch, queuedAuthFetch } from '../../utils/api';
import { cacheFetch, setCached } from '../../utils/cacheFetch';
import { notifyBudgetExceeded, notifyBudgetWarning } from '../../utils/notifications';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Dropdown from '../../components/Dropdown';
import { spacing, radius, type, fonts } from '../../constants/tokens';

export default function BudgetsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { transactions, syncVersion } = useAuth();
  const { symbol } = useCurrency();
  const { expenseCats, getCatColor } = useCategories();
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [detailBudget, setDetailBudget] = useState(null);
  const [selCategory, setSelCategory] = useState('food');
  const [limitAmount, setLimitAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    cacheFetch(`${API}/budgets`, (d) => {
      if (Array.isArray(d)) setBudgets(d);
      setLoading(false);
    });
  }, [syncVersion]);

  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getSpent = (cat) => transactions
    .filter(tx => tx.type === 'expense' && tx.category === cat && (tx.date || '').slice(0, 7) === thisMonthPrefix)
    .reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);

  useEffect(() => {
    if (!budgets.length || !transactions.length) return;
    budgets.forEach(b => {
      const spent = getSpent(b.category);
      const limit = parseFloat(b.amount);
      const pct = Math.round((spent / limit) * 100);
      const label = t(b.category) || b.category;
      if (pct >= 100) {
        notifyBudgetExceeded(label, spent, limit, symbol, b.category, thisMonthPrefix).catch(() => {});
      } else if (pct >= 80) {
        notifyBudgetWarning(label, pct, symbol, spent, limit, b.category, thisMonthPrefix).catch(() => {});
      }
    });
  }, [transactions]);

  const openAdd = () => {
    setEditingBudget(null);
    setSelCategory('food');
    setLimitAmount('');
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setDetailBudget(null);
    setEditingBudget(b);
    setSelCategory(b.category);
    setLimitAmount(String(b.amount));
    setNotes(b.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(limitAmount.replace(',', '.'));
    if (!isFinite(amt) || amt <= 0) return;
    setSaving(true);
    try {
      const res = await queuedAuthFetch(`${API}/budgets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selCategory, amount: amt, notes: notes.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(prev => {
          const next = editingBudget
            ? prev.map(b => b.id === editingBudget.id ? data : b)
            : [...prev, data];
          setCached(`${API}/budgets`, next).catch(() => {});
          return next;
        });
        showToast(t('toastBudgetSaved'));
        setShowModal(false);
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

  const handleDelete = (b) => {
    setDetailBudget(null);
    setDeleteTarget(b);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const b = deleteTarget;
    setDeleteTarget(null);
    const res = await queuedAuthFetch(`${API}/budgets/${b.id}`, { method: 'DELETE' });
    if (res.ok) {
      setBudgets(prev => {
        const next = prev.filter(x => x.id !== b.id);
        setCached(`${API}/budgets`, next).catch(() => {});
        return next;
      });
      showToast(t('toastBudgetDeleted'));
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('budgets')}</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary header (always visible) — two cards side by side */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('totalBudget')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {symbol}{fmt(totalBudget)}
            </Text>
            {budgets.length > 0 && (
              <Text style={[styles.summarySub, { color: colors.text3 }]}>
                {budgets.length} {budgets.length === 1 ? t('category').toLowerCase() : t('allCategories').toLowerCase()}
              </Text>
            )}
          </Card>
          <Card style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('budgetSpent')}</Text>
            <Text style={[styles.summaryValue, { color: totalSpent > totalBudget ? colors.red : colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {symbol}{fmt(totalSpent)}
            </Text>
            {totalBudget > 0 && (
              <Text style={[styles.summarySub, { color: totalSpent > totalBudget ? colors.red : colors.text3 }]}>
                {((totalSpent / totalBudget) * 100).toFixed(0)}%
              </Text>
            )}
          </Card>
        </View>

        {/* Budget list */}
        {budgets.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={44} color={colors.text3} style={{ marginBottom: spacing.lg }} />
            <Text style={[styles.emptyText, { color: colors.text3 }]}>{t('budgetEmpty')}</Text>
            <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: colors.brand }]}>
              <Text style={{ color: '#fff', fontFamily: fonts.bodySemibold }}>{t('budgetAdd')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map(b => {
            const spent = getSpent(b.category);
            const limit = parseFloat(b.amount);
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const isOver = spent > limit;
            const isWarning = pct > 80 && !isOver;
            const barColor = isOver ? colors.red : isWarning ? colors.gold : colors.green;
            const remaining = limit - spent;

            return (
              <TouchableOpacity key={b.id} activeOpacity={0.8} onPress={() => setDetailBudget(b)}>
                <Card style={[styles.budgetCard, { borderColor: colors.border }]}>
                  <View style={styles.budgetHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.catDot, { backgroundColor: getCatColor(b.category, 'expense') }]} />
                      <Text style={[styles.budgetCat, { color: colors.text1 }]}>{t(b.category)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${barColor}18` }]}>
                      <Text style={[styles.badgeText, { color: barColor }]}>
                        {isOver ? t('budgetExceeded') : isWarning ? t('budgetWarning') : t('budgetOnTrack')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.budgetAmounts}>
                    <Text style={[styles.spentLabel, { color: colors.text3 }]}>
                      {symbol}{fmt(spent)} / {symbol}{fmt(limit)}
                    </Text>
                    <Text style={[styles.remainingLabel, { color: isOver ? colors.red : colors.text3 }]}>
                      {isOver ? `${t('budgetOverBy')} ${symbol}${fmt(Math.abs(remaining))}` : `${symbol}${fmt(remaining)} ${t('budgetRemaining')}`}
                    </Text>
                  </View>

                  <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.pctLabel, { color: colors.text3 }]}>{pct.toFixed(0)}%</Text>
                  {b.notes ? <Text style={[styles.noteText, { color: colors.text3 }]} numberOfLines={2}>{b.notes}</Text> : null}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!detailBudget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailBudget(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {detailBudget && (() => {
            const spent = getSpent(detailBudget.category);
            const limit = parseFloat(detailBudget.amount);
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const isOver = spent > limit;
            const isWarning = pct > 80 && !isOver;
            const barColor = isOver ? colors.red : isWarning ? colors.gold : colors.green;
            const remaining = limit - spent;
            const statusLabel = isOver ? t('budgetExceeded') : isWarning ? t('budgetWarning') : t('budgetOnTrack');
            const stats = [
              [t('budgetMonthlyLimit'), `${symbol}${fmt(limit)}`],
              [t('budgetSpent'), `${symbol}${fmt(spent)}`],
              [isOver ? t('budgetOverBy') : t('budgetRemaining'), `${symbol}${fmt(Math.abs(remaining))}`],
              [t('budgetUsedPct'), `${pct.toFixed(0)}%`],
            ];
            return (
              <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                <View style={[styles.detailContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                    <View style={[styles.catDotLg, { backgroundColor: getCatColor(detailBudget.category, 'expense') }]} />
                    <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                      <Text style={[styles.detailName, { color: colors.text1 }]} numberOfLines={1}>{t(detailBudget.category)}</Text>
                      <View style={[styles.badge, { backgroundColor: `${barColor}18`, alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[styles.badgeText, { color: barColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setDetailBudget(null)} style={{ padding: 4 }}>
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

                  {detailBudget.notes ? (
                    <Text style={[styles.detailNotes, { color: colors.text3, borderTopColor: colors.border }]}>{detailBudget.notes}</Text>
                  ) : null}

                  <View style={styles.detailBtns}>
                    <TouchableOpacity onPress={() => openEdit(detailBudget)} style={[styles.detailBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text1, fontFamily: fonts.bodySemibold, fontSize: 14 }}>{t('editBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(detailBudget)} style={[styles.detailBtn, { backgroundColor: `${colors.red}15`, borderColor: `${colors.red}40` }]}>
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
                  {editingBudget ? t('budgetEdit') : t('budgetAdd')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="close" size={18} color={colors.text2} />
                </TouchableOpacity>
              </View>

              <Dropdown
                label={t('budgetSelectCategory')}
                value={selCategory}
                onChange={setSelCategory}
                options={expenseCats.map(c => ({ value: c, label: t(c), dot: getCatColor(c, 'expense') }))}
                leftDot={getCatColor(selCategory, 'expense')}
                style={{ marginBottom: 20 }}
              />

              <Input label={t('budgetMonthlyLimit')} value={limitAmount} onChangeText={setLimitAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />
              <Input label={`${t('budgetNotes')} (${t('goalOptional')})`} value={notes} onChangeText={setNotes} placeholder={t('budgetNotesPlaceholder')} multiline numberOfLines={2} style={{ marginBottom: 24 }} />

              <Button title={saving ? t('savingBtn') : t('saveBtn')} onPress={handleSave} loading={saving} disabled={!limitAmount || parseFloat(limitAmount) <= 0} />
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
            <Text style={[styles.deleteTitle, { color: colors.text1 }]}>{t('deleteBudget')}</Text>
            <Text style={[styles.deleteSub, { color: colors.text3 }]} numberOfLines={2}>
              {deleteTarget ? t(deleteTarget.category) : ''}
              {'\n'}
              <Text style={{ fontFamily: fonts.monoMedium, color: colors.text2 }}>
                {symbol}{fmt(deleteTarget?.amount)}
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
  summaryRow: { flexDirection: 'row', gap: spacing.sm + 2, marginBottom: spacing.lg },
  summaryCard: { flex: 1, padding: spacing.lg },
  summaryLabel: { ...type.label, marginBottom: spacing.xs + 2 },
  summaryValue: { fontFamily: fonts.monoMedium, fontSize: 22, letterSpacing: -0.4, marginBottom: spacing.xs },
  summarySub: { fontFamily: fonts.mono, fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { ...type.body, fontSize: 14, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
  emptyBtn: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderRadius: radius.sm + 2 },
  budgetCard: { padding: spacing.lg, marginBottom: spacing.sm + 2 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  budgetCat: { fontFamily: fonts.bodySemibold, fontSize: 15, letterSpacing: -0.2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.md },
  badgeText: { ...type.label, fontSize: 10 },
  budgetAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  spentLabel: { fontFamily: fonts.mono, fontSize: 13 },
  remainingLabel: { fontFamily: fonts.monoMedium, fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', borderRadius: 3 },
  pctLabel: { fontFamily: fonts.mono, fontSize: 11, textAlign: 'right' },
  noteText: { ...type.small, fontSize: 12, marginTop: spacing.sm },
  detailContainer: { borderRadius: radius.lg + 2, borderWidth: 1, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1 },
  catDotLg: { width: 32, height: 32, borderRadius: 16 },
  detailName: { ...type.h2Serif, fontSize: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, margin: spacing.lg, borderRadius: radius.sm + 2, overflow: 'hidden' },
  statCell: { width: '50%', padding: spacing.md },
  statLabel: { ...type.label, fontSize: 9, marginBottom: spacing.xs },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 14 },
  detailNotes: { ...type.body, fontSize: 13, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  detailBtns: { flexDirection: 'row', gap: spacing.sm + 2, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  detailBtn: { flex: 1, height: 44, borderRadius: radius.sm + 2, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modal: { padding: spacing['2xl'], paddingBottom: spacing['4xl'] + 8 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing['2xl'] },
  closeBtn: { width: 32, height: 32, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] + 4 },
  modalTitle: { ...type.h2Serif, fontSize: 22 },
  fieldLabel: { ...type.label, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  deleteSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing['2xl'], paddingBottom: spacing['4xl'] },
  deleteIconWrap: { width: 60, height: 60, borderRadius: radius.lg + 2, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  deleteTitle: { ...type.h2Serif, fontSize: 20, textAlign: 'center', marginBottom: spacing.sm },
  deleteSub: { ...type.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'] + 4 },
  deleteConfirmBtn: { paddingVertical: 15, borderRadius: radius.md + 2, alignItems: 'center', marginBottom: spacing.sm + 2 },
  deleteCancelBtn: { paddingVertical: 15, borderRadius: radius.md + 2, alignItems: 'center', borderWidth: 1 },
});
