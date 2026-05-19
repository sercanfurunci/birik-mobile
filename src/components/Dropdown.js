import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  label,
  renderLabel,
  renderOption,
  leftDot,
  style,
  disabled,
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => (o.value ?? o) === value);
  const labelText = selected
    ? (renderLabel ? renderLabel(selected) : (selected.label ?? selected.value ?? selected))
    : placeholder;

  return (
    <View style={style}>
      {label && <Text style={[s.label, { color: colors.text3 }]}>{label}</Text>}
      <TouchableOpacity
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
        style={[s.trigger, { borderColor: colors.border, backgroundColor: colors.surface2, opacity: disabled ? 0.5 : 1 }]}
      >
        {leftDot && <View style={[s.dot, { backgroundColor: leftDot }]} />}
        <Text style={[s.triggerText, { color: selected ? colors.text1 : colors.text3 }]} numberOfLines={1}>
          {labelText}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.text3} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            {label && (
              <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.sheetTitle, { color: colors.text1 }]}>{label}</Text>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text3} />
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(item.value ?? item ?? i)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const itemValue = item.value ?? item;
                const itemLabel = item.label ?? item.value ?? item;
                const isSel = itemValue === value;
                return (
                  <TouchableOpacity
                    onPress={() => { onChange(itemValue); setOpen(false); }}
                    style={[s.option, isSel && { backgroundColor: `${colors.brand}15` }]}
                    activeOpacity={0.7}
                  >
                    {item.dot && <View style={[s.dot, { backgroundColor: item.dot }]} />}
                    <Text style={[s.optionText, { color: isSel ? colors.brand : colors.text1 }]}>
                      {renderOption ? renderOption(item) : itemLabel}
                    </Text>
                    {isSel && <Ionicons name="checkmark" size={18} color={colors.brand} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 380 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', maxHeight: '70%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  optionText: { flex: 1, fontSize: 15 },
});
