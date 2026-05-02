// src/screens/StrainScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const CIRC = 2 * Math.PI * 88;

const ZONES = [
  { name: 'Zone 5 (Max)', color: '#FF1744', pct: 5 },
  { name: 'Zone 4 (Very Hard)', color: '#FF6D00', pct: 12 },
  { name: 'Zone 3 (Hard)', color: '#FFEA00', pct: 18 },
  { name: 'Zone 2 (Moderate)', color: '#00E676', pct: 35 },
  { name: 'Zone 1 (Light)', color: '#18FFFF', pct: 22 },
  { name: 'Rest', color: '#448AFF', pct: 8 },
];

export function StrainScreen() {
  const strain = 8.4; // Will come from BLE hook

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Day Strain</Text>

        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: 200, height: 200, position: 'relative' }}>
            <Svg width={200} height={200} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={100} cy={100} r={88} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} />
              <Circle cx={100} cy={100} r={88} fill="none" stroke={colors.blue} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC - CIRC * strain / 21} />
            </Svg>
            <View style={s.cc}>
              <Text style={[s.big, { color: colors.blue }]}>{strain.toFixed(1)}</Text>
              <Text style={s.sub}>/ 21.0</Text>
            </View>
          </View>
          <Text style={s.clbl}>STRAIN</Text>
        </View>

        {/* Strain Bar */}
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${(strain / 21) * 100}%` }]} />
        </View>
        <View style={s.barNums}>
          <Text style={s.barNum}>0</Text><Text style={s.barNum}>7</Text>
          <Text style={s.barNum}>14</Text><Text style={s.barNum}>21</Text>
        </View>

        {/* Zones */}
        <Text style={[s.lbl, { marginTop: 28, marginBottom: 16 }]}>ZONE DURATION</Text>
        {ZONES.map((z, i) => (
          <View key={i} style={s.zoneRow}>
            <View style={[s.zoneDot, { backgroundColor: z.color }]} />
            <Text style={s.zoneName}>{z.name}</Text>
            <View style={s.zoneTrack}>
              <View style={[s.zoneFill, { width: `${z.pct}%`, backgroundColor: z.color }]} />
            </View>
            <Text style={s.zonePct}>{z.pct}%</Text>
          </View>
        ))}

        {/* Calories */}
        <View style={[s.card, { marginTop: 18 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { label: 'Active Cal', value: '378' },
              { label: 'Total Cal', value: '2178' },
              { label: 'Max HR', value: '168' },
            ].map((item, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Text style={s.calLabel}>{item.label}</Text>
                <Text style={s.calVal}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  date: { fontSize: 14, color: colors.text4, marginBottom: 22, fontWeight: '500' },
  cc: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 52, fontWeight: '800', letterSpacing: -3 },
  sub: { fontSize: 12, color: colors.text3, marginTop: 4 },
  clbl: { textAlign: 'center', color: colors.text4, fontSize: 10, marginTop: 10, letterSpacing: 2, fontWeight: '700' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.blue },
  barNums: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  barNum: { fontSize: 9, color: colors.text3, fontWeight: '600' },
  lbl: { fontSize: 10, color: colors.text4, letterSpacing: 1.8, fontWeight: '700' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  zoneDot: { width: 8, height: 8, borderRadius: 3 },
  zoneName: { flex: 1, fontSize: 12, color: colors.text2, fontWeight: '500' },
  zoneTrack: { width: 80, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  zoneFill: { height: '100%', borderRadius: 2 },
  zonePct: { fontSize: 10, color: colors.text3, width: 28, textAlign: 'right', fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
  calLabel: { fontSize: 10, color: colors.text4, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 },
  calVal: { fontSize: 22, fontWeight: '800', color: colors.text },
});
