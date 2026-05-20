import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'offline_queue';

export async function enqueue(item) {
  const queue = await getQueue();
  queue.push({ ...item, _queuedAt: Date.now() });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function removeFromQueue(tempId) {
  const queue = await getQueue();
  await AsyncStorage.setItem(KEY, JSON.stringify(queue.filter(i => i.tempId !== tempId)));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(KEY);
}
