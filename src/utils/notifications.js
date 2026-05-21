import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { advanceToNextBilling } from './dateUtils';
import { tForLang, getStoredLang } from '../context/LangContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Birik',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

// ── Deduplication helper ──────────────────────────────────────────────────────

const NOTIF_SENT_KEY = 'notif_sent_v1';

async function getSent() {
  try { return JSON.parse(await AsyncStorage.getItem(NOTIF_SENT_KEY) || '{}'); }
  catch { return {}; }
}

async function markSent(key) {
  const sent = await getSent();
  sent[key] = true;
  await AsyncStorage.setItem(NOTIF_SENT_KEY, JSON.stringify(sent));
}

async function wasSent(key) {
  const sent = await getSent();
  return !!sent[key];
}

async function send(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, channelId: 'default' },
    trigger: null,
  });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function scheduleSubscriptionReminders(subscriptions) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'subscription_reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const sub of subscriptions) {
    if (!sub.reminder_days) continue;
    // Use advanceToNextBilling so past dates are correctly advanced
    const nextDate = advanceToNextBilling(sub.next_billing_date || sub.next_billing, sub.billing_cycle);
    if (!nextDate) continue;

    const reminderDate = new Date(nextDate);
    reminderDate.setDate(reminderDate.getDate() - sub.reminder_days);
    reminderDate.setHours(9, 0, 0, 0);
    if (reminderDate <= new Date()) continue;

    const lang = await getStoredLang();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tForLang(lang, 'notifSubReminderTitle'),
        body: tForLang(lang, 'notifSubReminderBody', {
          name: sub.name, days: sub.reminder_days, amount: sub.amount, currency: sub.currency,
        }),
        data: { type: 'subscription_reminder', subId: sub.id },
        channelId: 'default',
      },
      trigger: { type: 'date', date: reminderDate },
    });
  }
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function notifyBudgetExceeded(categoryLabel, spent, limit, symbol, categoryId, monthKey) {
  const key = `budget_exceeded_${categoryId}_${monthKey}`;
  if (await wasSent(key)) return;
  await markSent(key);
  const lang = await getStoredLang();
  await send(
    tForLang(lang, 'notifBudgetExceededTitle'),
    tForLang(lang, 'notifBudgetExceededBody', { categoryLabel, symbol, spent, limit }),
    { type: 'budget_exceeded' },
  );
}

export async function notifyBudgetWarning(categoryLabel, percent, symbol, spent, limit, categoryId, monthKey) {
  const key = `budget_warning_${categoryId}_${monthKey}`;
  if (await wasSent(key)) return;
  await markSent(key);
  const lang = await getStoredLang();
  await send(
    tForLang(lang, 'notifBudgetWarningTitle'),
    tForLang(lang, 'notifBudgetWarningBody', { categoryLabel, percent, symbol, spent, limit }),
    { type: 'budget_warning' },
  );
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function notifyGoalProgress(goalName, goalId, pct) {
  if (pct >= 100) {
    const key = `goal_complete_${goalId}`;
    if (await wasSent(key)) return;
    await markSent(key);
    const lang = await getStoredLang();
    await send(
      tForLang(lang, 'notifGoalCompleteTitle'),
      tForLang(lang, 'notifGoalCompleteBody', { goalName }),
      { type: 'goal_complete' },
    );
  } else if (pct >= 80) {
    const key = `goal_80_${goalId}`;
    if (await wasSent(key)) return;
    await markSent(key);
    const lang = await getStoredLang();
    await send(
      tForLang(lang, 'notifGoalProgressTitle'),
      tForLang(lang, 'notifGoalProgressBody', { goalName, pct }),
      { type: 'goal_progress' },
    );
  }
}

// ── Recurring transactions ────────────────────────────────────────────────────

export async function scheduleRecurringReminders(rules) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'recurring_reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const lang = await getStoredLang();

  for (const rule of rules) {
    if (!rule.next_run_date) continue;
    if (rule.is_active === false) continue;
    if (rule.reminder_days === null || rule.reminder_days === undefined) continue;

    const runDate = new Date(rule.next_run_date.split('T')[0] + 'T00:00:00');
    if (isNaN(runDate.getTime())) continue;

    const fireAt = new Date(runDate);
    fireAt.setDate(fireAt.getDate() - Number(rule.reminder_days || 0));
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt <= now) continue;

    const fireDay = new Date(fireAt); fireDay.setHours(0, 0, 0, 0);
    const when = fireDay.getTime() === today.getTime()
      ? tForLang(lang, 'notifWhenToday')
      : fireDay.getTime() === tomorrow.getTime()
        ? tForLang(lang, 'notifWhenTomorrow')
        : runDate.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: tForLang(lang, 'notifRecurringTitle'),
        body: tForLang(lang, 'notifRecurringBody', {
          description: rule.description || rule.category, when,
        }),
        data: { type: 'recurring_reminder', ruleId: rule.id },
        channelId: 'default',
      },
      trigger: { type: 'date', date: fireAt },
    });
  }
}
