import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { API, authFetch, queuedAuthFetch } from '../utils/api';
import { getQueue, removeFromQueue, findInQueue, onQueueChange, getQueueLength } from '../utils/offlineQueue';
import { getBiometricLockEnabled } from '../utils/biometric';
import { getToken, setToken, removeToken } from '../utils/tokenStorage';
import { getCachedUser, setCachedUser, clearCachedUser } from '../utils/userCache';
import { clearAllCache, cacheFetch, setCached } from '../utils/cacheFetch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingBioUser, setPendingBioUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const refresh = () => { getQueueLength().then(setPendingCount).catch(() => {}); };
    refresh();
    const unsub = onQueueChange(refresh);
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const cached = await getCachedUser();
        const bioEnabled = await getBiometricLockEnabled();

        if (cached?.id) {
          if (bioEnabled) setPendingBioUser(cached);
          else setCurrentUser(cached);
        }

        const net = await NetInfo.fetch();
        const online = !!(net.isConnected && net.isInternetReachable !== false);
        if (!online) return;

        let res;
        try { res = await authFetch(`${API}/auth/me`); } catch { return; }
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            await removeToken();
            await clearCachedUser();
            setPendingBioUser(null);
            setCurrentUser(null);
          }
          return;
        }
        const data = await res.json();
        if (!data?.id) return;
        const user = {
          id: data.id,
          email: data.email || null,
          phone: data.phone || null,
          username: data.username || null,
          currency: data.currency || 'USD',
          custom_categories: data.custom_categories || [],
        };
        await setCachedUser(user);
        if (!cached?.id) {
          if (bioEnabled) setPendingBioUser(user);
          else setCurrentUser(user);
        } else {
          if (bioEnabled) setPendingBioUser(prev => prev ? user : prev);
          else setCurrentUser(prev => prev ? user : prev);
        }
      } catch {}
      finally { setAuthChecked(true); }
    })();
  }, []);

  const refreshTransactions = useCallback(() => {
    return cacheFetch(`${API}/transactions`, (data) => {
      if (Array.isArray(data)) setTransactions(data);
    });
  }, []);

  useEffect(() => {
    if (currentUser?.id) refreshTransactions();
  }, [currentUser?.id]);

  const handleAuthSuccess = useCallback(async (user, token) => {
    if (token) await setToken(token);
    await setCachedUser(user);
    setPendingBioUser(null);
    setCurrentUser(user);
  }, []);

  const completeBioLogin = useCallback(() => {
    if (pendingBioUser) {
      setCurrentUser(pendingBioUser);
      setPendingBioUser(null);
    }
  }, [pendingBioUser]);

  const handleLogout = useCallback(async () => {
    try { await authFetch(`${API}/auth/logout`, { method: 'POST' }); } catch {}
    await removeToken();
    await clearCachedUser();
    await clearAllCache();
    setPendingBioUser(null);
    setCurrentUser(null);
    setTransactions([]);
  }, []);

  const updateUser = useCallback((updates) => {
    setCurrentUser(prev => {
      const next = { ...prev, ...updates };
      setCachedUser(next).catch(() => {});
      return next;
    });
  }, []);

  const syncInFlightRef = useRef(false);
  const syncOfflineQueue = useCallback(async () => {
    if (syncInFlightRef.current) return 0;
    syncInFlightRef.current = true;
    try {
      const queue = await getQueue();
      if (!queue.length) return 0;
      let synced = 0;
      for (const item of queue) {
        const stillQueued = await findInQueue(item.tempId);
        if (!stillQueued) continue;
        try {
          const res = await authFetch(item.url, {
            method: item.method,
            headers: item.body ? { 'Content-Type': 'application/json' } : {},
            body: item.body,
          });
          if (res.ok) {
            const isTransactionPost = item.method === 'POST' && item.url.endsWith('/transactions');
            const isTransactionPut = item.method === 'PUT' && /\/transactions\//.test(item.url);

            if (isTransactionPost) {
              const real = await res.json();
              if (real?.id) {
                setTransactions(prev => {
                  const next = prev.map(tx =>
                    tx.id === item.tempId ? { ...real, _pending: false } : tx
                  );
                  setCached(`${API}/transactions`, next).catch(() => {});
                  return next;
                });
              }
            } else if (isTransactionPut) {
              const real = await res.json();
              if (real?.id) {
                setTransactions(prev => {
                  const next = prev.map(tx =>
                    tx.id === real.id ? { ...real, _pending: false } : tx
                  );
                  setCached(`${API}/transactions`, next).catch(() => {});
                  return next;
                });
              }
            }

            await removeFromQueue(item.tempId);
            synced++;
          }
        } catch {}
      }
      const remaining = await getQueue();
      setPendingCount(remaining.length);
      if (synced > 0) setSyncVersion(v => v + 1);
      return synced;
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      if (connected) syncOfflineQueue();
    });
    (async () => {
      try {
        const net = await NetInfo.fetch();
        const online = !!(net.isConnected && net.isInternetReachable !== false);
        const len = await getQueueLength();
        if (online && len > 0) syncOfflineQueue();
      } catch {}
    })();
    return unsub;
  }, [syncOfflineQueue]);

  const addTransaction = useCallback(async (tx) => {
    const res = await queuedAuthFetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    setTransactions(prev => {
      const next = [data, ...prev];
      setCached(`${API}/transactions`, next).catch(() => {});
      return next;
    });
    return data;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const res = await queuedAuthFetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setTransactions(prev => {
      const next = prev.filter(tx => tx.id !== id);
      setCached(`${API}/transactions`, next).catch(() => {});
      return next;
    });
    return true;
  }, []);

  const editTransaction = useCallback(async (id, updated) => {
    const res = await queuedAuthFetch(`${API}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    setTransactions(prev => {
      const next = prev.map(tx => tx.id === id ? data : tx);
      setCached(`${API}/transactions`, next).catch(() => {});
      return next;
    });
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, pendingBioUser, authChecked, transactions,
      handleAuthSuccess, handleLogout, completeBioLogin, updateUser,
      refreshTransactions, addTransaction, deleteTransaction, editTransaction,
      pendingCount, syncOfflineQueue, syncVersion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
