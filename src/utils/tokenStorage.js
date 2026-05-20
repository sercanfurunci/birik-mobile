import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_token';

export async function getToken() {
  const secure = await SecureStore.getItemAsync(KEY);
  if (secure) return secure;
  const legacy = await AsyncStorage.getItem(KEY);
  if (legacy) {
    await SecureStore.setItemAsync(KEY, legacy);
    await AsyncStorage.removeItem(KEY);
    return legacy;
  }
  return null;
}

export async function setToken(token) {
  await SecureStore.setItemAsync(KEY, token);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(KEY);
  await AsyncStorage.removeItem(KEY);
}
