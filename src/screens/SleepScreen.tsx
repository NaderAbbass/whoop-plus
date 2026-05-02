// src/screens/SleepScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const CIRC = 2 * Math.PI * 88;
const SLP = { total: 7.5 * 3600, rem: 1.8 * 3600, deep: 1.5 * 3600, light: 3.2 * 3600, awake: 1 * 3600, eff: 89 };
const ft = (s: number) => Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';

const STAGES = [
  { name: 'Awake', time: SLP.awake, color: '#FF6D00' },
  { name: 'REM', time: SLP.rem, color: '#18FFFF' },
  { name: 'Light', time: SLP.light, color: '#B388FF' },
  { name: 'Deep', time: SLP.deep, color: '#536DFE' },
];

export function SleepScreen() {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Sleep Performance</Text>

        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 200, height: 200, position: 'relative' }}>
            <Svg width={200} height={200} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={100} cy={100} r={88} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} />
              <Circle cx={100} cy={100} r={88} fill="none" stroke={colors.purple} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC - CIRC * SLP.eff / 100} />
            </Svg>
            <View style={s.cc}>
              <Text style={[s.big, { color: colors.purple }]}>{SLP.eff}%</Text>
            </View>
          </View>
          <Text style={s.clbl}>SLEEP PERFORMANCE</Text>
        </View>

        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={s.lbl}>TIME IN BED</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{ft(SLP.total)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.lbl}>WINDOW</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text2 }}>23:15 - 06:45</Text>
            </View>
          </View>

          <View style={s.stagesBar}>
            {STAGES.map((st, i) => (
              <View key={i} style={{ width: `${(st.time / SLP.total) * 100}%`, backgroundColor: st.color, borderRadius: 4 }} />
            ))}
          </View>

          <View style={s.legend}>
            {STAGES.map((st, i) => (
              <View key={i} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: st.color }]} />
                <Text style={s.legendName}>{st.name}</Text>
                <Text style={s.legendTime}>{ft(st.time)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.metricsRow}>
          {[
            { label: 'Disturbances', value: '3', color: colors.orange },
            { label: 'Resp. Rate', value: '15.2', color: colors.cyan },
            { label: 'Sleep Need', value: '7h 54m', color: colors.purple },
          ].map((m, i) => (
            <View key={i} style={s.metric}>
              <Text style={s.metricLabel}>{m.label}</Text>
              <Text style={[s.metricVal, { color: m.color }]}>{m.value}</Text>
            </View>
          ))}
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
  clbl: { textAlign: 'center', color: colors.text4, fontSize: 10, marginTop: 10, letterSpacing: 2, fontWeight: '700' },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  lbl: { fontSize: 10, color: colors.text4, letterSpacing: 1.8, fontWeight: '700', marginBottom: 10 },
  stagesBar: { flexDirection: 'row', height: 20, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%' },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendName: { fontSize: 12, color: colors.text2, fontWeight: '500' },
  legendTime: { fontSize: 12, color: colors.text3, marginLeft: 'auto', fontWeight: '500' },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  metricLabel: { fontSize: 8, color: colors.text4, letterSpacing: 1, fontWeight: '700', marginBottom: 6 },
  metricVal: { fontSize: 16, fontWeight: '800' },
});
