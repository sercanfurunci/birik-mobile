import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { authFetch } from './api';

const PREFIX = 'cache:';

function keyFor(url) {
  return `${PREFIX}${url}`;
}

export async function getCached(url) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export async function setCached(url, data) {
  try {
    await AsyncStorage.setItem(keyFor(url), JSON.stringify({ data, _ts: Date.now() }));
  } catch {}
}

export async function clearCache(url) {
  try { await AsyncStorage.removeItem(keyFor(url)); } catch {}
}

export async function clearAllCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {}
}

/**
 * Stale-while-revalidate fetch for GET endpoints.
 * - Calls onData(cachedData) immediately if cache exists.
 * - If online, fetches fresh, updates cache, then calls onData(freshData).
 * - If offline and no cache, calls onData(null).
 * Returns a promise resolved when revalidation finishes (or skipped).
 */
export async function cacheFetch(url, onData) {
  const cached = await getCached(url);
  if (cached !== null && onData) onData(cached, { fromCache: true });

  const net = await NetInfo.fetch();
  const online = !!(net.isConnected && net.isInternetReachable !== false);
  if (!online) {
    if (cached === null && onData) onData(null, { fromCache: true, offline: true });
    return cached;
  }

  try {
    const res = await authFetch(url);
    if (!res.ok) return cached;
    const data = await res.json();
    await setCached(url, data);
    if (onData) onData(data, { fromCache: false });
    return data;
  } catch {
    return cached;
  }
}
