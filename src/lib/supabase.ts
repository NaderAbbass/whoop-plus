// src/lib/supabase.ts
import 'react-native-url-polyfill/dist/polyfill';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ============================================================
// UPDATE THESE WITH YOUR SUPABASE PROJECT CREDENTIALS
// ============================================================
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Secure storage adapter for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================
// Database helper functions
// ============================================================

// Buffer for batching HR readings
let hrBuffer: { hr: number; rr: number[]; ts: string }[] = [];
const BATCH_SIZE = 30; // Send every 30 readings (~30 seconds)

export async function addHRReading(
  heartRate: number,
  rrIntervals: number[] = [],
  timestamp?: Date
) {
  hrBuffer.push({
    hr: heartRate,
    rr: rrIntervals,
    ts: (timestamp || new Date()).toISOString(),
  });

  if (hrBuffer.length >= BATCH_SIZE) {
    await flushHRBuffer();
  }
}

export async function flushHRBuffer() {
  if (hrBuffer.length === 0) return;

  const batch = [...hrBuffer];
  hrBuffer = [];

  try {
    const { error } = await supabase.rpc('insert_hr_batch', {
      readings: batch,
    });
    if (error) {
      console.error('Failed to flush HR batch:', error);
      // Put readings back in buffer
      hrBuffer = [...batch, ...hrBuffer];
    }
  } catch (e) {
    console.error('HR batch error:', e);
    hrBuffer = [...batch, ...hrBuffer];
  }
}

export async function startSession(type = 'activity') {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ session_type: type, is_active: true })
    .select()
    .single();

  if (error) console.error('Start session error:', error);
  return data;
}

export async function endSession(
  sessionId: string,
  stats: {
    avgHR: number;
    maxHR: number;
    minHR: number;
    strain: number;
    calories: number;
    zoneDurations: Record<string, number>;
  }
) {
  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_sec: Math.floor(
        (Date.now() - new Date().getTime()) / 1000
      ),
      avg_hr: stats.avgHR,
      max_hr: stats.maxHR,
      min_hr: stats.minHR,
      strain: stats.strain,
      calories_active: stats.calories,
      zone_durations: stats.zoneDurations,
      is_active: false,
    })
    .eq('id', sessionId);

  if (error) console.error('End session error:', error);
}

export async function getRecentHR(minutes = 60) {
  const from = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('hr_readings')
    .select('heart_rate, recorded_at')
    .gte('recorded_at', from)
    .order('recorded_at', { ascending: true });

  if (error) console.error('Get HR error:', error);
  return data || [];
}

export async function getDailySummary(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('date', targetDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Get daily summary error:', error);
  }
  return data;
}

export async function upsertDailySummary(summary: Record<string, any>) {
  const { error } = await supabase
    .from('daily_summaries')
    .upsert(
      { ...summary, date: summary.date || new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,date' }
    );

  if (error) console.error('Upsert daily summary error:', error);
}

export async function updateDevice(deviceInfo: {
  deviceName: string;
  deviceId: string;
  batteryLevel?: number;
}) {
  const { error } = await supabase.from('devices').upsert(
    {
      device_name: deviceInfo.deviceName,
      device_id: deviceInfo.deviceId,
      last_battery_level: deviceInfo.batteryLevel,
      last_connected_at: new Date().toISOString(),
    },
    { onConflict: 'device_id' }
  );

  if (error) console.error('Update device error:', error);
}
