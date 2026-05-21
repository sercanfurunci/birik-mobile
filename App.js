import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LangProvider, useLang } from './src/context/LangContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { API, authFetch } from './src/utils/api';
import AppNavigator from './src/navigation/AppNavigator';
import ToastContainer from './src/components/Toast';
import OfflineBanner from './src/components/OfflineBanner';
import Splash from './src/components/Splash';
import {
  requestNotificationPermission,
  scheduleSubscriptionReminders,
  scheduleRecurringReminders,
} from './src/utils/notifications';
import ErrorBoundary from './src/components/ErrorBoundary';

const MIN_SPLASH_MS = 2600;

function AppContent() {
  const { colors, isDark, themeChecked } = useTheme();
  const { langChecked } = useLang();
  const { currentUser, authChecked, updateUser, syncVersion } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevIsDark = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [subsRes, recRes] = await Promise.all([
          authFetch(`${API}/subscriptions`).catch(() => null),
          authFetch(`${API}/recurring`).catch(() => null),
        ]);
        if (cancelled) return;
        if (subsRes?.ok) {
          const subs = await subsRes.json();
          if (Array.isArray(subs)) scheduleSubscriptionReminders(subs).catch(() => {});
        }
        if (recRes?.ok) {
          const rules = await recRes.json();
          if (Array.isArray(rules)) scheduleRecurringReminders(rules).catch(() => {});
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id, syncVersion]);

  useEffect(() => {
    if (prevIsDark.current === null) { prevIsDark.current = isDark; return; }
    if (prevIsDark.current === isDark) return;
    prevIsDark.current = isDark;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [isDark]);


  const handleSaveCategories = async (cats) => {
    try {
      const res = await authFetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_categories: cats }),
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ custom_categories: data.custom_categories || [] });
      }
    } catch {}
  };

  if (!authChecked || !themeChecked || !langChecked || !minElapsed) {
    return <Splash />;
  }

  return (
    <CurrencyProvider code={currentUser?.currency || 'USD'}>
      <CategoriesProvider
        initialCats={currentUser?.custom_categories || []}
        onSave={handleSaveCategories}
      >
        <Animated.View style={{ flex: 1, backgroundColor: colors.bg, opacity: fadeAnim }}>
          <OfflineBanner />
          <AppNavigator />
          <ToastContainer />
        </Animated.View>
      </CategoriesProvider>
    </CurrencyProvider>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <ToastProvider>
              <NetworkProvider>
                <AppContent />
              </NetworkProvider>
            </ToastProvider>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
