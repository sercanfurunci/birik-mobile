import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCategories } from '../../context/CategoriesContext';
import { useToast } from '../../context/ToastContext';
import { fmt } from '../../utils/format';
import { todayLocalISO } from '../../utils/dateUtils';
import { API, authFetch } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Dropdown from '../../components/Dropdown';
import SwipeableRow from '../../components/SwipeableRow';
import DatePickerField from '../../components/DatePickerField';

const SORT_OPTIONS = ['dateDesc', 'dateAsc', 'amountDesc', 'amountAsc'];

export default function TransactionsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, formatDate } = useLang();
  const { transactions, addTransaction, deleteTransaction, editTransaction, refreshTransactions } = useAuth();
  const { symbol } = useCurrency();
  const { expenseCats, incomeCats, getCatColor } = useCategories();
  const { showToast } = useToast();

  // Add form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('food');
  const [addDate, setAddDate] = useState(todayLocalISO());
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingTx, setEditingTx] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('expense');
  const [editCategory, setEditCategory] = useState('food');
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [sortBy, setSortBy] = useState('dateDesc');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // array of parsed txs
  const [bulkImporting, setBulkImporting] = useState(false);

  const categoryOptions = type === 'income' ? incomeCats : expenseCats;
  const editCatOptions = editType === 'income' ? incomeCats : expenseCats;

  function switchType(nextType) {
    if (nextType === type) return;
    setType(nextType);
    setCategory(nextType === 'income' ? 'salary' : 'food');
  }

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) return;
    setAdding(true);
    const result = await addTransaction({ description: desc, amount, type, category, date: addDate });
    if (result) {
      showToast(t('toastTxAdded'));
      setDesc(''); setAmount(''); setType('expense'); setCategory('food'); setAddDate(todayLocalISO());
      setShowAddModal(false);
    }
    setAdding(false);
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setEditDesc(tx.description || '');
    setEditAmount(String(tx.amount));
    setEditType(tx.type);
    setEditCategory(tx.category);
    setEditDate((tx.date || todayLocalISO()).slice(0, 10));
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setSaving(true);
    const result = await editTransaction(editingTx.id, {
      description: editDesc, amount: editAmount,
      type: editType, category: editCategory, date: editDate,
    });
    if (result) {
      showToast(t('toastTxUpdated'));
      setEditingTx(null);
    }
    setSaving(false);
  };

  const handleDelete = (tx) => {
    setDeleteTarget(tx);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const ok = await deleteTransaction(deleteTarget.id);
    setDeleteTarget(null);
    if (ok) { setEditingTx(null); showToast(t('toastTxDeleted')); }
  };

  // ── Statement import ──────────────────────────────────────────────────────────
  const uploadFile = async (uri, name, mimeType) => {
    setImporting(true);
    setImportPreview(null);
    try {
      const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('auth_token');
      const formData = new FormData();
      formData.append('statement', { uri, name: name || 'statement.jpg', type: mimeType || 'image/jpeg' });
      const res = await fetch(`${API}/transactions/import?preview=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || t('serverError'), 'error'); return; }
      if (!data.transactions?.length) { showToast(t('importNoTxFound'), 'error'); return; }
      setImportPreview(data.transactions.map((tx, i) => ({ ...tx, _id: i, _cat: tx.category || 'other' })));
    } catch {
      showToast(t('serverError'), 'error');
    } finally {
      setImporting(false);
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets[0];
    await uploadFile(f.uri, f.name, f.mimeType);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { showToast(t('permissionDenied'), 'error'); return; }
      setShowImportModal(false);
      await new Promise(r => setTimeout(r, 400));
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (res.canceled) return;
      const f = res.assets[0];
      await uploadFile(f.uri, 'statement.jpg', f.mimeType || 'image/jpeg');
    } catch (e) { showToast(t('serverError'), 'error'); }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showToast(t('permissionDenied'), 'error'); return; }
      setShowImportModal(false);
      await new Promise(r => setTimeout(r, 500));
      const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!res || res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      setShowImportModal(true);
      await uploadFile(f.uri, 'statement.jpg', f.mimeType || 'image/jpeg');
    } catch (e) { showToast(String(e?.message || e), 'error'); }
  };

  const handleBulkImport = async () => {
    if (!importPreview?.length) return;
    setBulkImporting(true);
    try {
      const txs = importPreview.map(tx => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx._cat,
      }));
      const res = await authFetch(`${API}/transactions/import/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txs }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.imported || txs.length} ${t('importSuccess')}`, 'success');
        setShowImportModal(false);
        setImportPreview(null);
        refreshTransactions();
      } else {
        showToast(t('serverError'), 'error');
      }
    } catch {
      showToast(t('serverError'), 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search.trim()) list = list.filter(tx => (tx.description || '').toLowerCase().includes(search.toLowerCase()));
    if (filterType !== 'all') list = list.filter(tx => tx.type === filterType);
    if (filterCat !== 'all') list = list.filter(tx => tx.category === filterCat);
    if (dateFrom) list = list.filter(tx => tx.date?.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter(tx => tx.date?.slice(0, 10) <= dateTo);
    if (sortBy === 'dateDesc') list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
    else if (sortBy === 'dateAsc') list.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    else if (sortBy === 'amountDesc') list.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    else if (sortBy === 'amountAsc') list.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    return list;
  }, [transactions, search, filterType, filterCat, sortBy, dateFrom, dateTo]);

  const balanceMap = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    const map = {};
    let bal = 0;
    for (const tx of sorted) {
      bal += tx.type === 'income' ? parseFloat(tx.amount || 0) : -parseFloat(tx.amount || 0);
      map[tx.id] = bal;
    }
    return map;
  }, [transactions]);

  const handleExport = async () => {
    try {
      if (filtered.length === 0) return;
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['Date', 'Description', 'Category', 'Type', 'Amount'].map(escape).join(','),
        ...filtered.map(tx => [
          (tx.date ?? '').slice(0, 10),
          tx.description ?? '',
          t(tx.category),
          tx.type,
          (tx.type === 'expense' ? '-' : '') + parseFloat(tx.amount || 0).toFixed(2),
        ].map(escape).join(',')),
      ];
      const csv = '\uFEFF' + rows.join('\r\n');
      const fileName = `birik_${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === 'android') {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
          'content://com.android.externalstorage.documents/tree/primary%3ADownload'
        );
        if (!perm.granted) return;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, fileName, 'text/csv');
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        showToast(t('exportCsvToast'));
      } else {
        const path = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: fileName });
      }
    } catch (e) {
      showToast(String(e?.message || e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('transactions')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Recurring')} style={[styles.addBtn, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="repeat-outline" size={18} color={colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setImportPreview(null); setShowImportModal(true); }} style={[styles.addBtn, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="scan-outline" size={18} color={colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} disabled={filtered.length === 0} style={[styles.addBtn, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, opacity: filtered.length === 0 ? 0.4 : 1 }]}>
            <Ionicons name="download-outline" size={18} color={colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
            <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & filters */}
      <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={{ color: colors.text3, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.text3}
            style={{ flex: 1, color: colors.text1, fontSize: 14 }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: colors.text3, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(f => !f)}
          style={[styles.filterBtn, { backgroundColor: showFilters ? colors.brand : colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 14, color: showFilters ? '#fff' : colors.text2 }}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <Dropdown
              style={{ flex: 1 }}
              label={t('type')}
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'all', label: t('allTypes') },
                { value: 'income', label: t('incomeOption') },
                { value: 'expense', label: t('expenseOption') },
              ]}
            />
            <Dropdown
              style={{ flex: 1 }}
              label={t('category')}
              value={filterCat}
              onChange={setFilterCat}
              options={[
                { value: 'all', label: t('allCategories') },
                ...expenseCats.map(c => ({ value: c, label: t(c), dot: getCatColor(c, 'expense') })),
                ...incomeCats.filter(c => !expenseCats.includes(c)).map(c => ({ value: c, label: t(c), dot: getCatColor(c, 'income') })),
              ]}
            />
          </View>
          <Dropdown
            style={{ marginBottom: 10 }}
            label={t('sortBy')}
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'dateDesc', label: t('sortDateDesc') },
              { value: 'dateAsc', label: t('sortDateAsc') },
              { value: 'amountDesc', label: t('sortAmountDesc') },
              { value: 'amountAsc', label: t('sortAmountAsc') },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DatePickerField label={t('dateFrom')} value={dateFrom} onChange={setDateFrom} style={{ flex: 1 }} />
            <DatePickerField label={t('dateTo')} value={dateTo} onChange={setDateTo} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* Transaction list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>{t('noTransactions')}</Text>
          </View>
        ) : (
          filtered.map((tx, i) => (
            <View key={tx.id} style={i > 0 && { marginTop: 8 }}>
            <SwipeableRow onDelete={() => handleDelete(tx)}>
              <TouchableOpacity onPress={() => openEdit(tx)} activeOpacity={0.85}>
                <View style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.txIcon, { backgroundColor: `${getCatColor(tx.category, tx.type)}18` }]}>
                    <View style={[styles.txIconDot, { backgroundColor: getCatColor(tx.category, tx.type) }]} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.txDesc, { color: colors.text1 }]} numberOfLines={1}>
                      {tx.description || t(tx.category)}
                    </Text>
                    <Text style={[styles.txMeta, { color: colors.text3 }]}>
                      {formatDate(tx.date)} · {t(tx.category)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmt, { color: tx.type === 'income' ? colors.green : colors.red }]}>
                      {tx.type === 'income' ? '+' : '-'}{symbol}{fmt(tx.amount)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
                      {t('balance')}: {(balanceMap[tx.id] ?? 0) < 0 ? '-' : ''}{symbol}{fmt(Math.abs(balanceMap[tx.id] ?? 0))}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('addTransaction')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="close" size={18} color={colors.text2} />
                </TouchableOpacity>
              </View>

              <Input label={t('description')} value={desc} onChangeText={setDesc} placeholder={t('descriptionPlaceholder')} style={{ marginBottom: 16 }} />
              <Input label={t('amount')} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />

              <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{t('type')}</Text>
              <View style={[styles.toggle, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                {['expense', 'income'].map(tp => (
                  <TouchableOpacity key={tp} onPress={() => switchType(tp)} style={[styles.toggleBtn, type === tp && { backgroundColor: tp === 'income' ? colors.green : colors.red }]}>
                    <Text style={{ color: type === tp ? '#fff' : colors.text3, fontSize: 13, fontWeight: '600' }}>
                      {tp === 'income' ? `+ ${t('incomeOption')}` : `- ${t('expenseOption')}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Dropdown
                style={{ marginTop: 16, marginBottom: 16 }}
                label={t('category')}
                value={category}
                onChange={setCategory}
                leftDot={getCatColor(category, type)}
                options={categoryOptions.map(c => ({ value: c, label: t(c), dot: getCatColor(c, type) }))}
              />

              <Input label={t('date')} value={addDate} onChangeText={setAddDate} placeholder="YYYY-MM-DD" autoCapitalize="none" style={{ marginBottom: 24 }} />

              <Button title={adding ? '…' : t('addBtn')} onPress={handleAdd} loading={adding} disabled={!amount || parseFloat(amount) <= 0} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Import modal */}
      <Modal visible={showImportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowImportModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 0 }}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { marginBottom: 0 }]}>
              <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('importTitle')}</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="close" size={18} color={colors.text2} />
              </TouchableOpacity>
            </View>
          </View>

          {!importPreview ? (
            <View style={{ flex: 1, padding: 20 }}>
              {/* Description */}
              <Text style={{ fontSize: 13, color: colors.text3, lineHeight: 19, marginBottom: 24 }}>
                {t('importDesc')}
              </Text>

              {importing ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.brand} size="large" />
                  <Text style={{ color: colors.text3, marginTop: 16, fontSize: 14 }}>{t('importAnalyzing')}</Text>
                </View>
              ) : (
                <View style={[styles.importCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {[
                    { icon: 'camera-outline', color: colors.brand, label: t('importCamera'), desc: t('importCameraDesc'), onPress: takePhoto },
                    { icon: 'image-outline', color: colors.blue, label: t('importGallery'), desc: t('importGalleryDesc'), onPress: pickImage },
                    { icon: 'document-outline', color: colors.gold, label: t('importPDF'), desc: t('importPDFDesc'), onPress: pickDocument },
                  ].map(({ icon, color, label, desc, onPress }, i, arr) => (
                    <TouchableOpacity
                      key={icon}
                      onPress={onPress}
                      activeOpacity={0.7}
                      style={[
                        styles.importRow,
                        i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={[styles.importIconWrap, { backgroundColor: `${color}18` }]}>
                        <Ionicons name={icon} size={22} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text1 }}>{label}</Text>
                        <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{desc}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.text3} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 14, color: colors.text2 }}>
                  {importPreview.length} {t('importPreviewCount')}
                </Text>
              </View>
              <FlatList
                data={importPreview}
                keyExtractor={item => String(item._id)}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item, index }) => (
                  <View style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text1 }} numberOfLines={1}>
                          {item.description}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.text3 }}>{item.date}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: item.type === 'income' ? colors.green : colors.red }}>
                        {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
                      </Text>
                    </View>
                    <Dropdown
                      value={item._cat}
                      onChange={(val) => setImportPreview(prev => prev.map((tx, i) => i === index ? { ...tx, _cat: val } : tx))}
                      leftDot={getCatColor(item._cat, item.type)}
                      options={(item.type === 'income' ? incomeCats : expenseCats).map(c => ({ value: c, label: t(c), dot: getCatColor(c, item.type) }))}
                    />
                  </View>
                )}
              />
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.addBtn, { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => setImportPreview(null)}>
                    <Text style={{ color: colors.text2, fontWeight: '600' }}>{t('cancelBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addBtn, { flex: 2, height: 48, borderRadius: 12, backgroundColor: colors.brand, opacity: bulkImporting ? 0.6 : 1 }]}
                    onPress={handleBulkImport}
                    disabled={bulkImporting}
                  >
                    {bulkImporting
                      ? <ActivityIndicator color={colors.bg} size="small" />
                      : <Text style={{ color: colors.bg, fontWeight: '700' }}>{t('importConfirm')} ({importPreview.length})</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editingTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingTx(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('editBtn')}</Text>
                <TouchableOpacity onPress={() => setEditingTx(null)} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="close" size={18} color={colors.text2} />
                </TouchableOpacity>
              </View>

              <Input label={t('description')} value={editDesc} onChangeText={setEditDesc} placeholder={t('descriptionPlaceholder')} style={{ marginBottom: 16 }} />
              <Input label={t('amount')} value={editAmount} onChangeText={setEditAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" style={{ marginBottom: 16 }} />

              <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{t('type')}</Text>
              <View style={[styles.toggle, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                {['expense', 'income'].map(tp => (
                  <TouchableOpacity key={tp} onPress={() => { setEditType(tp); setEditCategory(tp === 'income' ? 'salary' : 'food'); }}
                    style={[styles.toggleBtn, editType === tp && { backgroundColor: tp === 'income' ? colors.green : colors.red }]}>
                    <Text style={{ color: editType === tp ? '#fff' : colors.text3, fontSize: 13, fontWeight: '600' }}>
                      {tp === 'income' ? `+ ${t('incomeOption')}` : `- ${t('expenseOption')}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Dropdown
                style={{ marginTop: 16, marginBottom: 16 }}
                label={t('category')}
                value={editCategory}
                onChange={setEditCategory}
                leftDot={getCatColor(editCategory, editType)}
                options={editCatOptions.map(c => ({ value: c, label: t(c), dot: getCatColor(c, editType) }))}
              />

              <Input label={t('date')} value={editDate} onChangeText={setEditDate} placeholder="YYYY-MM-DD" autoCapitalize="none" style={{ marginBottom: 24 }} />

              <Button title={saving ? t('savingBtn') : t('saveBtn')} onPress={handleSaveEdit} loading={saving} />
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.red, alignItems: 'center' }}
                onPress={() => editingTx && handleDelete(editingTx)}
              >
                <Text style={{ color: colors.red, fontWeight: '600', fontSize: 14 }}>{t('deleteBtn')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setDeleteTarget(null)}>
          <Pressable onPress={() => {}} style={[styles.deleteSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }]} />
            <View style={[styles.deleteIconWrap, { backgroundColor: `${colors.red}18` }]}>
              <Ionicons name="trash-outline" size={28} color={colors.red} />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text1 }]}>{t('deleteTransaction')}</Text>
            <Text style={[styles.deleteSub, { color: colors.text3 }]} numberOfLines={2}>
              {deleteTarget?.description || t(deleteTarget?.category ?? '')}
              {'\n'}
              <Text style={{ fontWeight: '600', color: colors.text2 }}>
                {deleteTarget?.type === 'income' ? '+' : '-'}{symbol}{fmt(deleteTarget?.amount)}
              </Text>
            </Text>
            <TouchableOpacity style={[styles.deleteConfirmBtn, { backgroundColor: colors.red }]} onPress={confirmDelete}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('deleteBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteCancelBtn, { borderColor: colors.border }]} onPress={() => setDeleteTarget(null)}>
              <Text style={{ color: colors.text2, fontWeight: '600', fontSize: 15 }}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: 1 },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 38 },
  filterBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterPanel: { padding: 12, borderBottomWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  txIconDot: { width: 10, height: 10, borderRadius: 5 },
  txDesc: { fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txMeta: { fontSize: 12 },
  txAmt: { fontSize: 14, fontWeight: '700' },
  modal: { padding: 24, paddingBottom: 48 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 4, borderWidth: 1, gap: 4, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  importCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  importIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  deleteIconWrap: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  deleteTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  deleteConfirmBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  deleteCancelBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
});
