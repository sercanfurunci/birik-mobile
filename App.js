import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LangProvider, useLang } from './src/context/LangContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider, useToast } from './src/context/ToastContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { API, authFetch } from './src/utils/api';
import AppNavigator from './src/navigation/AppNavigator';
import ToastContainer from './src/components/Toast';
import Splash from './src/components/Splash';

const MIN_SPLASH_MS = 2600;

function AppContent() {
  const { colors, themeChecked } = useTheme();
  const { langChecked } = useLang();
  const { currentUser, authChecked, updateUser } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

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
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <AppNavigator />
          <ToastContainer />
        </View>
      </CategoriesProvider>
    </CurrencyProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
