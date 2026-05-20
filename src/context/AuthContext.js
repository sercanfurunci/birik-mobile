import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API, authFetch, queuedAuthFetch } from '../utils/api';
import { getQueue, removeFromQueue } from '../utils/offlineQueue';
import { getBiometricLockEnabled } from '../utils/biometric';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingBioUser, setPendingBioUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    getQueue().then(q => setPendingCount(q.length));
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;
        const res = await authFetch(`${API}/auth/me`);
        if (!res.ok) return;
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
        const bioEnabled = await getBiometricLockEnabled();
        if (bioEnabled) {
          setPendingBioUser(user);
        } else {
          setCurrentUser(user);
        }
      } catch {}
      finally { setAuthChecked(true); }
    })();
  }, []);

  const refreshTransactions = useCallback(() => {
    authFetch(`${API}/transactions`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setTransactions(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser?.id) refreshTransactions();
  }, [currentUser?.id]);

  const handleAuthSuccess = useCallback(async (user, token) => {
    if (token) await AsyncStorage.setItem('auth_token', token);
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
    const bioEnabled = await getBiometricLockEnabled();
    if (bioEnabled && currentUser) {
      // Keep token so bio re-login works; show bio button immediately on Login screen
      setPendingBioUser(currentUser);
    } else {
      await AsyncStorage.removeItem('auth_token');
      setPendingBioUser(null);
    }
    setCurrentUser(null);
    setTransactions([]);
  }, [currentUser]);

  const updateUser = useCallback((updates) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    const queue = await getQueue();
    if (!queue.length) return 0;
    let synced = 0;
    for (const item of queue) {
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
              setTransactions(prev => prev.map(tx =>
                tx.id === item.tempId ? { ...real, _pending: false } : tx
              ));
            }
          } else if (isTransactionPut) {
            const real = await res.json();
            if (real?.id) {
              setTransactions(prev => prev.map(tx =>
                tx.id === real.id ? { ...real, _pending: false } : tx
              ));
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
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      if (connected) syncOfflineQueue();
    });
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
    setTransactions(prev => [data, ...prev]);
    if (res._queued) setPendingCount(c => c + 1);
    return data;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const res = await queuedAuthFetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    if (res._queued) setPendingCount(c => c + 1);
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
    setTransactions(prev => prev.map(tx => tx.id === id ? data : tx));
    if (res._queued) setPendingCount(c => c + 1);
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
