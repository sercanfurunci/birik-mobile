import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dashboard_prefs';

export const DEFAULT_PREFS = {
  stats: true,
  breakdown: true,
  daily: true,
  projection: true,
  recent: true,
  goals: true,
};

export async function getDashboardPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveDashboardPrefs(prefs) {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}
