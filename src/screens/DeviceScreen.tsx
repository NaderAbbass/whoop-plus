// src/screens/DeviceScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBLE } from '../hooks/useBLE';
import { colors } from '../theme/colors';

export function DeviceScreen() {
  const ble = useBLE();

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Device</Text>

        {/* Connection Card */}
        <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
          <View style={[s.deviceIcon, { backgroundColor: ble.isConnected ? colors.greenDim : 'rgba(255,255,255,0.04)' }]}>
            <Text style={{ fontSize: 30 }}>⌚</Text>
          </View>
          <Text style={s.deviceName}>{ble.isConnected ? ble.deviceName || 'WHOOP' : 'WHOOP 4.0'}</Text>
          <Text style={[s.deviceStatus, { color: ble.isConnected ? colors.green : colors.red }]}>
            {ble.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <TouchableOpacity
            style={[s.btn, ble.isConnected ? s.btnRed : s.btnGreen]}
            onPress={() => {
              if (ble.isConnected) {
                Alert.alert('Disconnect', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disconnect', style: 'destructive', onPress: () => ble.disconnect() },
                ]);
              } else {
                ble.connect();
              }
            }}
          >
            <Text style={[s.btnText, { color: ble.isConnected ? colors.red : '#000' }]}>
              {ble.isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Battery */}
        <View style={s.card}>
          <Text style={s.lbl}>BATTERY</Text>
          <View style={s.batteryRow}>
            <View style={s.batteryTrack}>
              <View style={[s.batteryFill, {
                width: `${ble.battery || 0}%`,
                backgroundColor: (ble.battery || 0) > 20 ? colors.green : colors.red,
              }]} />
            </View>
            <Text style={s.batteryPct}>{ble.battery != null ? `${ble.battery}%` : '--%'}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          <Text style={[s.lbl, { paddingTop: 16, paddingHorizontal: 18 }]}>ACTIONS</Text>

          <TouchableOpacity style={s.actionItem} onPress={() => ble.sendHaptics()}>
            <View style={s.actionIcon}><Text style={{ fontSize: 22 }}>📳</Text></View>
            <View>
              <Text style={s.actionTitle}>Run Haptics</Text>
              <Text style={s.actionSub}>Vibrate the band</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionItem} onPress={() => {
            // Export functionality
            Alert.alert('Export', `${ble.hrHistory.length} HR readings ready to export`);
          }}>
            <View style={s.actionIcon}><Text style={{ fontSize: 22 }}>📊</Text></View>
            <View>
              <Text style={s.actionTitle}>Export Data</Text>
              <Text style={s.actionSub}>Share HR history</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={[s.card, { maxHeight: 250 }]}>
          <Text style={s.lbl}>LOG</Text>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {ble.logs.length === 0 ? (
              <Text style={{ fontSize: 11, color: colors.text3 }}>No events yet</Text>
            ) : (
              ble.logs.map((log, i) => (
                <Text key={i} style={s.logEntry}>{log}</Text>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  date: { fontSize: 14, color: colors.text4, marginBottom: 22, fontWeight: '500' },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  lbl: { fontSize: 10, color: colors.text4, letterSpacing: 1.8, fontWeight: '700', marginBottom: 10 },

  deviceIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  deviceName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  deviceStatus: { fontSize: 12, fontWeight: '600', marginBottom: 18 },

  btn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  btnGreen: { backgroundColor: colors.green },
  btnRed: { borderWidth: 1, borderColor: 'rgba(255,23,68,0.25)', backgroundColor: 'transparent' },
  btnText: { fontSize: 14, fontWeight: '700' },

  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batteryTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 3 },
  batteryPct: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 40, textAlign: 'right' },

  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: colors.border },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  actionSub: { fontSize: 11, color: colors.text3, fontWeight: '500' },

  logEntry: { fontSize: 10, color: colors.text4, marginBottom: 3, fontFamily: 'Courier' },
});
