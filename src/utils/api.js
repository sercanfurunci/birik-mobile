import NetInfo from '@react-native-community/netinfo';
import { enqueue, findInQueue, removeFromQueue, updateQueueItem } from './offlineQueue';
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
    const offlineIdMatch = url.match(/\/(_offline_\d+_[a-z0-9]+)(?:[?#].*)?$/);
    if (offlineIdMatch) {
      const offlineId = offlineIdMatch[1];
      const pending = await findInQueue(offlineId);

      if (method === 'DELETE') {
        if (pending) await removeFromQueue(offlineId);
        return { ok: true, _queued: false, _absorbed: true, json: async () => ({}) };
      }

      if ((method === 'PUT' || method === 'PATCH') && pending?.method === 'POST') {
        let mergedBody = pending.body;
        if (opts.body) {
          try {
            const oldBody = pending.body ? JSON.parse(pending.body) : {};
            const newBody = JSON.parse(opts.body);
            mergedBody = JSON.stringify({ ...oldBody, ...newBody });
          } catch {
            mergedBody = opts.body;
          }
        }
        await updateQueueItem(offlineId, { body: mergedBody });

        let mockData = {};
        try { mockData = mergedBody ? JSON.parse(mergedBody) : {}; } catch {}
        mockData = { ...mockData, id: offlineId, _pending: true };
        return { ok: true, _queued: false, _absorbed: true, json: async () => mockData };
      }
    }

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
