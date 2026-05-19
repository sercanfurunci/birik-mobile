import AsyncStorage from '@react-native-async-storage/async-storage';

export const API = 'https://api.furunci.tech';

export async function authFetch(url, opts = {}) {
  const token = await AsyncStorage.getItem('auth_token');
  return fetch(url, {
    ...opts,
    headers: {
      ...opts.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
