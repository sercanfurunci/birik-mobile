import NetInfo from '@react-native-community/netinfo';
import { enqueue } from './offlineQueue';
import { getToken } from './tokenStorage';

export const API = 'https://api.furunci.tech';

export async function authFetch(url, opts = {}) {
  const token = await getToken();
  return fetch(url, {
    ...opts,
    headers: {
      ...opts.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function queuedAuthFetch(url, opts = {}) {
  const net = await NetInfo.fetch();
  const online = !!(net.isConnected && net.isInternetReachable !== false);
  const method = (opts.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (!online && isMutation) {
    const tempId = `_offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await enqueue({ tempId, url, method, body: opts.body || null });

    let mockData = {};
    if (method !== 'DELETE' && opts.body) {
      try { mockData = JSON.parse(opts.body); } catch {}
    }
    if (method === 'POST') {
      mockData = { ...mockData, id: tempId, _pending: true };
    } else if (method === 'PUT') {
      const idMatch = url.match(/\/(\d+)(?:[?#].*)?$/);
      mockData = { ...mockData, id: idMatch ? parseInt(idMatch[1]) : tempId, _pending: true };
    }

    return { ok: true, _queued: true, json: async () => mockData };
  }

  return authFetch(url, opts);
}
