# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Project: birik-mobile

React Native / Expo (SDK 54) personal finance app. Backend is a separate REST API (`API` constant in `src/utils/api.js`).

## Architecture

- **Context providers** (wrap the whole app in App.js): ThemeProvider → LangProvider → AuthProvider → ToastProvider → CurrencyProvider → CategoriesProvider
- **Navigation**: `src/navigation/AppNavigator.js` — auth stack vs main tab navigator
- **Screens**: `src/screens/` — auth screens + main tab screens (Home, Analytics, Profile, etc.)
- **Components**: `src/components/` — shared UI (Dropdown, Toast, Splash, etc.)
- **Constants**: `src/constants/theme.js` (LIGHT/DARK color tokens), `src/constants/currencies.js`

## Theme system (3-state)

`ThemeContext` has `themeMode`: `'system' | 'light' | 'dark'`
- `'system'` = follows `useColorScheme()`, AsyncStorage key is **removed** (not set to 'system')
- Explicit modes saved to AsyncStorage key `'theme'`
- `themeChecked` flag: true after AsyncStorage read completes — used in App.js to hold splash

## Language system (3-state)

`LangContext` has `langMode`: `'system' | 'en' | 'tr'`
- `'system'` = follows phone language via `detectSystemLang()`, AsyncStorage key is **removed**
- Explicit modes saved to AsyncStorage key `'lang'`
- `langChecked` flag: same pattern as themeChecked
- All UI strings go through `t('key')` — translations defined inside LangContext

## Splash screen

- JS splash (`src/components/Splash.js`): static, no animation — displays immediately
- Native splash (app.json): uses `birik-icon.png`, light bg `#F7F4ED`, dark bg `#0D0D0D`
- App.js holds on splash until: `authChecked && themeChecked && langChecked && minElapsed`

## Key conventions

- Styles via `makeStyles(colors)` called inside the component, assigned to `s`
- `Section` helper component used in ProfileScreen for grouped settings rows
- `authFetch` wraps fetch with auth token; all API calls use it
- No mocking — integration tests hit real backend
- No extra comments, no trailing summaries in responses
