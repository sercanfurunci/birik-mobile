import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions, Image, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardPrefs, saveDashboardPrefs, DEFAULT_PREFS } from '../../utils/dashboardPrefs';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCategories } from '../../context/CategoriesContext';
import { API, authFetch } from '../../utils/api';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';

const { width: SCREEN_W } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, formatDate } = useLang();
  const { currentUser, transactions } = useAuth();
  const { symbol } = useCurrency();
  const { getCatColor } = useCategories();

  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    getDashboardPrefs().then(setPrefs);
  }, []);

  const togglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await saveDashboardPrefs(updated);
  };

  useFocusEffect(useCallback(() => {
    authFetch(`${API}/goals`).then(r => r.json()).then(d => Array.isArray(d) && setGoals(d)).catch(() => {});
    authFetch(`${API}/subscriptions`).then(r => r.json()).then(d => Array.isArray(d) && setSubscriptions(d)).catch(() => {});
  }, []));

  // Summary calculations
  const incomeTxs = transactions.filter(tx => tx.type === 'income');
  const expenseTxs = transactions.filter(tx => tx.type === 'expense');
  const totalIncome = incomeTxs.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const totalExpenses = expenseTxs.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  // This month
  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthExp = transactions.filter(tx => tx.type === 'expense' && (tx.date || '').slice(0, 7) === thisYM);
  const thisMonthTotal = thisMonthExp.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const dayElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayElapsed;
  const avgDaily = dayElapsed > 0 ? thisMonthTotal / dayElapsed : 0;

  // Category breakdown (top 5)
  const catData = useMemo(() => {
    return Object.entries(
      expenseTxs.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount || 0);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  // Running balance map (by tx id, sorted asc)
  const balanceMap = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const ad = (a.date || '').slice(0, 10);
      const bd = (b.date || '').slice(0, 10);
      if (ad !== bd) return ad.localeCompare(bd);
      return a.id - b.id;
    });
    const map = {};
    let running = 0;
    for (const tx of sorted) {
      const amt = parseFloat(tx.amount || 0);
      running += tx.type === 'income' ? amt : -amt;
      map[tx.id] = running;
    }
    return map;
  }, [transactions]);

  // Recent transactions
  const recent = useMemo(() => [...transactions]
    .sort((a, b) => {
      const ad = (b.date || '').slice(0, 10).localeCompare((a.date || '').slice(0, 10));
      return ad !== 0 ? ad : b.id - a.id;
    })
    .slice(0, 5), [transactions]);

  // Top category this month
  const topCat = Object.entries(
    thisMonthExp.reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const largestExp = expenseTxs.length > 0
    ? expenseTxs.reduce((max, tx) => parseFloat(tx.amount) > parseFloat(max.amount) ? tx : max, expenseTxs[0])
    : null;

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;

  // Daily distribution (net per day this month)
  const dailyData = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayKey = `${thisYM}-${String(d).padStart(2, '0')}`;
      const txs = transactions.filter(tx => (tx.date || '').slice(0, 10) === dayKey);
      const inc = txs.filter(tx => tx.type === 'income').reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
      const exp = txs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
      arr.push({ day: d, dayKey, net: inc - exp, inc, exp, txs });
    }
    return arr;
  }, [transactions, thisYM, daysInMonth]);

  const hasDaily = dailyData.some(d => d.txs.length > 0);
  const maxDailyAbs = Math.max(...dailyData.map(d => Math.abs(d.net)), 1);

  // End of month projection
  const projection = useMemo(() => {
    if (thisMonthExp.length < 2 || dayElapsed < 3 || daysLeft <= 0) return null;

    // median daily spend
    const dayTotals = {};
    thisMonthExp.forEach(tx => {
      const dKey = (tx.date || '').slice(0, 10);
      dayTotals[dKey] = (dayTotals[dKey] || 0) + parseFloat(tx.amount || 0);
    });
    const totals = Object.values(dayTotals).sort((a, b) => a - b);
    let variableRate = avgDaily;
    if (totals.length >= 5) {
      const mid = Math.floor(totals.length / 2);
      variableRate = totals.length % 2 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2;
    }

    // future scheduled (auto-charge subscriptions billing this month)
    let fixedUpcoming = 0;
    subscriptions.forEach(s => {
      if (s.is_active === false || !s.auto_charge) return;
      const nb = (s.next_billing_date || s.next_billing || '').slice(0, 10);
      if (!nb) return;
      if (nb.startsWith(thisYM) && nb >= `${thisYM}-${String(dayElapsed + 1).padStart(2, '0')}`) {
        fixedUpcoming += parseFloat(s.amount || 0);
      }
    });

    const projectedTotal = thisMonthTotal + variableRate * daysLeft + fixedUpcoming;

    // last month total
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
    const lastTotal = transactions
      .filter(tx => tx.type === 'expense' && (tx.date || '').slice(0, 7) === lastYM)
      .reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);

    const changePct = lastTotal > 0 ? ((projectedTotal - lastTotal) / lastTotal) * 100 : null;
    return { projectedTotal, fixedUpcoming, changePct };
  }, [thisMonthExp, dayElapsed, daysLeft, avgDaily, subscriptions, thisMonthTotal, transactions, thisYM, now]);

  // Month-over-month insight: last month up to the same day
  const monthInsight = useMemo(() => {
    if (thisMonthExp.length === 0) return null;
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
    const sameDayStr = `${lastYM}-${String(dayElapsed).padStart(2, '0')}`;
    const lastSameDay = transactions
      .filter(tx => tx.type === 'expense' && (tx.date || '').slice(0, 10) >= `${lastYM}-01` && (tx.date || '').slice(0, 10) <= sameDayStr)
      .reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
    if (lastSameDay === 0) return null;
    const diff = thisMonthTotal - lastSameDay;
    const pct = (diff / lastSameDay) * 100;
    return { thisMonthTotal, lastSameDay, diff, pct };
  }, [thisMonthExp, transactions, now, thisYM, dayElapsed, thisMonthTotal]);

  const incomeCount = incomeTxs.length;
  const expenseCount = expenseTxs.length;
  const totalCount = transactions.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header — logo + app name + username, matches web */}
        <View style={styles.header}>
          <Image source={require('../../../assets/birik-icon.png')} style={styles.logo} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.appName, { color: colors.text1 }]}>{t('appName')}</Text>
            {(currentUser?.username || currentUser?.email) && (
              <Text style={[styles.userName, { color: colors.text3 }]} numberOfLines={1}>
                {currentUser.username || currentUser.email}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowPrefs(true)} style={[styles.prefBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="options-outline" size={18} color={colors.text2} />
          </TouchableOpacity>
        </View>

        {/* Balance hero with counts */}
        <Card style={[styles.heroCard, { borderColor: colors.border }]}>
          <Text style={[styles.heroLabel, { color: colors.text3 }]}>{t('balance')}</Text>
          <Text style={[styles.heroBalance, { color: balance >= 0 ? colors.green : colors.red }]}>
            {balance < 0 ? '-' : ''}{symbol}{fmt(Math.abs(balance))}
          </Text>
          <Text style={[styles.heroCount, { color: colors.text3 }]}>
            {totalCount} {totalCount === 1 ? t('statTransaction') : t('statTransactions')}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroItem}>
              <Text style={[styles.heroItemLabel, { color: colors.text3 }]}>↑ {t('income')}</Text>
              <Text style={[styles.heroItemValue, { color: colors.green }]}>{symbol}{fmt(totalIncome)}</Text>
              <Text style={[styles.heroItemCount, { color: colors.text3 }]}>{incomeCount} {incomeCount === 1 ? t('statTransaction') : t('statTransactions')}</Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroItem}>
              <Text style={[styles.heroItemLabel, { color: colors.text3 }]}>↓ {t('expenses')}</Text>
              <Text style={[styles.heroItemValue, { color: colors.red }]}>{symbol}{fmt(totalExpenses)}</Text>
              <Text style={[styles.heroItemCount, { color: colors.text3 }]}>{expenseCount} {expenseCount === 1 ? t('statTransaction') : t('statTransactions')}</Text>
            </View>
          </View>
        </Card>

        {/* Empty state */}
        {transactions.length === 0 && (
          <Card style={[styles.emptyCard, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text1 }]}>{t('noTransactionsDash')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.text3 }]}>{t('addFirstTransaction')}</Text>
          </Card>
        )}

        {/* Month-over-month insight */}
        {monthInsight && (
          <Card style={[styles.insightCard, { borderColor: monthInsight.pct > 0 ? `${colors.red}55` : `${colors.green}55`, backgroundColor: monthInsight.pct > 0 ? `${colors.red}08` : `${colors.green}08` }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={[styles.insightTitle, { color: colors.text1 }]}>{t('insightHowGoing')}</Text>
              <View style={[styles.insightBadge, { backgroundColor: monthInsight.pct > 0 ? `${colors.red}18` : `${colors.green}18` }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: monthInsight.pct > 0 ? colors.red : colors.green }}>
                  {monthInsight.pct > 0 ? '+' : ''}{monthInsight.pct.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
              <View>
                <Text style={{ fontSize: 10, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{t('statThisMonth')}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: monthInsight.pct > 0 ? colors.red : colors.green }}>
                  {symbol}{fmt(monthInsight.thisMonthTotal)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{t('insightSameDayLastMonth')}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text2 }}>
                  {symbol}{fmt(monthInsight.lastSameDay)}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: monthInsight.pct > 0 ? colors.red : colors.green, marginTop: 8, fontWeight: '600' }}>
              {monthInsight.pct > 0 ? t('insightOverSpending') : t('insightOnTrack')}
            </Text>
          </Card>
        )}

        {/* This month stats */}
        {prefs.stats && thisMonthExp.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('statThisMonth').toUpperCase()}</Text>
            <View style={styles.statsGrid}>
              <Card style={[styles.statCard, { borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.text3 }]}>{t('statAvgDaily')}</Text>
                <Text style={[styles.statValue, { color: colors.text1 }]}>{symbol}{fmt(avgDaily)}</Text>
                <Text style={[styles.statSub, { color: colors.text3 }]}>{dayElapsed} {t('statDaysElapsed')}</Text>
              </Card>
              <Card style={[styles.statCard, { borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.text3 }]}>{t('statDaysLeft')}</Text>
                <Text style={[styles.statValue, { color: colors.brand }]}>{daysLeft}</Text>
                <Text style={[styles.statSub, { color: colors.text3 }]}>{t('statOfMonth')} {daysInMonth}</Text>
              </Card>
              <Card style={[styles.statCard, { borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.text3 }]}>{t('statTopCat')}</Text>
                <Text style={[styles.statValue, { color: colors.text1 }]} numberOfLines={1}>
                  {topCat ? t(topCat[0]) : '—'}
                </Text>
                {topCat && <Text style={[styles.statSub, { color: colors.text3 }]}>{symbol}{fmt(topCat[1])}</Text>}
              </Card>
              {savingsRate !== null ? (
                <Card style={[styles.statCard, { borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.text3 }]}>{t('statSavingsRate')}</Text>
                  <Text style={[styles.statValue, { color: savingsRate >= 0 ? colors.green : colors.red }]}>
                    {savingsRate.toFixed(1)}%
                  </Text>
                  <Text style={[styles.statSub, { color: colors.text3 }]}>{t('statAllTime')}</Text>
                </Card>
              ) : largestExp ? (
                <Card style={[styles.statCard, { borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.text3 }]}>{t('statLargestExp')}</Text>
                  <Text style={[styles.statValue, { color: colors.red }]}>-{symbol}{fmt(largestExp.amount)}</Text>
                  <Text style={[styles.statSub, { color: colors.text3 }]} numberOfLines={1}>
                    {largestExp.description || t(largestExp.category)}
                  </Text>
                </Card>
              ) : null}
            </View>
          </>
        )}

        {/* Expense breakdown with % */}
        {prefs.breakdown && catData.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('expenseBreakdown').toUpperCase()}</Text>
            <Card style={[styles.listCard, { borderColor: colors.border }]}>
              {catData.map(({ name, value }, i) => {
                const pct = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
                return (
                  <View key={name} style={[styles.catRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={[styles.catDot, { backgroundColor: getCatColor(name, 'expense') }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.catTopRow}>
                        <Text style={[styles.catName, { color: colors.text1 }]} numberOfLines={1}>{t(name)}</Text>
                        <Text style={[styles.catPct, { color: colors.text3 }]}>{pct.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.catBar}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: getCatColor(name, 'expense') }]} />
                      </View>
                      <Text style={[styles.catAmount, { color: colors.text2 }]}>{symbol}{fmt(value)}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Daily distribution chart */}
        {prefs.daily && hasDaily && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('dailyDist').toUpperCase()}</Text>
            <Card style={[styles.chartCard, { borderColor: colors.border }]}>
              <Text style={[styles.chartHint, { color: colors.text3 }]}>{t('dailyDistTapHint')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={styles.chartRow}>
                  {dailyData.map(d => {
                    const barH = d.net !== 0 ? Math.max(4, (Math.abs(d.net) / maxDailyAbs) * 80) : 2;
                    const positive = d.net >= 0;
                    const isSelected = selectedDay?.day === d.day;
                    return (
                      <TouchableOpacity
                        key={d.day}
                        onPress={() => setSelectedDay(isSelected ? null : d)}
                        activeOpacity={0.7}
                        style={styles.barCol}
                      >
                        <View style={{ height: 80, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <View style={{
                            width: 10,
                            height: barH,
                            borderRadius: 3,
                            backgroundColor: d.net === 0 ? colors.border : (positive ? colors.green : colors.red),
                            opacity: isSelected || !selectedDay ? 1 : 0.4,
                          }} />
                        </View>
                        {d.day % 5 === 0 || d.day === 1 || d.day === daysInMonth ? (
                          <Text style={{ fontSize: 9, color: colors.text3, marginTop: 4 }}>{d.day}</Text>
                        ) : (
                          <View style={{ height: 13 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {selectedDay && (
                <View style={[styles.dayDetail, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.dayDetailTitle, { color: colors.text1 }]}>
                      {t('dailyDistDay')} {selectedDay.day}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDay.net >= 0 ? colors.green : colors.red }}>
                      {t('dailyDistNet')}: {selectedDay.net >= 0 ? '+' : '-'}{symbol}{fmt(Math.abs(selectedDay.net))}
                    </Text>
                  </View>
                  {selectedDay.txs.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.text3 }}>{t('dailyDistEmpty')}</Text>
                  ) : (
                    selectedDay.txs
                      .slice()
                      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                      .map(tx => (
                        <View key={tx.id} style={styles.dayTxRow}>
                          <View style={[styles.dayDot, { backgroundColor: getCatColor(tx.category, tx.type) }]} />
                          <Text style={{ flex: 1, fontSize: 12, color: colors.text2 }} numberOfLines={1}>
                            {tx.description || t(tx.category)}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: tx.type === 'income' ? colors.green : colors.red }}>
                            {tx.type === 'income' ? '+' : '-'}{symbol}{fmt(tx.amount)}
                          </Text>
                        </View>
                      ))
                  )}
                </View>
              )}
            </Card>
          </>
        )}

        {/* End of month projection */}
        {prefs.projection && projection && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('projTitle').toUpperCase()}</Text>
            <Card style={[styles.projCard, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={[styles.projAmount, { color: colors.text1 }]}>
                  {symbol}{fmt(projection.projectedTotal)}
                </Text>
                {projection.changePct !== null && (
                  <View style={[styles.projBadge, {
                    backgroundColor: projection.changePct > 0 ? `${colors.red}18` : `${colors.green}18`,
                  }]}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: projection.changePct > 0 ? colors.red : colors.green,
                    }}>
                      {projection.changePct > 0 ? '+' : ''}{projection.changePct.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.projSubtitle, { color: colors.text3 }]}>{t('projSubtitle')}</Text>

              <View style={styles.projDetailsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.projDetailLabel, { color: colors.text3 }]}>{t('projSpentSoFar')}</Text>
                  <Text style={[styles.projDetailValue, { color: colors.text1 }]}>{symbol}{fmt(thisMonthTotal)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.projDetailLabel, { color: colors.text3 }]}>{t('projDaysLeft')}</Text>
                  <Text style={[styles.projDetailValue, { color: colors.text1 }]}>{daysLeft}</Text>
                </View>
                {projection.fixedUpcoming > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.projDetailLabel, { color: colors.text3 }]}>{t('projScheduled')}</Text>
                    <Text style={[styles.projDetailValue, { color: colors.brand }]}>+{symbol}{fmt(projection.fixedUpcoming)}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.projProgress, { backgroundColor: colors.surface2 }]}>
                <View style={[styles.projProgressFill, { width: `${(dayElapsed / daysInMonth) * 100}%`, backgroundColor: colors.brand }]} />
              </View>
            </Card>
          </>
        )}

        {/* Recent activity with running balance */}
        {prefs.recent && recent.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('recentActivity').toUpperCase()}</Text>
            <Card style={[styles.listCard, { borderColor: colors.border }]}>
              {recent.map((tx, i) => {
                const rb = balanceMap[tx.id];
                return (
                  <View key={tx.id} style={[styles.txRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={[styles.txDot, { backgroundColor: `${getCatColor(tx.category, tx.type)}20` }]}>
                      <View style={[styles.txDotInner, { backgroundColor: getCatColor(tx.category, tx.type) }]} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.txDesc, { color: colors.text1 }]} numberOfLines={1}>
                        {tx.description || t(tx.category)}
                      </Text>
                      <Text style={[styles.txMeta, { color: colors.text3 }]}>
                        {formatDate(tx.date)} · {t(tx.category)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.green : colors.red }]}>
                        {tx.type === 'income' ? '+' : '-'}{symbol}{fmt(tx.amount)}
                      </Text>
                      {rb !== undefined && (
                        <Text style={[styles.txBalance, { color: colors.text3 }]}>
                          {rb < 0 ? '-' : ''}{symbol}{fmt(Math.abs(rb))}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Goals widget */}
        {prefs.goals && goals.length > 0 && (
          <>
            <View style={[styles.sectionHeader]}>
              <Text style={[styles.sectionTitle, { color: colors.text3, marginBottom: 0 }]}>{t('dashGoals').toUpperCase()}</Text>
            </View>
            <Card style={[styles.listCard, { borderColor: colors.border }]}>
              {goals.slice(0, 3).map((g, i) => {
                const target = parseFloat(g.target_amount) || 0;
                const saved = parseFloat(g.saved_amount || 0);
                const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                const done = pct >= 100;
                const barColor = done ? colors.green : colors.brand;
                return (
                  <View key={g.id} style={[styles.goalRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={[styles.goalName, { color: colors.text1 }]} numberOfLines={1}>{g.name}</Text>
                        <Text style={{ color: barColor, fontSize: 13, fontWeight: '700' }}>{pct}%</Text>
                      </View>
                      <View style={[styles.goalBar, { backgroundColor: colors.surface2 }]}>
                        <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Dashboard preferences modal */}
      <Modal visible={showPrefs} transparent animationType="slide" onRequestClose={() => setShowPrefs(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPrefs(false)} />
        <View style={[styles.prefsSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.prefsHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.prefsTitle, { color: colors.text1 }]}>{t('dashCustomize')}</Text>
          {[
            { key: 'stats', label: t('dashSectionStats') },
            { key: 'breakdown', label: t('dashSectionBreakdown') },
            { key: 'daily', label: t('dashSectionDaily') },
            { key: 'projection', label: t('dashSectionProjection') },
            { key: 'recent', label: t('dashSectionRecent') },
            { key: 'goals', label: t('dashSectionGoals') },
          ].map(({ key, label }, i, arr) => (
            <View key={key} style={[styles.prefsRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.prefsLabel, { color: colors.text1 }]}>{label}</Text>
              <Switch
                value={prefs[key]}
                onValueChange={() => togglePref(key)}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logo: { width: 42, height: 42, borderRadius: 10 },
  appName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  userName: { fontSize: 12, marginTop: 2 },
  heroCard: { padding: 20, marginBottom: 20 },
  heroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  heroBalance: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  heroCount: { fontSize: 12, marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroItem: { flex: 1 },
  heroItemLabel: { fontSize: 12, marginBottom: 4 },
  heroItemValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  heroItemCount: { fontSize: 11 },
  heroDivider: { width: 1, height: 50, marginHorizontal: 16 },
  emptyCard: { padding: 40, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { padding: 14, flex: 1, minWidth: '45%' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  statSub: { fontSize: 11 },
  listCard: { marginBottom: 8, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4, alignSelf: 'flex-start' },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  catPct: { fontSize: 12, fontWeight: '600' },
  catBar: { height: 5, borderRadius: 3, backgroundColor: '#00000010', overflow: 'hidden', marginBottom: 4 },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { fontSize: 12, fontWeight: '500' },
  chartCard: { padding: 14, marginBottom: 8 },
  chartHint: { fontSize: 11, fontStyle: 'italic' },
  chartRow: { flexDirection: 'row', gap: 2, paddingVertical: 8 },
  barCol: { width: 14, alignItems: 'center' },
  dayDetail: { marginTop: 10, padding: 12, borderTopWidth: 1, borderRadius: 8, marginHorizontal: -2 },
  dayDetailTitle: { fontSize: 13, fontWeight: '700' },
  dayTxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  projCard: { padding: 16, marginBottom: 8 },
  projAmount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  projBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  projSubtitle: { fontSize: 11, marginBottom: 14, lineHeight: 16 },
  projDetailsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  projDetailLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  projDetailValue: { fontSize: 14, fontWeight: '700' },
  projProgress: { height: 4, borderRadius: 2, overflow: 'hidden' },
  projProgressFill: { height: '100%', borderRadius: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  txDot: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  txDotInner: { width: 8, height: 8, borderRadius: 4 },
  txDesc: { fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txMeta: { fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
  txBalance: { fontSize: 11, marginTop: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  goalName: { fontSize: 14, fontWeight: '500' },
  goalBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },
  insightCard: { padding: 16, marginBottom: 12, borderWidth: 1, borderRadius: 14 },
  insightTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  insightBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
});
