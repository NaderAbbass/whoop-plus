// src/hooks/useBLE.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { bleManager, HRReading } from '../lib/ble';
import { addHRReading, flushHRBuffer, startSession, endSession } from '../lib/supabase';
import { addStrainReading, calculateHRV, getZoneDurations } from '../lib/calculations';

export interface BLEState {
  isConnected: boolean;
  deviceName: string;
  heartRate: number;
  hrHistory: number[];
  battery: number | null;
  strain: number;
  sessionSeconds: number;
  rrIntervals: number[];
  hrv: number | null;
  logs: string[];
}

export function useBLE() {
  const [state, setState] = useState<BLEState>({
    isConnected: false,
    deviceName: '',
    heartRate: 0,
    hrHistory: [],
    battery: null,
    strain: 0,
    sessionSeconds: 0,
    rrIntervals: [],
    hrv: null,
    logs: [],
  });

  const sessionRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const strainRef = useRef(0);
  const hrAllRef = useRef<number[]>([]);
  const rrAllRef = useRef<number[]>([]);

  // ---- BLE Callbacks ----
  useEffect(() => {
    bleManager.setCallbacks({
      onHRUpdate: (reading: HRReading) => {
        const { heartRate, rrIntervals } = reading;

        // Update strain
        strainRef.current = addStrainReading(strainRef.current, heartRate);
        hrAllRef.current.push(heartRate);

        // Collect RR intervals for HRV
        if (rrIntervals.length > 0) {
          rrAllRef.current.push(...rrIntervals);
        }

        // Calculate HRV periodically (every 30 readings)
        let hrv = state.hrv;
        if (rrAllRef.current.length >= 10) {
          hrv = calculateHRV(rrAllRef.current.slice(-60)); // Last 60 RR intervals
        }

        setState((prev) => ({
          ...prev,
          heartRate,
          hrHistory: [...prev.hrHistory.slice(-149), heartRate],
          strain: strainRef.current,
          rrIntervals: rrAllRef.current.slice(-30),
          hrv,
        }));

        // Save to Supabase
        addHRReading(heartRate, rrIntervals, reading.timestamp);
      },

      onBatteryUpdate: (level: number) => {
        setState((prev) => ({ ...prev, battery: level }));
      },

      onConnectionChange: (connected: boolean, deviceName?: string) => {
        setState((prev) => ({
          ...prev,
          isConnected: connected,
          deviceName: deviceName || prev.deviceName,
        }));

        if (connected) {
          // Start session timer
          timerRef.current = setInterval(() => {
            setState((prev) => ({
              ...prev,
              sessionSeconds: prev.sessionSeconds + 1,
            }));
          }, 1000);
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      },

      onLog: (message: string) => {
        setState((prev) => ({
          ...prev,
          logs: [
            `${new Date().toLocaleTimeString('en-US', { hour12: false })} ${message}`,
            ...prev.logs.slice(0, 79),
          ],
        }));
      },
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- Actions ----
  const connect = useCallback(async () => {
    strainRef.current = 0;
    hrAllRef.current = [];
    rrAllRef.current = [];

    setState((prev) => ({
      ...prev,
      strain: 0,
      sessionSeconds: 0,
      hrHistory: [],
      heartRate: 0,
    }));

    const success = await bleManager.connect();

    if (success) {
      // Start Supabase session
      const session = await startSession('activity');
      if (session) sessionRef.current = session.id;
    }

    return success;
  }, []);

  const disconnect = useCallback(async () => {
    // Flush remaining HR data
    await flushHRBuffer();

    // End Supabase session
    if (sessionRef.current && hrAllRef.current.length > 0) {
      const zones = getZoneDurations(hrAllRef.current);
      await endSession(sessionRef.current, {
        avgHR: Math.round(hrAllRef.current.reduce((a, b) => a + b, 0) / hrAllRef.current.length),
        maxHR: Math.max(...hrAllRef.current),
        minHR: Math.min(...hrAllRef.current),
        strain: strainRef.current,
        calories: Math.round(strainRef.current * 45),
        zoneDurations: zones,
      });
      sessionRef.current = null;
    }

    await bleManager.disconnect();
  }, []);

  const sendHaptics = useCallback(async () => {
    return bleManager.sendHaptics();
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendHaptics,
  };
}
