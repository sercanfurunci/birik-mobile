import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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

  // Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [sortBy, setSortBy] = useState('dateDesc');
  const [showFilters, setShowFilters] = useState(false);

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
    setEditDate(tx.date || todayLocalISO());
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
    Alert.alert(t('deleteTransaction'), `${t('deleteConfirmLine1')} "${tx.description || t(tx.category)}"?`, [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('deleteBtn'), style: 'destructive',
        onPress: async () => {
          const ok = await deleteTransaction(tx.id);
          if (ok) showToast(t('toastTxDeleted'));
        },
      },
    ]);
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast(t('permissionDenied'), 'error'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (res.canceled) return;
    const f = res.assets[0];
    await uploadFile(f.uri, 'statement.jpg', f.mimeType || 'image/jpeg');
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast(t('permissionDenied'), 'error'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (res.canceled) return;
    const f = res.assets[0];
    await uploadFile(f.uri, 'statement.jpg', f.mimeType || 'image/jpeg');
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
    if (sortBy === 'dateDesc') list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
    else if (sortBy === 'dateAsc') list.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    else if (sortBy === 'amountDesc') list.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    else if (sortBy === 'amountAsc') list.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    return list;
  }, [transactions, search, filterType, filterCat, sortBy]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
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
            <TouchableOpacity key={tx.id} onLongPress={() => handleDelete(tx)} activeOpacity={0.85}>
              <View style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }, i > 0 && { marginTop: 8 }]}>
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
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.txAmt, { color: tx.type === 'income' ? colors.green : colors.red }]}>
                    {tx.type === 'income' ? '+' : '-'}{symbol}{fmt(tx.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => openEdit(tx)}>
                    <Text style={{ color: colors.text3, fontSize: 11 }}>{t('editBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('addTransaction')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={{ color: colors.text3, fontSize: 20 }}>✕</Text>
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
        </View>
      </Modal>

      {/* Import modal */}
      <Modal visible={showImportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowImportModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.modalHeader, { padding: 20, paddingBottom: 0 }]}>
            <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('importTitle')}</Text>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <Ionicons name="close" size={22} color={colors.text3} />
            </TouchableOpacity>
          </View>

          {!importPreview ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 14, color: colors.text2, lineHeight: 20, marginBottom: 8 }}>
                {t('importDesc')}
              </Text>
              {importing ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator color={colors.brand} size="large" />
                  <Text style={{ color: colors.text3, marginTop: 12, fontSize: 14 }}>{t('importAnalyzing')}</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={[styles.importOption, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={28} color={colors.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text1 }}>{t('importCamera')}</Text>
                      <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{t('importCameraDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text3} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.importOption, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickImage}>
                    <Ionicons name="image-outline" size={28} color={colors.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text1 }}>{t('importGallery')}</Text>
                      <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{t('importGalleryDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text3} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.importOption, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickDocument}>
                    <Ionicons name="document-outline" size={28} color={colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text1 }}>{t('importPDF')}</Text>
                      <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{t('importPDFDesc')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text3} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editingTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingTx(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('editBtn')}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => editingTx && handleDelete(editingTx)}>
                    <Text style={{ color: colors.red, fontSize: 14, fontWeight: '600' }}>{t('deleteBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingTx(null)}>
                    <Text style={{ color: colors.text3, fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
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
  modal: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 4, borderWidth: 1, gap: 4, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  importOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
});
