// src/screens/RecoveryScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors, getRecoveryColor, getRecoveryLabel } from '../theme/colors';

const CIRC = 2 * Math.PI * 88;

export function RecoveryScreen() {
  const recovery = 72;
  const rc = getRecoveryColor(recovery);

  const METRICS = [
    { label: 'HRV', value: '68', unit: 'ms', desc: 'Heart Rate Variability', color: colors.green },
    { label: 'RHR', value: '52', unit: 'bpm', desc: 'Resting Heart Rate', color: colors.blue },
    { label: 'SpO2', value: '97', unit: '%', desc: 'Blood Oxygen', color: colors.purple },
    { label: 'Skin Temp', value: '36.4', unit: '°C', desc: 'During Sleep', color: colors.orange },
  ];

  const TREND = [45, 62, 78, 55, 88, 72, 72];
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.date}>Recovery</Text>

        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: 200, height: 200, position: 'relative' }}>
            <Svg width={200} height={200} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={100} cy={100} r={88} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} />
              <Circle cx={100} cy={100} r={88} fill="none" stroke={rc} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC - CIRC * recovery / 100} />
            </Svg>
            <View style={s.cc}>
              <Text style={[s.big, { color: rc }]}>{recovery}%</Text>
              <Text style={s.sub}>{getRecoveryLabel(recovery)}</Text>
            </View>
          </View>
          <Text style={s.clbl}>RECOVERY</Text>
        </View>

        <View style={s.grid}>
          {METRICS.map((m, i) => (
            <View key={i} style={s.card}>
              <Text style={s.lbl}>{m.label}</Text>
              <Text style={[s.mv, { color: m.color }]}>
                {m.value}<Text style={s.mu}>{m.unit}</Text>
              </Text>
              <Text style={s.md}>{m.desc}</Text>
            </View>
          ))}
        </View>

        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={[s.lbl, { marginBottom: 16 }]}>7-DAY TREND</Text>
          <View style={s.trendWrap}>
            {TREND.map((v, i) => (
              <View key={i} style={s.trendCol}>
                <Text style={s.trendNum}>{v}</Text>
                <View style={[s.trendBar, {
                  height: v * 0.65,
                  backgroundColor: getRecoveryColor(v),
                  opacity: i === 6 ? 1 : 0.45,
                }]} />
                <Text style={s.trendDay}>{DAYS[i]}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, width: '48%', flexGrow: 1 },
  lbl: { fontSize: 10, color: colors.text4, letterSpacing: 1.8, fontWeight: '700', marginBottom: 10 },
  mv: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  mu: { fontSize: 11, fontWeight: '500', color: colors.text3 },
  md: { fontSize: 10, color: colors.text3, marginTop: 4, fontWeight: '500' },
  trendWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 80 },
  trendCol: { flex: 1, alignItems: 'center', gap: 4 },
  trendNum: { fontSize: 8, color: colors.text4, fontWeight: '600' },
  trendBar: { width: '100%', borderRadius: 4 },
  trendDay: { fontSize: 8, color: colors.text3, fontWeight: '700' },
});
