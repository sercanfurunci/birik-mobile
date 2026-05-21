import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, type, fonts } from '../constants/tokens';

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
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.text3} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    fontSize: 10,
    marginBottom: spacing.xs + 2,
  },
  inputWrap: {
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md + 2,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
