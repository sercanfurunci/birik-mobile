import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'notif_prefs_v1';

const DEFAULTS = {
  master: true,
  budgets: true,
  goals: true,
  subscriptions: true,
  recurring: true,
};

let cache = null;

async function load() {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export async function getAllPrefs() {
  return await load();
}

export async function getPref(key) {
  const prefs = await load();
  if (key === 'master') return prefs.master !== false;
  return prefs.master !== false && prefs[key] !== false;
}

export async function setPref(key, value) {
  const prefs = await load();
  prefs[key] = !!value;
  cache = prefs;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
