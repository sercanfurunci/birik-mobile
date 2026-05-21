import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredLang, tForLang } from '../context/LangContext';

const KEY = 'biometric_lock_enabled';

export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricLockEnabled() {
  const val = await AsyncStorage.getItem(KEY);
  return val === 'true';
}

export async function setBiometricLockEnabled(enabled) {
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometrics(promptMessage) {
  const lang = await getStoredLang();
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || tForLang(lang, 'bioPromptMessage'),
    fallbackLabel: tForLang(lang, 'bioFallbackLabel'),
    cancelLabel: tForLang(lang, 'cancelBtn'),
    disableDeviceFallback: false,
  });
  return result.success;
}
