import { View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, StatusBar, Dimensions, Image, Modal, Switch } from 'react-native';
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
import { cacheFetch } from '../../utils/cacheFetch';
import { fmt } from '../../utils/format';
import { spacing, radius, type, fonts } from '../../constants/tokens';
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
    cacheFetch(`${API}/goals`, d => { if (Array.isArray(d)) setGoals(d); });
    cacheFetch(`${API}/subscriptions`, d => { if (Array.isArray(d)) setSubscriptions(d); });
  }, []));

  const incomeTxs = transactions.filter(tx => tx.type === 'income');
  const expenseTxs = transactions.filter(tx => tx.type === 'expense');
  const totalIncome = incomeTxs.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const totalExpenses = expenseTxs.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthExp = transactions.filter(tx => tx.type === 'expense' && (tx.date || '').slice(0, 7) === thisYM);
  const thisMonthTotal = thisMonthExp.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const dayElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayElapsed;
  const avgDaily = dayElapsed > 0 ? thisMonthTotal / dayElapsed : 0;

  const catData = useMemo(() => {
    return Object.entries(
      expenseTxs.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount || 0);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

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

  const recent = useMemo(() => [...transactions]
    .sort((a, b) => {
      const ad = (b.date || '').slice(0, 10).localeCompare((a.date || '').slice(0, 10));
      return ad !== 0 ? ad : b.id - a.id;
    })
    .slice(0, 5), [transactions]);

  const topCat = Object.entries(
    thisMonthExp.reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const largestExp = expenseTxs.length > 0
    ? expenseTxs.reduce((max, tx) => parseFloat(tx.amount) > parseFloat(max.amount) ? tx : max, expenseTxs[0])
    : null;

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;

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

  const projection = useMemo(() => {
    if (thisMonthExp.length < 2 || dayElapsed < 3 || daysLeft <= 0) return null;
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
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
    const lastTotal = transactions
      .filter(tx => tx.type === 'expense' && (tx.date || '').slice(0, 7) === lastYM)
      .reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
    const changePct = lastTotal > 0 ? ((projectedTotal - lastTotal) / lastTotal) * 100 : null;
    return { projectedTotal, fixedUpcoming, changePct };
  }, [thisMonthExp, dayElapsed, daysLeft, avgDaily, subscriptions, thisMonthTotal, transactions, thisYM, now]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setSelectedDay(null)}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../../assets/birik-icon-fg.png')} style={styles.logo} />
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

        {/* Balance hero */}
        <Card style={[styles.heroCard, { borderColor: colors.border }]}>
          <Text style={[styles.heroLabel, { color: colors.text3 }]}>{t('balance')}</Text>
          <Text style={[styles.heroBalance, { color: balance >= 0 ? colors.green : colors.red }]}>
            {balance < 0 ? '−' : ''}{symbol}{fmt(Math.abs(balance))}
          </Text>
          <Text style={[styles.heroCount, { color: colors.text3 }]}>
            {totalCount} {totalCount === 1 ? t('statTransaction') : t('statTransactions')}
          </Text>

          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

          <View style={styles.heroRow}>
            <View style={styles.heroItem}>
              <View style={styles.heroItemHeader}>
                <Ionicons name="trending-up-outline" size={14} color={colors.green} />
                <Text style={[styles.heroItemLabel, { color: colors.text3 }]}>{t('income')}</Text>
              </View>
              <Text style={[styles.heroItemValue, { color: colors.green }]}>{symbol}{fmt(totalIncome)}</Text>
              <Text style={[styles.heroItemCount, { color: colors.text3 }]}>{incomeCount} {incomeCount === 1 ? t('statTransaction') : t('statTransactions')}</Text>
            </View>
            <View style={[styles.heroVertDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroItem}>
              <View style={styles.heroItemHeader}>
                <Ionicons name="trending-down-outline" size={14} color={colors.red} />
                <Text style={[styles.heroItemLabel, { color: colors.text3 }]}>{t('expenses')}</Text>
              </View>
              <Text style={[styles.heroItemValue, { color: colors.red }]}>{symbol}{fmt(totalExpenses)}</Text>
              <Text style={[styles.heroItemCount, { color: colors.text3 }]}>{expenseCount} {expenseCount === 1 ? t('statTransaction') : t('statTransactions')}</Text>
            </View>
          </View>
        </Card>

        {/* Empty state */}
        {transactions.length === 0 && (
          <Card style={[styles.emptyCard, { borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.brandDim }]}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text1 }]}>{t('noTransactionsDash')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.text3 }]}>{t('addFirstTransaction')}</Text>
          </Card>
        )}

        {/* Month-over-month insight */}
        {monthInsight && (
          <Card style={[styles.insightCard, { borderColor: colors.border, overflow: 'hidden' }]}>
            <View style={[styles.insightAccent, { backgroundColor: monthInsight.pct > 0 ? colors.red : colors.green }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={[styles.insightTitle, { color: colors.text1 }]}>{t('insightHowGoing')}</Text>
              <View style={[styles.insightBadge, { backgroundColor: monthInsight.pct > 0 ? colors.red : colors.green }]}>
                <Text style={styles.insightBadgeText}>
                  {monthInsight.pct > 0 ? '+' : ''}{monthInsight.pct.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: colors.text3 }]}>{t('statThisMonth')}</Text>
                <Text style={[styles.insightAmount, { color: monthInsight.pct > 0 ? colors.red : colors.green }]}>
                  {symbol}{fmt(monthInsight.thisMonthTotal)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: colors.text3 }]}>{t('insightSameDayLastMonth')}</Text>
                <Text style={[styles.insightAmount, { color: colors.text2 }]}>
                  {symbol}{fmt(monthInsight.lastSameDay)}
                </Text>
              </View>
            </View>
            <Text style={[styles.insightFooter, { color: monthInsight.pct > 0 ? colors.red : colors.green }]}>
              {monthInsight.pct > 0 ? t('insightOverSpending') : t('insightOnTrack')}
            </Text>
          </Card>
        )}

        {/* This month stats */}
        {prefs.stats && thisMonthExp.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('statThisMonth')}</Text>
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
                <Text style={[styles.statValueText, { color: colors.text1 }]} numberOfLines={1}>
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
                  <Text style={[styles.statValue, { color: colors.red }]}>−{symbol}{fmt(largestExp.amount)}</Text>
                  <Text style={[styles.statSub, { color: colors.text3 }]} numberOfLines={1}>
                    {largestExp.description || t(largestExp.category)}
                  </Text>
                </Card>
              ) : null}
            </View>
          </>
        )}

        {/* Expense breakdown */}
        {prefs.breakdown && catData.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('expenseBreakdown')}</Text>
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
                      <View style={[styles.catBar, { backgroundColor: colors.surface2 }]}>
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

        {/* Daily distribution */}
        {prefs.daily && hasDaily && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('dailyDist')}</Text>
            <Pressable onPress={() => setSelectedDay(null)}>
              <Card style={[styles.chartCard, { borderColor: colors.border }]}>
                <Text style={[styles.chartHint, { color: colors.text3 }]}>{t('dailyDistTapHint')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }} onScrollBeginDrag={() => setSelectedDay(null)}>
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
                            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.text3, marginTop: 4 }}>{d.day}</Text>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                      <Text style={[styles.dayDetailTitle, { color: colors.text1 }]}>
                        {t('dailyDistDay')} {selectedDay.day}
                      </Text>
                      <Text style={{ fontFamily: fonts.monoMedium, fontSize: 13, color: selectedDay.net >= 0 ? colors.green : colors.red }}>
                        {t('dailyDistNet')}: {selectedDay.net >= 0 ? '+' : '−'}{symbol}{fmt(Math.abs(selectedDay.net))}
                      </Text>
                    </View>
                    {selectedDay.txs.length === 0 ? (
                      <Text style={{ ...type.small, color: colors.text3 }}>{t('dailyDistEmpty')}</Text>
                    ) : (
                      selectedDay.txs
                        .slice()
                        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                        .map(tx => (
                          <View key={tx.id} style={styles.dayTxRow}>
                            <View style={[styles.dayDot, { backgroundColor: getCatColor(tx.category, tx.type) }]} />
                            <Text style={{ flex: 1, ...type.small, color: colors.text2 }} numberOfLines={1}>
                              {tx.description || t(tx.category)}
                            </Text>
                            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 12, color: tx.type === 'income' ? colors.green : colors.red }}>
                              {tx.type === 'income' ? '+' : '−'}{symbol}{fmt(tx.amount)}
                            </Text>
                          </View>
                        ))
                    )}
                  </View>
                )}
              </Card>
            </Pressable>
          </>
        )}

        {/* End of month projection */}
        {prefs.projection && projection && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('projTitle')}</Text>
            <Card style={[styles.projCard, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                <Text style={[styles.projAmount, { color: colors.text1 }]}>
                  {symbol}{fmt(projection.projectedTotal)}
                </Text>
                {projection.changePct !== null && (
                  <View style={[styles.projBadge, {
                    backgroundColor: projection.changePct > 0 ? `${colors.red}18` : `${colors.green}18`,
                  }]}>
                    <Text style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 12,
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
                  <Text style={[styles.miniLabel, { color: colors.text3 }]}>{t('projSpentSoFar')}</Text>
                  <Text style={[styles.projDetailValue, { color: colors.text1 }]}>{symbol}{fmt(thisMonthTotal)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: colors.text3 }]}>{t('projDaysLeft')}</Text>
                  <Text style={[styles.projDetailValue, { color: colors.text1 }]}>{daysLeft}</Text>
                </View>
                {projection.fixedUpcoming > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: colors.text3 }]}>{t('projScheduled')}</Text>
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

        {/* Recent activity */}
        {prefs.recent && recent.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('recentActivity')}</Text>
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
                        {tx.type === 'income' ? '+' : '−'}{symbol}{fmt(tx.amount)}
                      </Text>
                      {rb !== undefined && (
                        <Text style={[styles.txBalance, { color: colors.text3 }]}>
                          {rb < 0 ? '−' : ''}{symbol}{fmt(Math.abs(rb))}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Goals */}
        {prefs.goals && goals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{t('dashGoals')}</Text>
            <Card style={[styles.listCard, { borderColor: colors.border }]}>
              {goals.slice(0, 3).map((g, i) => {
                const target = parseFloat(g.target_amount) || 0;
                const saved = parseFloat(g.saved_amount || 0);
                const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                const done = pct >= 100;
                const barColor = done ? colors.green : colors.brand;
                return (
                  <View key={g.id} style={[styles.goalRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={[styles.goalName, { color: colors.text1 }]} numberOfLines={1}>{g.name}</Text>
                        <Text style={{ color: barColor, fontFamily: fonts.bodySemibold, fontSize: 13 }}>{pct}%</Text>
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

      <Modal visible={showPrefs} transparent animationType="slide" onRequestClose={() => setShowPrefs(false)}>
        <View style={styles.modalOverlayContainer}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  logo: { width: 52, height: 52 },
  appName: { ...type.h2Serif, fontSize: 26 },
  userName: { ...type.small, marginTop: 2 },
  prefBtn: { width: 38, height: 38, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  heroCard: { padding: spacing.xl, marginBottom: spacing.xl },
  heroLabel: { ...type.label, marginBottom: spacing.sm },
  heroBalance: { fontFamily: fonts.monoMedium, fontSize: 40, letterSpacing: -1.4, marginBottom: 4 },
  heroCount: { ...type.small },
  heroDivider: { height: 1, marginVertical: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroItem: { flex: 1 },
  heroItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroItemLabel: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  heroItemValue: { fontFamily: fonts.monoMedium, fontSize: 18, marginBottom: 2, letterSpacing: -0.4 },
  heroItemCount: { ...type.small, fontSize: 11 },
  heroVertDivider: { width: 1, height: 50, marginHorizontal: spacing.lg },

  emptyCard: { padding: spacing['3xl'], alignItems: 'center', marginBottom: spacing.lg },
  emptyIconWrap: { width: 64, height: 64, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  emptyTitle: { ...type.h3, marginBottom: spacing.sm, textAlign: 'center' },
  emptyDesc: { ...type.caption, textAlign: 'center' },

  sectionTitle: { ...type.label, marginBottom: spacing.md, marginTop: spacing.sm },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { padding: spacing.md, flex: 1, minWidth: '45%' },
  statLabel: { ...type.label, fontSize: 10, marginBottom: spacing.sm },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 22, marginBottom: 4, letterSpacing: -0.5 },
  statValueText: { fontFamily: fonts.bodySemibold, fontSize: 18, marginBottom: 4, letterSpacing: -0.3 },
  statSub: { ...type.small, fontSize: 11 },

  miniLabel: { ...type.label, fontSize: 10, marginBottom: 3 },

  listCard: { marginBottom: spacing.sm, overflow: 'hidden' },

  catRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1, marginRight: spacing.sm, letterSpacing: -0.2 },
  catPct: { fontFamily: fonts.mono, fontSize: 12 },
  catBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { fontFamily: fonts.mono, fontSize: 12 },

  chartCard: { padding: spacing.md, marginBottom: spacing.sm },
  chartHint: { ...type.small, fontStyle: 'italic' },
  chartRow: { flexDirection: 'row', gap: 2, paddingVertical: spacing.sm },
  barCol: { width: 14, alignItems: 'center' },
  dayDetail: { marginTop: spacing.md, padding: spacing.md, borderTopWidth: 1, borderRadius: radius.sm, marginHorizontal: -2 },
  dayDetailTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, letterSpacing: -0.2 },
  dayTxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },

  projCard: { padding: spacing.lg, marginBottom: spacing.sm },
  projAmount: { fontFamily: fonts.monoMedium, fontSize: 30, letterSpacing: -1 },
  projBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  projSubtitle: { ...type.small, marginBottom: spacing.md },
  projDetailsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  projDetailValue: { fontFamily: fonts.monoMedium, fontSize: 15, letterSpacing: -0.2 },
  projProgress: { height: 4, borderRadius: 2, overflow: 'hidden' },
  projProgressFill: { height: '100%', borderRadius: 2 },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md },
  txDot: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  txDotInner: { width: 8, height: 8, borderRadius: 4 },
  txDesc: { fontFamily: fonts.bodyMedium, fontSize: 14, marginBottom: 3, letterSpacing: -0.2 },
  txMeta: { ...type.small, fontSize: 12 },
  txAmount: { fontFamily: fonts.monoMedium, fontSize: 14, flexShrink: 0, letterSpacing: -0.2 },
  txBalance: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },

  goalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  goalName: { fontFamily: fonts.bodyMedium, fontSize: 14, letterSpacing: -0.2 },
  goalBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },

  insightCard: { padding: spacing.lg, paddingLeft: spacing.xl, marginBottom: spacing.md },
  insightAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  insightTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, flex: 1, marginRight: spacing.sm, letterSpacing: -0.2 },
  insightBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, flexShrink: 0 },
  insightBadgeText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: '#fff' },
  insightAmount: { fontFamily: fonts.monoMedium, fontSize: 18, letterSpacing: -0.4 },
  insightFooter: { ...type.bodyMd, fontFamily: fonts.bodyMedium, marginTop: spacing.sm, fontSize: 12 },

  modalOverlayContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  prefsSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingBottom: 34 },
  prefsHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: 4 },
  prefsTitle: { ...type.h3, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  prefsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  prefsLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, flex: 1 },
});
