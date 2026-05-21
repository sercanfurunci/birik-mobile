import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cached_user';

export async function getCachedUser() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user) {
  try {
    if (!user) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch {}
}

export async function clearCachedUser() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
