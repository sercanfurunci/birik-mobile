import { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.container}>
        <Text style={s.emoji}>⚠️</Text>
        <Text style={s.title}>Bir şeyler ters gitti</Text>
        <Text style={s.desc}>Uygulamayı kapatıp yeniden açın.</Text>
        <TouchableOpacity style={s.btn} onPress={() => BackHandler.exitApp()}>
          <Text style={s.btnText}>Uygulamayı Kapat</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F7F4ED' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btn: { backgroundColor: '#22c55e', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
