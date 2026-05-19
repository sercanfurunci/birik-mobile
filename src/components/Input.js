import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Input({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, style, multiline, numberOfLines,
  editable = true,
}) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={style}>
      {label && <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>}
      <View style={[styles.inputWrap, {
        backgroundColor: colors.surface2,
        borderColor: colors.border,
      }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          style={[styles.input, { color: colors.text1 }, multiline && { height: 80, textAlignVertical: 'top' }]}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
            <Text style={{ color: colors.text3, fontSize: 13 }}>{showPassword ? '👁' : '👁‍🗨'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
