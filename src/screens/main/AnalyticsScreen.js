import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCategories } from '../../context/CategoriesContext';
import { fmt } from '../../utils/format';
import Card from '../../components/Card';
import { spacing, radius, type, fonts } from '../../constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_H = 100;
const DATE_RANGES = ['30d', 'thisMonth', 'lastMonth', '90d'];

function ds(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildRange(range) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
  const today = new Date(y, m, day);

  let from, to;
  if (range === '30d') { to = today; from = new Date(y, m, day - 29); }
  else if (range === '90d') { to = today; from = new Date(y, m, day - 89); }
  else if (range === 'thisMonth') { from = new Date(y, m, 1); to = today; }
  else if (range === 'lastMonth') { from = new Date(y, m - 1, 1); to = new Date(y, m, 0); }
  else { from = new Date(y, m, day - 29); to = today; }

  const fromStr = ds(from);
  const toStr = ds(to);

  const dayStrs = [];
  const cur = new Date(from);
  while (cur <= to) {
    dayStrs.push(ds(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return { fromStr, toStr, dayStrs };
}

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const { t, lang } = useLang();
  const { transactions } = useAuth();
  const { symbol } = useCurrency();
  const { getCatColor } = useCategories();
  const [range, setRange] = useState('30d');
  const [selectedBar, setSelectedBar] = useState(null);
  const trendScrollRef = useRef(null);

  const rangeLabel = {
    '30d': t('last30Days'),
    thisMonth: t('thisMonth'),
    lastMonth: t('lastMonth'),
    '90d': '90 ' + t('subDays'),
  };

  const { fromStr, toStr, dayStrs } = useMemo(() => buildRange(range), [range]);

  const filtered = useMemo(() => transactions.filter(tx => {
    const d = (tx.date || '').slice(0, 10);
    return d >= fromStr && d <= toStr;
  }), [transactions, fromStr, toStr]);

  const expenses = useMemo(() => filtered.filter(tx => tx.type === 'expense'), [filtered]);
  const incomes = useMemo(() => filtered.filter(tx => tx.type === 'income'), [filtered]);
  const totalExp = expenses.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const totalInc = incomes.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);
  const avgExp = expenses.length > 0 ? totalExp / expenses.length : 0;

  const catData = useMemo(() => {
    const map = {};
    expenses.forEach(tx => { map[tx.category] = (map[tx.category] || 0) + parseFloat(tx.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const barData = useMemo(() => {
    const expByDay = {}, incByDay = {}, txsByDay = {};
    filtered.forEach(tx => {
      const d = (tx.date || '').slice(0, 10);
      if (tx.type === 'expense') expByDay[d] = (expByDay[d] || 0) + parseFloat(tx.amount || 0);
      else incByDay[d] = (incByDay[d] || 0) + parseFloat(tx.amount || 0);
      txsByDay[d] = txsByDay[d] || [];
      txsByDay[d].push(tx);
    });
    return dayStrs.map(d => ({
      d,
      label: String(parseInt(d.slice(8))),
      exp: expByDay[d] || 0,
      inc: incByDay[d] || 0,
      txs: txsByDay[d] || [],
    }));
  }, [filtered, dayStrs]);

  const maxBar = Math.max(...barData.map(b => Math.max(b.exp, b.inc)), 1);
  const showBar = barData.some(b => b.exp > 0 || b.inc > 0);
  const COL_W = Math.max(22, Math.min(40, (SCREEN_W - 80) / Math.max(barData.length, 1)));
  const showEvery = barData.length > 14 ? Math.ceil(barData.length / 7) : 1;

  // Busiest day of week (Mon-Sun, like web)
  const busiest = useMemo(() => {
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(tx => {
      const dStr = (tx.date || '').slice(0, 10);
      const parts = dStr.split('-').map(Number);
      if (parts.length !== 3) return;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      dayCount[date.getDay()]++;
    });
    const max = Math.max(...dayCount);
    if (max === 0) return null;
    const idx = dayCount.indexOf(max);
    // Build day name with locale
    const ref = new Date(Date.UTC(2024, 0, 7 + idx)); // Jan 7 2024 = Sun
    const longName = ref.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', timeZone: 'UTC' });
    const shortName = ref.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short', timeZone: 'UTC' });
    return { count: max, longName, shortName };
  }, [filtered, lang]);

  const biggest = expenses.length > 0
    ? expenses.reduce((max, tx) => parseFloat(tx.amount) > parseFloat(max.amount) ? tx : max, expenses[0])
    : null;

  // Top movers vs previous period
  const topMovers = useMemo(() => {
    const from = new Date(fromStr + 'T00:00:00');
    const to = new Date(toStr + 'T00:00:00');
    const span = to - from;
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - span);
    const prevFromStr = ds(prevFrom);
    const prevToStr = ds(prevTo);

    const prevByCat = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = (tx.date || '').slice(0, 10);
      if (d >= prevFromStr && d <= prevToStr) {
        prevByCat[tx.category] = (prevByCat[tx.category] || 0) + parseFloat(tx.amount || 0);
      }
    });

    const curByCat = {};
    expenses.forEach(tx => { curByCat[tx.category] = (curByCat[tx.category] || 0) + parseFloat(tx.amount || 0); });

    const allCats = new Set([...Object.keys(curByCat), ...Object.keys(prevByCat)]);
    return [...allCats]
      .map(cat => {
        const cur = curByCat[cat] || 0;
        const prev = prevByCat[cat] || 0;
        const diff = cur - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : (cur > 0 ? 100 : 0);
        return { cat, cur, prev, diff, pct };
      })
      .filter(m => Math.abs(m.diff) > 0.01)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
  }, [expenses, transactions, fromStr, toStr]);

  // 6-month monthly trend (always off the full transaction set)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }),
        inc: 0,
        exp: 0,
      });
    }
    transactions.forEach(tx => {
      const ym = (tx.date || '').slice(0, 7);
      const entry = months.find(m => m.ym === ym);
      if (!entry) return;
      const amt = parseFloat(tx.amount || 0);
      if (tx.type === 'income') entry.inc += amt;
      else entry.exp += amt;
    });
    return months;
  }, [transactions, lang]);

  const maxMonthly = Math.max(...monthlyData.flatMap(m => [m.inc, m.exp]), 1);
  const hasMonthlyData = monthlyData.some(m => m.inc > 0 || m.exp > 0);

  const hasData = transactions.length > 0;
  const txCount = filtered.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.text1 }]}>{t('navAnalytics')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {DATE_RANGES.map(r => (
              <TouchableOpacity key={r} onPress={() => { setRange(r); setSelectedBar(null); }}
                style={[s.chip, { backgroundColor: range === r ? colors.brand : colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: range === r ? '#fff' : colors.text2, fontFamily: fonts.bodyMedium, fontSize: 13 }}>{rangeLabel[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {!hasData ? (
          <View style={s.empty}>
            <Ionicons name="bar-chart-outline" size={44} color={colors.text3} style={{ marginBottom: spacing.lg }} />
            <Text style={[s.emptyText, { color: colors.text3 }]}>{t('noTransactionsAnalytics')}</Text>
          </View>
        ) : (
          <>
            {/* Key metrics (no income/expense/balance summary anymore) */}
            <View style={s.metricsGrid}>
              <Card style={[s.metricCard, { borderColor: colors.border }]}>
                <Text style={[s.metricLabel, { color: colors.text3 }]}>{t('avgExpense')}</Text>
                <Text style={[s.metricValueMono, { color: colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {symbol}{fmt(avgExp)}
                </Text>
              </Card>
              {busiest && (
                <Card style={[s.metricCard, { borderColor: colors.border }]}>
                  <Text style={[s.metricLabel, { color: colors.text3 }]}>{t('busiestDay')}</Text>
                  <Text style={[s.metricValue, { color: colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {busiest.shortName}
                  </Text>
                  <Text style={[s.metricSub, { color: colors.text3 }]} numberOfLines={1}>
                    {busiest.count} {busiest.count === 1 ? t('statTransaction') : t('statTransactions')}
                  </Text>
                </Card>
              )}
              <Card style={[s.metricCard, { borderColor: colors.border }]}>
                <Text style={[s.metricLabel, { color: colors.text3 }]}>{t('transactions')}</Text>
                <Text style={[s.metricValueMono, { color: colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {txCount}
                </Text>
                <Text style={[s.metricSub, { color: colors.text3 }]} numberOfLines={1}>
                  {incomes.length}↑ · {expenses.length}↓
                </Text>
              </Card>
              {biggest && (
                <Card style={[s.metricCard, { borderColor: colors.border }]}>
                  <Text style={[s.metricLabel, { color: colors.text3 }]}>{t('biggestExpense')}</Text>
                  <Text style={[s.metricValueMono, { color: colors.red }]} numberOfLines={1} adjustsFontSizeToFit>
                    {symbol}{fmt(biggest.amount)}
                  </Text>
                  <Text style={[s.metricSub, { color: colors.text3 }]} numberOfLines={1}>
                    {biggest.description || t(biggest.category)}
                  </Text>
                </Card>
              )}
            </View>

            {/* 6-month monthly overview */}
            {hasMonthlyData && (
              <>
                <Text style={[s.sectionTitle, { color: colors.text3 }]}>{t('monthlyOverview')}</Text>
                <Card style={[s.chartCard, { borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.red }} />
                      <Text style={{ ...type.small, fontSize: 11, color: colors.text3 }}>{t('expenses')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.green }} />
                      <Text style={{ ...type.small, fontSize: 11, color: colors.text3 }}>{t('income')}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    {monthlyData.map((m, i) => {
                      const CHART_H = 90;
                      const expH = m.exp > 0 ? Math.max(4, (m.exp / maxMonthly) * CHART_H) : 0;
                      const incH = m.inc > 0 ? Math.max(4, (m.inc / maxMonthly) * CHART_H) : 0;
                      const isCurrentMonth = i === 5;
                      const hasData = m.exp > 0 || m.inc > 0;
                      return (
                        <View key={m.ym} style={{ flex: 1, alignItems: 'center' }}>
                          <View style={{ height: CHART_H, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                            <View style={{
                              width: 10, height: expH || 0, borderRadius: 3,
                              backgroundColor: colors.red, opacity: isCurrentMonth ? 1 : 0.6,
                            }} />
                            <View style={{
                              width: 10, height: incH || 0, borderRadius: 3,
                              backgroundColor: colors.green, opacity: isCurrentMonth ? 1 : 0.6,
                            }} />
                          </View>
                          <View style={{ height: 1, width: '90%', backgroundColor: colors.border, marginVertical: 4 }} />
                          <Text style={{
                            fontFamily: isCurrentMonth ? fonts.bodySemibold : fonts.bodyMedium,
                            fontSize: 10, color: isCurrentMonth ? colors.brand : colors.text3,
                            marginBottom: 2,
                          }}>
                            {m.label}
                          </Text>
                          <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.text3, height: 13 }} numberOfLines={1}>
                            {hasData ? `${symbol}${fmt(Math.max(m.exp, m.inc))}` : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </>
            )}

            {/* Bar chart with tap-to-show */}
            {showBar && (
              <>
                <Text style={[s.sectionTitle, { color: colors.text3 }]}>{t('spendingTrends')}</Text>
                <Pressable onPress={() => setSelectedBar(null)}>
                <Card style={[s.chartCard, { borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm + 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.red }} />
                      <Text style={{ ...type.small, fontSize: 11, color: colors.text3 }}>{t('expenses')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.green }} />
                      <Text style={{ ...type.small, fontSize: 11, color: colors.text3 }}>{t('income')}</Text>
                    </View>
                    <Text style={{ ...type.small, fontSize: 10, color: colors.text3, fontStyle: 'italic', marginLeft: 'auto' }}>{t('dailyDistTapHint')}</Text>
                  </View>
                  <ScrollView
                    ref={trendScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onContentSizeChange={() => trendScrollRef.current?.scrollToEnd({ animated: false })}
                    onScrollBeginDrag={() => setSelectedBar(null)}
                  >
                    <View style={{ paddingHorizontal: 4 }}>
                      {/* Bars row */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H, gap: 4 }}>
                        {barData.map(b => {
                          const expH = b.exp > 0 ? Math.max(3, (b.exp / maxBar) * BAR_H) : 0;
                          const incH = b.inc > 0 ? Math.max(3, (b.inc / maxBar) * BAR_H) : 0;
                          const isSel = selectedBar?.d === b.d;
                          const hasAny = b.exp > 0 || b.inc > 0;
                          const barW = Math.max(5, Math.floor((COL_W - 6) / 2));
                          return (
                            <TouchableOpacity
                              key={b.d}
                              activeOpacity={0.7}
                              onPress={() => hasAny && setSelectedBar(isSel ? null : b)}
                              style={{ width: COL_W, height: BAR_H, alignItems: 'center', justifyContent: 'flex-end' }}
                            >
                              <View style={{ height: BAR_H, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                                {b.exp > 0 ? (
                                  <View style={{
                                    width: barW, height: expH, borderRadius: 3,
                                    backgroundColor: colors.red,
                                    opacity: selectedBar && !isSel ? 0.3 : 0.95,
                                  }} />
                                ) : <View style={{ width: barW }} />}
                                {b.inc > 0 ? (
                                  <View style={{
                                    width: barW, height: incH, borderRadius: 3,
                                    backgroundColor: colors.green,
                                    opacity: selectedBar && !isSel ? 0.3 : 0.95,
                                  }} />
                                ) : <View style={{ width: barW }} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {/* Axis baseline */}
                      <View style={{ height: 1, backgroundColor: colors.border, marginTop: 6 }} />
                      {/* Labels row */}
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.sm }}>
                        {barData.map((b, i) => {
                          const isSel = selectedBar?.d === b.d;
                          const show = i % showEvery === 0 || i === barData.length - 1;
                          return (
                            <View key={b.d} style={{ width: COL_W, alignItems: 'center' }}>
                              {show && (
                                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: isSel ? colors.brand : colors.text3 }}>
                                  {b.label}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </ScrollView>

                  {selectedBar && (
                    <View style={[s.tooltip, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={[s.tooltipDate, { color: colors.text1 }]}>{selectedBar.d}</Text>
                        <View style={{ flexDirection: 'row', gap: spacing.md }}>
                          {selectedBar.inc > 0 && (
                            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 12, color: colors.green }}>+{symbol}{fmt(selectedBar.inc)}</Text>
                          )}
                          {selectedBar.exp > 0 && (
                            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 12, color: colors.red }}>-{symbol}{fmt(selectedBar.exp)}</Text>
                          )}
                        </View>
                      </View>
                      {selectedBar.txs.length === 0 ? (
                        <Text style={{ ...type.small, fontSize: 12, color: colors.text3 }}>{t('dailyDistEmpty')}</Text>
                      ) : (
                        selectedBar.txs
                          .slice()
                          .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
                          .map(tx => (
                            <View key={tx.id} style={s.tooltipTxRow}>
                              <View style={[s.tooltipDot, { backgroundColor: getCatColor(tx.category, tx.type) }]} />
                              <Text style={{ flex: 1, ...type.small, fontSize: 12, color: colors.text2 }} numberOfLines={1}>
                                {tx.description || t(tx.category)}
                              </Text>
                              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 12, color: tx.type === 'income' ? colors.green : colors.red }}>
                                {tx.type === 'income' ? '+' : '-'}{symbol}{fmt(tx.amount)}
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

            {/* Category breakdown - stacked layout to avoid overflow */}
            {catData.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: colors.text3 }]}>{t('byCategory')}</Text>
                <Card style={[s.listCard, { borderColor: colors.border }]}>
                  {catData.map(({ name, value }, i) => {
                    const pct = totalExp > 0 ? (value / totalExp) * 100 : 0;
                    return (
                      <View key={name} style={[s.catBlock, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                        <View style={s.catBlockTop}>
                          <View style={[s.catDot, { backgroundColor: getCatColor(name, 'expense') }]} />
                          <Text style={[s.catName, { color: colors.text1 }]} numberOfLines={1}>{t(name)}</Text>
                          <Text style={[s.catAmt, { color: colors.text1 }]}>{symbol}{fmt(value)}</Text>
                        </View>
                        <View style={s.catBlockBot}>
                          <View style={[s.catBar, { backgroundColor: colors.surface2 }]}>
                            <View style={[s.catBarFill, { width: `${pct}%`, backgroundColor: getCatColor(name, 'expense') }]} />
                          </View>
                          <Text style={[s.catPct, { color: colors.text3 }]}>{pct.toFixed(1)}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {/* Top movers - stacked layout */}
            {topMovers.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: colors.text3 }]}>{t('topMovers')}</Text>
                <Card style={[s.listCard, { borderColor: colors.border }]}>
                  {topMovers.map(({ cat, diff, pct, cur, prev }, i) => {
                    const up = diff > 0;
                    return (
                      <View key={cat} style={[s.moverRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                        <View style={[s.catDot, { backgroundColor: getCatColor(cat, 'expense') }]} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[s.catName, { color: colors.text1 }]} numberOfLines={1}>{t(cat)}</Text>
                          <Text style={[s.moverSub, { color: colors.text3 }]} numberOfLines={1}>
                            {symbol}{fmt(prev)} → {symbol}{fmt(cur)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                            <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={14} color={up ? colors.red : colors.green} />
                            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 13, color: up ? colors.red : colors.green }}>
                              {up ? '+' : ''}{symbol}{fmt(Math.abs(diff))}
                            </Text>
                          </View>
                          {prev > 0 && (
                            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.text3, marginTop: 2 }}>
                              {up ? '+' : ''}{pct.toFixed(0)}%
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {filtered.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                <Ionicons name="mail-open-outline" size={36} color={colors.text3} style={{ marginBottom: spacing.sm }} />
                <Text style={{ color: colors.text3, ...type.body }}>{t('noTransactions')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  pageTitle: { ...type.h2Serif, fontSize: 26, marginBottom: spacing.xl },
  chip: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginBottom: spacing.lg },
  metricCard: { flex: 1, minWidth: '45%', padding: spacing.md + 2 },
  metricLabel: { ...type.label, marginBottom: spacing.xs + 2 },
  metricValue: { ...type.h3, fontSize: 18, marginBottom: spacing.xs },
  metricValueMono: { fontFamily: fonts.monoMedium, fontSize: 18, letterSpacing: -0.3, marginBottom: spacing.xs },
  metricSub: { fontFamily: fonts.body, fontSize: 11 },
  sectionTitle: { ...type.label, marginBottom: spacing.sm + 2, marginTop: spacing.sm },
  chartCard: { padding: spacing.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  listCard: { marginBottom: spacing.sm, overflow: 'hidden' },
  catBlock: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md },
  catBlockTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.xs + 2 },
  catBlockBot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  catName: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 14 },
  catAmt: { fontFamily: fonts.monoMedium, fontSize: 14 },
  catBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catPct: { fontFamily: fonts.mono, fontSize: 11, minWidth: 40, textAlign: 'right' },
  moverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md },
  moverSub: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  tooltip: { marginTop: spacing.sm + 2, padding: spacing.md, borderTopWidth: 1, borderRadius: radius.sm, marginHorizontal: -2 },
  tooltipDate: { fontFamily: fonts.monoMedium, fontSize: 12 },
  tooltipTxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  tooltipDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { ...type.body, fontSize: 15 },
});
