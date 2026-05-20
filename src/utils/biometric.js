import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || 'Kimliğini doğrula',
    fallbackLabel: 'Şifre kullan',
    cancelLabel: 'İptal',
    disableDeviceFallback: false,
  });
  return result.success;
}
