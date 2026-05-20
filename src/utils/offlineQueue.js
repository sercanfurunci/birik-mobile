import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = 'offline_queue_index';
const ITEM_PREFIX = 'offline_queue_item_';
const LEGACY_KEY = 'offline_queue';

function itemKey(tempId) {
  return `${ITEM_PREFIX}${tempId.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function readIndex() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeIndex(ids) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

async function migrateLegacy() {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy) || legacy.length === 0) {
      await AsyncStorage.removeItem(LEGACY_KEY);
      return;
    }
    const ids = [];
    for (const item of legacy) {
      if (!item?.tempId) continue;
      await SecureStore.setItemAsync(itemKey(item.tempId), JSON.stringify(item));
      ids.push(item.tempId);
    }
    await writeIndex(ids);
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {}
}

let migrated = false;
async function ensureMigrated() {
  if (migrated) return;
  await migrateLegacy();
  migrated = true;
}

export async function enqueue(item) {
  await ensureMigrated();
  const entry = { ...item, _queuedAt: Date.now() };
  await SecureStore.setItemAsync(itemKey(item.tempId), JSON.stringify(entry));
  const ids = await readIndex();
  ids.push(item.tempId);
  await writeIndex(ids);
}

export async function getQueue() {
  await ensureMigrated();
  const ids = await readIndex();
  const items = [];
  for (const id of ids) {
    try {
      const raw = await SecureStore.getItemAsync(itemKey(id));
      if (raw) items.push(JSON.parse(raw));
    } catch {}
  }
  return items;
}

export async function removeFromQueue(tempId) {
  await ensureMigrated();
  try { await SecureStore.deleteItemAsync(itemKey(tempId)); } catch {}
  const ids = await readIndex();
  await writeIndex(ids.filter(id => id !== tempId));
}

export async function clearQueue() {
  await ensureMigrated();
  const ids = await readIndex();
  for (const id of ids) {
    try { await SecureStore.deleteItemAsync(itemKey(id)); } catch {}
  }
  await AsyncStorage.removeItem(INDEX_KEY);
}
