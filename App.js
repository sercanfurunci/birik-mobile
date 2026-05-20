import { useState, useEffect, useRef } from 'react';
import { View, AppState, StyleSheet, Animated } from 'react-native';
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
import { requestNotificationPermission } from './src/utils/notifications';
import { getBiometricLockEnabled, authenticateWithBiometrics } from './src/utils/biometric';

const MIN_SPLASH_MS = 2600;

function AppContent() {
  const { colors, isDark, themeChecked } = useTheme();
  const { langChecked } = useLang();
  const { currentUser, authChecked, updateUser } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
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
    if (prevIsDark.current === null) { prevIsDark.current = isDark; return; }
    if (prevIsDark.current === isDark) return;
    prevIsDark.current = isDark;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [isDark]);

  useEffect(() => {
    if (!currentUser) return;
    const sub = AppState.addEventListener('change', async nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const enabled = await getBiometricLockEnabled();
        if (enabled) {
          setLocked(true);
          const ok = await authenticateWithBiometrics();
          if (ok) setLocked(false);
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [currentUser]);

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
          {locked && (
            <View style={[appStyles.lockScreen, { backgroundColor: colors.bg }]}>
              <View style={appStyles.lockIcon}>
                <View style={[appStyles.lockDot, { backgroundColor: colors.brand }]} />
              </View>
            </View>
          )}
        </Animated.View>
      </CategoriesProvider>
    </CurrencyProvider>
  );
}

const appStyles = StyleSheet.create({
  lockScreen: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  lockIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(128,128,128,0.1)', justifyContent: 'center', alignItems: 'center' },
  lockDot: { width: 24, height: 24, borderRadius: 12 },
});

export default function App() {
  return (
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
  );
}
