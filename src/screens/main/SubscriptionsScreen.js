import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Modal, KeyboardAvoidingView, Platform, Pressable, Switch, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, authFetch, queuedAuthFetch } from '../../utils/api';
import { scheduleSubscriptionReminders } from '../../utils/notifications';
import { fmt } from '../../utils/format';
import { todayLocalISO, parseLocalDate, advanceToNextBilling } from '../../utils/dateUtils';
import { CURRENCIES } from '../../constants/currencies';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Dropdown from '../../components/Dropdown';
import DatePickerField from '../../components/DatePickerField';

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORIES = ['ai', 'entertainment', 'music', 'finance', 'productivity', 'health', 'news', 'telecom', 'other'];
const CYCLES = ['monthly', 'yearly', 'weekly'];
const REMINDER_VALUES = [null, 3, 7, 14];

const CATEGORY_EMOJI = {
  ai: '✨', entertainment: '🎬', music: '🎵', finance: '🏦',
  productivity: '⚡', health: '❤️', news: '📰', telecom: '📱', other: '📦',
};

const SERVICE_DOMAIN = {
  'chatgpt': 'chat.openai.com', 'openai': 'openai.com',
  'claude': 'claude.ai', 'anthropic': 'anthropic.com',
  'spotify': 'spotify.com', 'netflix': 'netflix.com',
  'apple music': 'music.apple.com', 'apple tv': 'tv.apple.com',
  'youtube': 'youtube.com', 'discord': 'discord.com',
  'github': 'github.com', 'notion': 'notion.so',
  'figma': 'figma.com', 'adobe': 'adobe.com',
  'dropbox': 'dropbox.com', 'google one': 'one.google.com',
  'google': 'google.com', 'microsoft': 'microsoft.com',
  'zoom': 'zoom.us', 'slack': 'slack.com',
  'amazon prime': 'primevideo.com', 'amazon': 'amazon.com',
  'hbo': 'hbomax.com', 'disney': 'disneyplus.com', 'hulu': 'hulu.com',
  'icloud': 'icloud.com', 'duolingo': 'duolingo.com',
  'canva': 'canva.com', 'cursor': 'cursor.sh',
  'perplexity': 'perplexity.ai', 'midjourney': 'midjourney.com',
  'linear': 'linear.app', 'vercel': 'vercel.com',
  'twitch': 'twitch.tv', 'steam': 'store.steampowered.com',
};

const SERVICE_EMOJI = {
  chatgpt: '🤖', openai: '🤖', claude: '✳️', anthropic: '✳️',
  spotify: '🎵', netflix: '🎬', youtube: '▶️', discord: '💬',
  github: '⌨️', notion: '📝', figma: '🎨', adobe: '🎨',
  dropbox: '☁️', google: '🔍', microsoft: '💼', zoom: '📹',
  slack: '💬', amazon: '📦', hbo: '🎬', disney: '🎬',
  icloud: '☁️', duolingo: '🦜', canva: '🖌️', cursor: '⌨️',
  perplexity: '🔍', midjourney: '🎨', linear: '📋', vercel: '▲',
};

function getServiceDomain(name) {
  const lower = name.toLowerCase();
  const entries = Object.entries(SERVICE_DOMAIN).sort((a, b) => b[0].length - a[0].length);
  for (const [key, domain] of entries) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

function getServiceEmoji(name, category) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(SERVICE_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return CATEGORY_EMOJI[category] || '📦';
}

function monthlyEquivalent(amount, cycle) {
  if (cycle === 'weekly') return (amount * 52) / 12;
  if (cycle === 'yearly') return amount / 12;
  return amount;
}


function periodsActive(startedAt, cycle) {
  if (!startedAt) return 1;
  const start = parseLocalDate(startedAt) || new Date(startedAt);
  const now = new Date();
  if (cycle === 'weekly') {
    return Math.max(1, Math.floor((now - start) / (7 * 86400000)));
  }
  if (cycle === 'yearly') {
    const y = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(1, Math.floor(y / 12));
  }
  const m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(1, m);
}

// ── Rate cache ─────────────────────────────────────────────────────────────────
const _rateCache = {};
async function getRate(from, to) {
  if (from === to) return 1;
  const key = `${from}_${to}`;
  const cached = _rateCache[key];
  if (cached && Date.now() - cached.ts < 86_400_000) return cached.rate;
  try {
    const stored = await AsyncStorage.getItem(`rate_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.ts < 86_400_000) {
        _rateCache[key] = parsed;
        return parsed.rate;
      }
    }
  } catch {}
  try {
    const res = await fetch(`${API}/rates?from=${from}&to=${to}`);
    const data = await res.json();
    if (data.rate) {
      const entry = { rate: data.rate, ts: Date.now() };
      _rateCache[key] = entry;
      AsyncStorage.setItem(`rate_${key}`, JSON.stringify(entry)).catch(() => {});
    }
    return data.rate || _rateCache[key]?.rate || null;
  } catch {
    return _rateCache[key]?.rate || null;
  }
}

// ── ServiceIcon ────────────────────────────────────────────────────────────────
function ServiceIcon({ name, category, size = 40 }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const domain = getServiceDomain(name);
  const emoji = getServiceEmoji(name, category);

  if (!domain || failed) {
    return (
      <View style={[styles.iconCircle, { width: size, height: size, backgroundColor: colors.surface2 }]}>
        <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, { width: size, height: size, backgroundColor: colors.surface2 }]}>
      <Image
        source={{ uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=64` }}
        style={{ width: size * 0.6, height: size * 0.6, borderRadius: 4 }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

// ── SubCard ────────────────────────────────────────────────────────────────────
function SubCard({ sub, userCurrency, colors, t, formatDate, onPress }) {
  const [rate, setRate] = useState(null);
  const subCurr = CURRENCIES.find(c => c.code === sub.currency) || CURRENCIES[0];
  const needsConv = sub.currency && sub.currency !== userCurrency;
  const nextDate = advanceToNextBilling(sub.next_billing_date || sub.next_billing, sub.billing_cycle);
  const days = nextDate ? (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((nextDate - today) / 86400000);
  })() : null;

  useEffect(() => {
    if (needsConv) getRate(sub.currency, userCurrency).then(setRate);
  }, [sub.currency, userCurrency, needsConv]);

  const isOverdue = days !== null && days < 0;
  const isToday = days === 0;
  const isSoon = days !== null && days > 0 && days <= 7;
  const billingColor = isOverdue ? colors.red : (isToday || isSoon) ? colors.gold : colors.text3;

  const daysLabel = days === null ? null
    : days === 0 ? t('subToday')
    : days < 0 ? t('subOverdue')
    : `${days} ${t('subDays')}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={[styles.subCard, { borderColor: colors.border }]}>
        <View style={styles.subTop}>
          <ServiceIcon name={sub.name} category={sub.category} size={44} />
          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <Text style={[styles.subName, { color: colors.text1 }]} numberOfLines={1}>{sub.name}</Text>
            <Text style={[styles.subMeta, { color: colors.text3 }]}>
              {t(`subCat_${sub.category}`)} · {t(`subCycle_${sub.billing_cycle}`)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text style={[styles.subAmount, { color: colors.text1 }]}>
              {subCurr.symbol}{fmt(sub.amount)}
            </Text>
            {needsConv && rate && (
              <Text style={[styles.subConverted, { color: colors.brand }]}>
                ≈{CURRENCIES.find(c => c.code === userCurrency)?.symbol || ''}{fmt(parseFloat(sub.amount) * rate)}
              </Text>
            )}
            {sub.auto_charge && (
              <View style={[styles.autoBadge, { backgroundColor: colors.brandDim }]}>
                <Text style={{ color: colors.brand, fontSize: 9, fontWeight: '700' }}>{t('subAutoChargeBadge')}</Text>
              </View>
            )}
          </View>
        </View>

        {daysLabel && (
          <View style={[styles.billingRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.billingLabel, { color: colors.text3 }]}>{t('subNextBilling')}</Text>
            <Text style={[styles.billingDate, { color: billingColor }]}>
              {nextDate ? formatDate(nextDate.toISOString().slice(0, 10)) : '—'} · {daysLabel}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ── SubDetailModal ─────────────────────────────────────────────────────────────
function SubDetailModal({ sub, userCurrency, colors, t, formatDate, onClose, onEdit, onDelete, onAddExpense }) {
  const [rate, setRate] = useState(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseAdded, setExpenseAdded] = useState(false);
  const subCurr = CURRENCIES.find(c => c.code === sub.currency) || CURRENCIES[0];
  const userCurrObj = CURRENCIES.find(c => c.code === userCurrency) || subCurr;
  const needsConv = sub.currency && sub.currency !== userCurrency;
  const periods = periodsActive(sub.started_at, sub.billing_cycle);
  const totalSpent = parseFloat(sub.amount) * periods;
  const periodsLabel = sub.billing_cycle === 'weekly' ? t('subWeeksActive')
    : sub.billing_cycle === 'yearly' ? t('subYearsActive')
    : t('subMonthsActive');

  useEffect(() => {
    if (needsConv) getRate(sub.currency, userCurrency).then(setRate);
  }, [sub.currency, userCurrency, needsConv]);

  const nextDate = advanceToNextBilling(sub.next_billing_date || sub.next_billing, sub.billing_cycle);
  const days = nextDate ? (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((nextDate - today) / 86400000);
  })() : null;

  const daysLabel = days === null ? '—'
    : days === 0 ? t('subToday')
    : `${days} ${t('subDays')}`;

  const handleAddExpense = async () => {
    setAddingExpense(true);
    const convertedAmount = needsConv && rate ? parseFloat(sub.amount) * rate : parseFloat(sub.amount);
    await onAddExpense(sub, convertedAmount);
    setAddingExpense(false);
    setExpenseAdded(true);
    setTimeout(() => setExpenseAdded(false), 2500);
  };

  const stats = [
    [periodsLabel, String(periods)],
    [t('subTotalSpent'), `${subCurr.symbol}${fmt(totalSpent)}`],
    [t('subStartedAt'), sub.started_at ? formatDate(sub.started_at) : '—'],
    [t('subNextBilling'), daysLabel],
  ];

  return (
    <View style={[styles.detailContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
        <ServiceIcon name={sub.name} category={sub.category} size={48} />
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={[styles.detailName, { color: colors.text1 }]} numberOfLines={1}>{sub.name}</Text>
          <Text style={[styles.detailMeta, { color: colors.text3 }]}>
            <Text style={{ color: sub.is_active !== false ? colors.green : colors.text3 }}>●</Text>
            {' '}{sub.is_active !== false ? t('subStatusActive') : t('subStatusInactive')} · {subCurr.symbol}{fmt(sub.amount)}
            {needsConv && rate && (
              <Text style={{ color: colors.brand }}> ≈ {userCurrObj.symbol}{fmt(parseFloat(sub.amount) * rate)}</Text>
            )}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="close" size={22} color={colors.text3} />
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      <View style={[styles.statsGrid, { borderColor: colors.border }]}>
        {stats.map(([label, value], i) => (
          <View key={label} style={[styles.statCell, {
            backgroundColor: colors.surface2,
            borderRightColor: colors.border,
            borderBottomColor: colors.border,
            borderRightWidth: i % 2 === 0 ? 1 : 0,
            borderBottomWidth: i < 2 ? 1 : 0,
          }]}>
            <Text style={[styles.statLabel, { color: colors.text3 }]}>{label}</Text>
            <Text style={[styles.statValue, { color: colors.text1 }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.detailActions}>
        <TouchableOpacity
          onPress={handleAddExpense}
          disabled={addingExpense || expenseAdded || (needsConv && rate === null)}
          style={[styles.addExpenseBtn, {
            backgroundColor: colors.brand,
            opacity: (addingExpense || (needsConv && rate === null)) ? 0.6 : 1,
          }]}
        >
          {addingExpense ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {expenseAdded ? `✓ ${t('subExpenseAdded')}` : t('subAddAsExpense')}
              {needsConv && rate && !expenseAdded && ` (${userCurrObj.symbol}${fmt(parseFloat(sub.amount) * rate)})`}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.detailBtns}>
          <TouchableOpacity onPress={onEdit} style={[styles.detailBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={{ color: colors.text1, fontWeight: '600', fontSize: 14 }}>{t('editBtn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.detailBtn, { backgroundColor: `${colors.red}15`, borderColor: `${colors.red}40` }]}>
            <Text style={{ color: colors.red, fontWeight: '600', fontSize: 14 }}>{t('deleteBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sub.notes ? (
        <Text style={[styles.notes, { color: colors.text3, borderTopColor: colors.border }]}>{sub.notes}</Text>
      ) : null}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const { t, formatDate } = useLang();
  const { symbol: userSymbol, code: userCurrency } = useCurrency();
  const { showToast } = useToast();
  const { addTransaction, syncVersion } = useAuth();

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailSub, setDetailSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [rateMap, setRateMap] = useState({});
  const [filterCat, setFilterCat] = useState('all');

  // Form state
  const [subName, setSubName] = useState('');
  const [subCat, setSubCat] = useState('entertainment');
  const [subCycle, setSubCycle] = useState('monthly');
  const [subAmount, setSubAmount] = useState('');
  const [subCurrency, setSubCurrency] = useState(userCurrency);
  const [subStarted, setSubStarted] = useState(todayLocalISO());
  const [subNextBilling, setSubNextBilling] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [autoCharge, setAutoCharge] = useState(false);
  const [reminderDays, setReminderDays] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    authFetch(`${API}/subscriptions`)
      .then(r => r.json())
      .then(async d => {
        if (!Array.isArray(d)) return;
        setSubs(d);
        scheduleSubscriptionReminders(d).catch(() => {});
        // Fetch exchange rates for all unique currencies
        const uniqueCurrencies = [...new Set(d.map(s => s.currency).filter(c => c && c !== userCurrency))];
        const ratesObj = {};
        await Promise.all(uniqueCurrencies.map(async fromCur => {
          const rate = await getRate(fromCur, userCurrency);
          if (rate) ratesObj[fromCur] = rate;
        }));
        setRateMap(ratesObj);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userCurrency, syncVersion]);

  const resetForm = () => {
    setSubName(''); setSubCat('entertainment'); setSubCycle('monthly');
    setSubAmount(''); setSubCurrency(userCurrency); setSubStarted(todayLocalISO());
    setSubNextBilling(''); setSubNotes(''); setAutoCharge(false); setReminderDays(null);
  };

  const openAdd = () => {
    setEditingSub(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingSub(s);
    setDetailSub(null);
    setSubName(s.name || '');
    setSubCat(s.category || 'entertainment');
    setSubCycle(s.billing_cycle || 'monthly');
    setSubAmount(String(s.amount || ''));
    setSubCurrency(s.currency || userCurrency);
    setSubStarted((s.started_at || todayLocalISO()).slice(0, 10));
    setSubNextBilling((s.next_billing_date || s.next_billing || '').slice(0, 10));
    setSubNotes(s.notes || '');
    setAutoCharge(s.auto_charge || false);
    setReminderDays(s.reminder_days ?? null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!subName.trim() || !subAmount) return;
    setSaving(true);
    try {
      const body = {
        name: subName.trim(),
        category: subCat,
        billing_cycle: subCycle,
        amount: parseFloat(subAmount),
        currency: subCurrency,
        started_at: subStarted || null,
        next_billing_date: subNextBilling || null,
        notes: subNotes || null,
        auto_charge: autoCharge,
        reminder_days: reminderDays,
      };
      const url = editingSub ? `${API}/subscriptions/${editingSub.id}` : `${API}/subscriptions`;
      const method = editingSub ? 'PUT' : 'POST';
      const res = await queuedAuthFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = editingSub
          ? subs.map(s => s.id === editingSub.id ? data : s)
          : [...subs, data];
        setSubs(updated);
        scheduleSubscriptionReminders(updated).catch(() => {});
        showToast(editingSub ? t('toastSubUpdated') : t('toastSubAdded'));
        setShowModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s) => {
    setDetailSub(null);
    setDeleteTarget(s);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const s = deleteTarget;
    setDeleteTarget(null);
    const res = await queuedAuthFetch(`${API}/subscriptions/${s.id}`, { method: 'DELETE' });
    if (res.ok) {
      setSubs(prev => prev.filter(x => x.id !== s.id));
      showToast(t('toastSubDeleted'));
    }
  };

  const handleAddExpense = async (sub, convertedAmount) => {
    const SUB_TO_CAT = {
      ai: 'other', entertainment: 'entertainment', music: 'entertainment',
      finance: 'other', productivity: 'other', health: 'other',
      news: 'other', telecom: 'utilities', other: 'other',
    };
    await addTransaction({
      description: sub.name,
      amount: convertedAmount,
      type: 'expense',
      category: SUB_TO_CAT[sub.category] || 'other',
      date: todayLocalISO(),
    });
    showToast(t('toastTxAdded'));
  };

  // Monthly total converted to user's currency
  const monthlyTotal = subs
    .filter(s => s.is_active !== false)
    .reduce((total, s) => {
      const amt = parseFloat(s.amount || 0);
      const monthly = monthlyEquivalent(amt, s.billing_cycle);
      if (!s.currency || s.currency === userCurrency) return total + monthly;
      const rate = rateMap[s.currency];
      return total + (rate ? monthly * rate : monthly);
    }, 0);

  const activeSubs = subs.filter(s => s.is_active !== false);

  // Categories that have at least one subscription
  const usedCategories = useMemo(() => {
    const set = new Set(subs.map(s => s.category).filter(Boolean));
    return CATEGORIES.filter(c => set.has(c));
  }, [subs]);

  // Group subscriptions by category (only those that match filter)
  const groupedSubs = useMemo(() => {
    const filtered = filterCat === 'all' ? subs : subs.filter(s => s.category === filterCat);
    const groups = {};
    filtered.forEach(s => {
      const cat = s.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    // Sort each group by next billing date asc
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        const ad = a.next_billing_date || a.next_billing || '9999';
        const bd = b.next_billing_date || b.next_billing || '9999';
        return ad.localeCompare(bd);
      });
    });
    return CATEGORIES.filter(c => groups[c]).map(c => ({ cat: c, items: groups[c] }));
  }, [subs, filterCat]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('subscriptions')}</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        {subs.length > 0 && (
          <Card style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('subMonthlyTotal')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text1 }]}>
              ~{userSymbol}{fmt(monthlyTotal)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.text3 }]}>
              {activeSubs.length} {t('subActive')}
            </Text>
          </Card>
        )}

        {/* Category filter */}
        {usedCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setFilterCat('all')}
              style={[styles.chip, {
                backgroundColor: filterCat === 'all' ? colors.brand : colors.surface2,
                borderColor: filterCat === 'all' ? colors.brand : colors.border,
              }]}
            >
              <Text style={{ color: filterCat === 'all' ? '#fff' : colors.text2, fontSize: 12, fontWeight: '600' }}>
                {t('subAllCategories')}
              </Text>
            </TouchableOpacity>
            {usedCategories.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setFilterCat(c)}
                style={[styles.chip, {
                  backgroundColor: filterCat === c ? colors.brand : colors.surface2,
                  borderColor: filterCat === c ? colors.brand : colors.border,
                }]}
              >
                <Text style={{ color: filterCat === c ? '#fff' : colors.text2, fontSize: 12, fontWeight: '600' }}>
                  {CATEGORY_EMOJI[c]} {t(`subCat_${c}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* List */}
        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
        ) : subs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔄</Text>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>{t('subEmpty')}</Text>
          </View>
        ) : (
          groupedSubs.map(({ cat, items }) => (
            <View key={cat} style={{ marginBottom: 8 }}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupHeaderText, { color: colors.text2 }]}>
                  {CATEGORY_EMOJI[cat]} {t(`subCat_${cat}`)}
                </Text>
                <Text style={[styles.groupHeaderCount, { color: colors.text3 }]}>
                  {items.length}
                </Text>
              </View>
              {items.map(s => (
                <SubCard
                  key={s.id}
                  sub={s}
                  userCurrency={userCurrency}
                  colors={colors}
                  t={t}
                  formatDate={formatDate}
                  onPress={() => setDetailSub(s)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!detailSub}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailSub(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'flex-end' }}>
          <ScrollView>
            {detailSub && (
              <SubDetailModal
                sub={detailSub}
                userCurrency={userCurrency}
                colors={colors}
                t={t}
                formatDate={formatDate}
                onClose={() => setDetailSub(null)}
                onEdit={() => openEdit(detailSub)}
                onDelete={() => handleDelete(detailSub)}
                onAddExpense={handleAddExpense}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>
                  {editingSub ? t('subEdit') : t('subAdd')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="close" size={18} color={colors.text2} />
                </TouchableOpacity>
              </View>

              <Input label={t('subName')} value={subName} onChangeText={setSubName}
                placeholder="Netflix, Spotify…" style={{ marginBottom: 16 }} />

              {/* Amount + Currency */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <Input label={t('amount')} value={subAmount} onChangeText={setSubAmount}
                  placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none"
                  style={{ flex: 2 }} />
                <Dropdown
                  style={{ flex: 1 }}
                  label={t('currencyLabel')}
                  value={subCurrency}
                  onChange={setSubCurrency}
                  options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
                />
              </View>

              {/* Billing cycle */}
              <Dropdown
                style={{ marginBottom: 16 }}
                label={t('subBillingCycle')}
                value={subCycle}
                onChange={setSubCycle}
                options={CYCLES.map(c => ({ value: c, label: t(`subCycle_${c}`) }))}
              />

              {/* Category */}
              <Dropdown
                style={{ marginBottom: 16 }}
                label={t('category')}
                value={subCat}
                onChange={setSubCat}
                options={CATEGORIES.map(c => ({ value: c, label: `${CATEGORY_EMOJI[c]} ${t(`subCat_${c}`)}` }))}
              />

              <DatePickerField label={t('subStartedAt')} value={subStarted} onChange={setSubStarted} style={{ marginBottom: 16 }} />
              <DatePickerField label={t('subNextBilling')} value={subNextBilling} onChange={setSubNextBilling} style={{ marginBottom: 16 }} />

              {/* Reminder */}
              <Dropdown
                style={{ marginBottom: 6 }}
                label={t('subReminder')}
                value={reminderDays === null ? 'none' : reminderDays}
                onChange={(v) => setReminderDays(v === 'none' ? null : v)}
                options={REMINDER_VALUES.map(v => ({
                  value: v === null ? 'none' : v,
                  label: v === null ? t('subReminderNone') : t(`subReminder${v}`),
                }))}
              />
              <Text style={{ color: colors.text3, fontSize: 12, marginBottom: 16, marginLeft: 2 }}>{t('subReminderHelp')}</Text>

              <Input label={t('subNotes')} value={subNotes} onChangeText={setSubNotes}
                placeholder={t('subNotesPlaceholder')} multiline numberOfLines={3}
                style={{ marginBottom: 16 }} />

              {/* Auto-charge */}
              <View style={[styles.autoChargeRow, {
                borderColor: autoCharge ? `${colors.brand}50` : colors.border,
                backgroundColor: autoCharge ? colors.brandDim : colors.surface2,
              }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.autoChargeLabel, { color: colors.text1 }]}>{t('subAutoCharge')}</Text>
                  <Text style={[styles.autoChargeDesc, { color: colors.text3 }]}>{t('subAutoChargeDesc')}</Text>
                </View>
                <Switch
                  value={autoCharge}
                  onValueChange={setAutoCharge}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              <Button
                title={saving ? t('savingBtn') : t('saveBtn')}
                onPress={handleSave}
                loading={saving}
                disabled={!subName.trim() || !subAmount}
                style={{ marginTop: 8 }}
              />
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
            <Text style={[styles.deleteTitle, { color: colors.text1 }]}>{t('deleteSubscription')}</Text>
            <Text style={[styles.deleteSub, { color: colors.text3 }]} numberOfLines={2}>
              {deleteTarget?.name}
              {'\n'}
              <Text style={{ fontWeight: '600', color: colors.text2 }}>
                {(CURRENCIES.find(c => c.code === deleteTarget?.currency)?.symbol || userSymbol)}{fmt(deleteTarget?.amount)} · {t(`subCycle_${deleteTarget?.billing_cycle || 'monthly'}`)}
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
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  summaryValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  summarySub: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  groupHeaderText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  groupHeaderCount: { fontSize: 12, fontWeight: '600' },
  // SubCard
  subCard: { padding: 14, marginBottom: 10 },
  subTop: { flexDirection: 'row', alignItems: 'center' },
  subName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  subMeta: { fontSize: 12 },
  subAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  subConverted: { fontSize: 12, marginBottom: 2 },
  autoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  billingLabel: { fontSize: 12 },
  billingDate: { fontSize: 12, fontWeight: '600' },
  // ServiceIcon
  iconCircle: { borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  // Detail modal
  detailContainer: { margin: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  detailName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  detailMeta: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, margin: 16, borderRadius: 10, overflow: 'hidden' },
  statCell: { width: '50%', padding: 12 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  detailActions: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  addExpenseBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  detailBtns: { flexDirection: 'row', gap: 10 },
  detailBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  notes: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1 },
  // Form
  modal: { padding: 24, paddingBottom: 48 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  autoChargeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  autoChargeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  autoChargeDesc: { fontSize: 12, lineHeight: 16 },
  deleteSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  deleteIconWrap: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  deleteTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  deleteConfirmBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  deleteCancelBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
});
