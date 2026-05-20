import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  // Android 8+ requires a notification channel
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

export async function scheduleSubscriptionReminders(subscriptions) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'subscription_reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const sub of subscriptions) {
    if (!sub.reminder_days || !sub.next_billing_date) continue;
    const billingDate = new Date(sub.next_billing_date + 'T09:00:00');
    const reminderDate = new Date(billingDate);
    reminderDate.setDate(reminderDate.getDate() - sub.reminder_days);
    if (reminderDate <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💳 Yaklaşan Fatura',
        body: `${sub.name} — ${sub.reminder_days} gün sonra ${sub.amount} ${sub.currency} tahsil edilecek`,
        data: { type: 'subscription_reminder', subId: sub.id },
        channelId: 'default',
      },
      trigger: { type: 'date', date: reminderDate },
    });
  }
}

// Deduplicate budget notifications — only fire once per category per month
const BUDGET_NOTIF_KEY = 'budget_notif_sent';

async function getBudgetNotifSent() {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_NOTIF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function markBudgetNotifSent(key) {
  const sent = await getBudgetNotifSent();
  sent[key] = true;
  await AsyncStorage.setItem(BUDGET_NOTIF_KEY, JSON.stringify(sent));
}

export async function clearBudgetNotifCache() {
  await AsyncStorage.removeItem(BUDGET_NOTIF_KEY);
}

export async function notifyBudgetExceeded(categoryLabel, spent, limit, symbol, categoryId, monthKey) {
  const key = `exceeded_${categoryId}_${monthKey}`;
  const sent = await getBudgetNotifSent();
  if (sent[key]) return;
  await markBudgetNotifSent(key);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Bütçe Aşıldı',
      body: `${categoryLabel} bütçesi doldu: ${symbol}${spent.toFixed(0)} / ${symbol}${limit.toFixed(0)}`,
      data: { type: 'budget_exceeded' },
      channelId: 'default',
    },
    trigger: null,
  });
}

export async function notifyBudgetWarning(categoryLabel, percent, symbol, spent, limit, categoryId, monthKey) {
  const key = `warning_${categoryId}_${monthKey}`;
  const sent = await getBudgetNotifSent();
  if (sent[key]) return;
  await markBudgetNotifSent(key);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Bütçe Uyarısı',
      body: `${categoryLabel}: %${percent} kullanıldı (${symbol}${spent.toFixed(0)} / ${symbol}${limit.toFixed(0)})`,
      data: { type: 'budget_warning' },
      channelId: 'default',
    },
    trigger: null,
  });
}
