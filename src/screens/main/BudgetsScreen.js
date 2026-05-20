import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCategories } from '../../context/CategoriesContext';
import { useToast } from '../../context/ToastContext';
import { API, authFetch, queuedAuthFetch } from '../../utils/api';
import { notifyBudgetExceeded, notifyBudgetWarning } from '../../utils/notifications';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Dropdown from '../../components/Dropdown';

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
  const [selCategory, setSelCategory] = useState('food');
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch(`${API}/budgets`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBudgets(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
        notifyBudgetExceeded(label, spent, limit, symbol).catch(() => {});
      } else if (pct >= 80) {
        notifyBudgetWarning(label, pct, symbol, spent, limit).catch(() => {});
      }
    });
  }, [transactions]);

  const openAdd = () => {
    setEditingBudget(null);
    setSelCategory('food');
    setLimitAmount('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingBudget(b);
    setSelCategory(b.category);
    setLimitAmount(String(b.amount));
    setShowModal(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(limitAmount);
    if (!isFinite(amt) || amt <= 0) return;
    setSaving(true);
    try {
      const url = editingBudget ? `${API}/budgets/${editingBudget.id}` : `${API}/budgets`;
      const method = editingBudget ? 'PUT' : 'POST';
      const res = await queuedAuthFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selCategory, amount: amt }),
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(prev => editingBudget
          ? prev.map(b => b.id === editingBudget.id ? data : b)
          : [...prev, data]);
        showToast(t('toastBudgetSaved'));
        setShowModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (b) => {
    Alert.alert(t('budgets'), `Remove budget for ${t(b.category)}?`, [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('deleteBtn'), style: 'destructive',
        onPress: async () => {
          const res = await queuedAuthFetch(`${API}/budgets/${b.id}`, { method: 'DELETE' });
          if (res.ok) {
            setBudgets(prev => prev.filter(x => x.id !== b.id));
            showToast(t('toastBudgetDeleted'));
          }
        },
      },
    ]);
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('budgets')}</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24 }}>+</Text>
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
            <Text style={{ fontSize: 40, marginBottom: 16 }}>💰</Text>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>{t('budgetEmpty')}</Text>
            <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: colors.brand }]}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{t('budgetAdd')}</Text>
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
              <Card key={b.id} style={[styles.budgetCard, { borderColor: colors.border }]}>
                <View style={styles.budgetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.catDot, { backgroundColor: getCatColor(b.category, 'expense') }]} />
                    <Text style={[styles.budgetCat, { color: colors.text1 }]}>{t(b.category)}</Text>
                    <View style={[styles.badge, {
                      backgroundColor: `${barColor}18`,
                    }]}>
                      <Text style={[styles.badgeText, { color: barColor }]}>
                        {isOver ? t('budgetExceeded') : isWarning ? t('budgetWarning') : t('budgetOnTrack')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openEdit(b)}>
                      <Text style={{ color: colors.brand, fontSize: 13, fontWeight: '600' }}>{t('editBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(b)}>
                      <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600' }}>{t('deleteBtn')}</Text>
                    </TouchableOpacity>
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
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>
                  {editingBudget ? t('budgetEdit') : t('budgetAdd')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.text3, fontSize: 20 }}>✕</Text>
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

              <Input label={t('budgetMonthlyLimit')} value={limitAmount} onChangeText={setLimitAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 24 }} />

              <Button title={saving ? t('savingBtn') : t('saveBtn')} onPress={handleSave} loading={saving} disabled={!limitAmount || parseFloat(limitAmount) <= 0} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 16 },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  summarySub: { fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  budgetCard: { padding: 16, marginBottom: 10 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  budgetCat: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  budgetAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  spentLabel: { fontSize: 13 },
  remainingLabel: { fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  pctLabel: { fontSize: 11, textAlign: 'right' },
  modal: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
