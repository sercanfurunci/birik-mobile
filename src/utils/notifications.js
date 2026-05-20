import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

export async function scheduleSubscriptionReminders(subscriptions) {
  // Cancel all existing subscription reminders before rescheduling
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
      },
      trigger: {
        type: 'date',
        date: reminderDate,
      },
    });
  }
}

export async function notifyBudgetExceeded(categoryLabel, spent, limit, symbol) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Bütçe Aşıldı',
      body: `${categoryLabel} bütçesi doldu: ${symbol}${spent.toFixed(0)} / ${symbol}${limit.toFixed(0)}`,
      data: { type: 'budget_exceeded' },
    },
    trigger: null,
  });
}

export async function notifyBudgetWarning(categoryLabel, percent, symbol, spent, limit) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Bütçe Uyarısı',
      body: `${categoryLabel}: %${percent} kullanıldı (${symbol}${spent.toFixed(0)} / ${symbol}${limit.toFixed(0)})`,
      data: { type: 'budget_warning' },
    },
    trigger: null,
  });
}
