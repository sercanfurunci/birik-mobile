import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, authFetch } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(token => {
      if (!token) { setAuthChecked(true); return; }
      authFetch(`${API}/auth/me`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.id) {
            setCurrentUser({
              id: data.id,
              email: data.email || null,
              phone: data.phone || null,
              username: data.username || null,
              currency: data.currency || 'USD',
              custom_categories: data.custom_categories || [],
            });
          }
        })
        .catch(() => {})
        .finally(() => setAuthChecked(true));
    });
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
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    try { await authFetch(`${API}/auth/logout`, { method: 'POST' }); } catch {}
    await AsyncStorage.removeItem('auth_token');
    setCurrentUser(null);
    setTransactions([]);
  }, []);

  const updateUser = useCallback((updates) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));
  }, []);

  const addTransaction = useCallback(async (tx) => {
    const res = await authFetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    setTransactions(prev => [data, ...prev]);
    return data;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const res = await authFetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    return true;
  }, []);

  const editTransaction = useCallback(async (id, updated) => {
    const res = await authFetch(`${API}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    setTransactions(prev => prev.map(tx => tx.id === id ? data : tx));
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, authChecked, transactions,
      handleAuthSuccess, handleLogout, updateUser,
      refreshTransactions, addTransaction, deleteTransaction, editTransaction,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
