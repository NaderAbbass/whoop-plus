// src/screens/OverviewScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Polyline,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useBLE } from '../hooks/useBLE';
import { colors, getRecoveryColor, getRecoveryLabel, getZoneColor, getZoneName } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 80;

export function OverviewScreen() {
  const ble = useBLE();
  const [showConnect, setShowConnect] = useState(!ble.isConnected);

  const recovery = 72; // Demo until calculated
  const recoveryColor = getRecoveryColor(recovery);

  // ---- Connect Screen ----
  if (showConnect && !ble.isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.connectScreen}>
          <View style={styles.connectRing}>
            <Text style={{ fontSize: 44 }}>⌚</Text>
          </View>
          <Text style={styles.connectTitle}>Connect Your WHOOP</Text>
          <Text style={styles.connectSub}>
            Enable HR Broadcast in your WHOOP app, then tap connect below.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={async () => {
              const ok = await ble.connect();
              if (ok) setShowConnect(false);
            }}
          >
            <Text style={styles.btnPrimaryText}>Connect WHOOP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => setShowConnect(false)}
          >
            <Text style={styles.btnGhostText}>View Demo Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Date ----
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // ---- HR Chart ----
  const hrData = ble.hrHistory.length > 1 ? ble.hrHistory : generateDemoHR();
  const hrMin = Math.min(...hrData);
  const hrMax = Math.max(...hrData);
  const hrAvg = Math.round(hrData.reduce((a, b) => a + b, 0) / hrData.length);
  const hrRange = (hrMax - hrMin) || 1;
  const chartH = 90;
  const step = CHART_W / (hrData.length - 1);
  const points = hrData
    .map((v, i) => `${i * step},${chartH - ((v - hrMin + 8) / (hrRange + 16)) * chartH}`)
    .join(' ');
  const areaPoints = `0,${chartH} ${points} ${(hrData.length - 1) * step},${chartH}`;
  const hrColor = ble.heartRate > 0 ? getZoneColor(ble.heartRate) : colors.green;

  // ---- Recovery Circle ----
  const CIRC = 2 * Math.PI * 88;
  const recOffset = CIRC - (CIRC * recovery) / 100;

  // ---- Strain ----
  const strain = ble.strain || 8.4;

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.brand}>WHOOP</Text>
        <View style={styles.statusRight}>
          {ble.isConnected && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {ble.battery !== null && (
            <Text style={styles.batteryText}>🔋 {ble.battery}%</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.dateText}>{dateStr}</Text>

        {/* Recovery Circle */}
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={{ width: 200, height: 200, position: 'relative' }}>
            <Svg width={200} height={200} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={100} cy={100} r={88}
                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12}
              />
              <Circle
                cx={100} cy={100} r={88}
                fill="none" stroke={recoveryColor} strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={recOffset}
              />
            </Svg>
            <View style={styles.circleCenter}>
              <Text style={[styles.circleBig, { color: recoveryColor }]}>
                {recovery}%
              </Text>
              <Text style={styles.circleSub}>{getRecoveryLabel(recovery)}</Text>
            </View>
          </View>
          <Text style={styles.circleLabel}>
            RECOVERY{' '}
            <Text style={[styles.tag, ble.isConnected ? styles.tagLive : styles.tagDemo]}>
              {ble.isConnected ? 'LIVE' : 'DEMO'}
            </Text>
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>STRAIN</Text>
            <Text style={[styles.statVal, { color: colors.blue }]}>
              {strain.toFixed(1)}
              <Text style={styles.statUnit}> / 21</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>HR</Text>
            <Text style={[styles.statVal, { color: hrColor }]}>
              {ble.heartRate || '--'}
              <Text style={styles.statUnit}> bpm</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SLEEP</Text>
            <Text style={[styles.statVal, { color: colors.purple }]}>
              7.5
              <Text style={styles.statUnit}> hrs</Text>
            </Text>
          </View>
        </View>

        {/* HR Chart */}
        <View style={styles.card}>
          <View style={styles.hrHeader}>
            <Text style={styles.label}>HEART RATE</Text>
            {ble.heartRate > 0 && (
              <View
                style={[
                  styles.zonePill,
                  { backgroundColor: hrColor + '20' },
                ]}
              >
                <Text style={[styles.zonePillText, { color: hrColor }]}>
                  {getZoneName(ble.heartRate)}
                </Text>
              </View>
            )}
          </View>
          <Svg width={CHART_W} height={chartH} style={{ marginTop: 6 }}>
            <Defs>
              <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={hrColor} stopOpacity="0.2" />
                <Stop offset="100%" stopColor={hrColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polygon points={areaPoints} fill="url(#hrGrad)" />
            <Polyline
              points={points}
              fill="none"
              stroke={hrColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.hrStats}>
            <Text style={styles.hrStatText}>Min: {hrMin} bpm</Text>
            <Text style={styles.hrStatText}>Avg: {hrAvg} bpm</Text>
            <Text style={styles.hrStatText}>Max: {hrMax} bpm</Text>
          </View>
        </View>

        {/* Session Timer */}
        {ble.isConnected && ble.sessionSeconds > 0 && (
          <View style={styles.sessionBar}>
            <Text style={styles.sessionLabel}>SESSION</Text>
            <Text style={styles.sessionTime}>
              {pad2(Math.floor(ble.sessionSeconds / 60))}:
              {pad2(ble.sessionSeconds % 60)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helpers
function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function generateDemoHR(): number[] {
  const data: number[] = [];
  for (let i = 0; i < 80; i++) {
    data.push(
      Math.round(
        62 +
          Math.sin(i * 0.15) * 8 +
          Math.sin(i * 0.05) * 4 +
          (Math.random() - 0.5) * 4
      )
    );
  }
  return data;
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Status bar
  statusBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 8, paddingBottom: 10,
  },
  brand: { fontSize: 11, fontWeight: '800', letterSpacing: 3, color: colors.text4 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.greenDim, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 10, fontWeight: '700', color: colors.green, letterSpacing: 1 },
  batteryText: { fontSize: 11, color: colors.text3 },

  // Connect screen
  connectScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 44 },
  connectRing: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  connectTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 12, letterSpacing: -0.8 },
  connectSub: { fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  btnPrimary: {
    width: '100%', padding: 17, borderRadius: 14,
    backgroundColor: colors.green, alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
  btnGhost: {
    marginTop: 14, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  btnGhostText: { fontSize: 14, color: colors.text3 },

  // Date
  dateText: { fontSize: 14, color: colors.text4, marginBottom: 22, fontWeight: '500' },

  // Circle
  circleCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBig: { fontSize: 52, fontWeight: '800', letterSpacing: -3 },
  circleSub: { fontSize: 12, color: colors.text3, marginTop: 2, letterSpacing: 1 },
  circleLabel: {
    textAlign: 'center', color: colors.text4, fontSize: 10,
    marginTop: 10, letterSpacing: 2, fontWeight: '700',
  },
  tag: { fontSize: 8, letterSpacing: 1, fontWeight: '700', overflow: 'hidden' },
  tagLive: { color: colors.green },
  tagDemo: { color: colors.text3 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  statLabel: {
    fontSize: 10, color: colors.text4, letterSpacing: 1.5,
    fontWeight: '700', marginBottom: 8,
  },
  statVal: { fontSize: 26, fontWeight: '800', letterSpacing: -1.5 },
  statUnit: { fontSize: 11, fontWeight: '500', color: colors.text3 },

  // Card
  card: {
    backgroundColor: colors.bgCard, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14,
  },
  label: {
    fontSize: 10, color: colors.text4, letterSpacing: 1.8,
    fontWeight: '700',
  },

  // HR
  hrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  zonePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  zonePillText: { fontSize: 10, fontWeight: '700' },
  hrStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  hrStatText: { fontSize: 10, color: colors.text3, fontWeight: '500' },

  // Session
  sessionBar: {
    backgroundColor: colors.greenDim, borderRadius: 16,
    padding: 14, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.12)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sessionLabel: { fontSize: 11, color: colors.text2, letterSpacing: 2, fontWeight: '700' },
  sessionTime: { fontSize: 20, fontWeight: '800', color: colors.text },
});
