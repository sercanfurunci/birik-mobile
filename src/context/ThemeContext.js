import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK } from '../constants/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');
  const [themeChecked, setThemeChecked] = useState(false);

  const isDark = themeMode === 'system'
    ? systemScheme !== 'light'
    : themeMode === 'dark';
  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    AsyncStorage.getItem('theme').then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') {
        setThemeModeState(v);
      }
    }).finally(() => setThemeChecked(true));
  }, []);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    if (mode === 'system') AsyncStorage.removeItem('theme');
    else AsyncStorage.setItem('theme', mode);
  };

  const toggleTheme = () => {
    const next = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, themeMode, setThemeMode, themeChecked }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
