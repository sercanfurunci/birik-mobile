import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';

export default function DatePickerField({ label, value, onChange, placeholder, optional, style }) {
  const { colors } = useTheme();
  const { t, lang } = useLang();
  const [show, setShow] = useState(false);

  const normalizedValue = value ? String(value).split('T')[0] : '';
  const date = normalizedValue ? new Date(normalizedValue + 'T00:00:00') : new Date();

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  const displayText = normalizedValue || placeholder || 'YYYY-MM-DD';

  return (
    <View style={style}>
      {label && (
        <Text style={[s.label, { color: colors.text3 }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        style={[s.trigger, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
      >
        <Text style={[s.triggerText, { color: value ? colors.text1 : colors.text3 }]}>
          {displayText}
        </Text>
        {value && (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: colors.text3, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={s.iosBackdrop}>
            <TouchableOpacity style={s.iosDismiss} onPress={() => setShow(false)} />
            <View style={[s.iosSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.iosHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ color: colors.brand, fontWeight: '600', fontSize: 16 }}>{t('doneBtn')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                style={{ height: 200 }}
                locale={lang === 'tr' ? 'tr-TR' : 'en-US'}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46,
  },
  triggerText: { fontSize: 14, fontWeight: '500' },
  iosBackdrop: { flex: 1, justifyContent: 'flex-end' },
  iosDismiss: { flex: 1 },
  iosSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, overflow: 'hidden' },
  iosHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 14, borderBottomWidth: 1 },
});
