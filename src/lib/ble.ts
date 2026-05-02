// src/lib/ble.ts
// BLE Connection Manager for WHOOP band
// Handles connection, reconnection, background mode, and data parsing

import { BleManager, Device, Characteristic, BleError } from 'react-native-ble-plx';
import { Platform } from 'react-native';

// ============================================================
// WHOOP BLE Constants
// ============================================================
const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_CHARACTERISTIC_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
const WHOOP_SERVICE_UUID = '61080001-8d6d-82b8-614a-1c8cb0f8dcc6';
const CMD_TO_STRAP_UUID = '61080002-8d6d-82b8-614a-1c8cb0f8dcc6';

// ============================================================
// Types
// ============================================================
export interface HRReading {
  heartRate: number;
  rrIntervals: number[]; // in ms
  timestamp: Date;
}

export interface BLECallbacks {
  onHRUpdate: (reading: HRReading) => void;
  onBatteryUpdate: (level: number) => void;
  onConnectionChange: (connected: boolean, deviceName?: string) => void;
  onLog: (message: string) => void;
}

// ============================================================
// BLE Manager Singleton
// ============================================================
class WhoopBLEManager {
  private manager: BleManager;
  private device: Device | null = null;
  private callbacks: BLECallbacks | null = null;
  private isScanning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private _isConnected = false;

  constructor() {
    // restoreStateIdentifier enables iOS background restoration
    this.manager = new BleManager({
      restoreStateIdentifier: 'whoop-plus-ble',
      restoreStateFunction: (restoredState) => {
        if (restoredState) {
          // iOS restored our BLE state after app was killed
          const devices = restoredState.connectedPeripherals;
          if (devices.length > 0) {
            this.log('iOS restored BLE connection');
            this.device = devices[0];
            this._isConnected = true;
            this.callbacks?.onConnectionChange(true, this.device.name || 'WHOOP');
            this.subscribeToHR();
          }
        }
      },
    });
  }

  get isConnected() {
    return this._isConnected;
  }

  setCallbacks(callbacks: BLECallbacks) {
    this.callbacks = callbacks;
  }

  private log(msg: string) {
    console.log(`[BLE] ${msg}`);
    this.callbacks?.onLog(msg);
  }

  // ---- Scan & Connect ----
  async connect(): Promise<boolean> {
    const state = await this.manager.state();
    if (state !== 'PoweredOn') {
      this.log('Bluetooth is not enabled');
      return false;
    }

    this.log('Scanning for WHOOP...');
    this.isScanning = true;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        this.isScanning = false;
        this.log('Scan timeout - no device found');
        resolve(false);
      }, 15000);

      this.manager.startDeviceScan(
        [HR_SERVICE_UUID], // Scan for devices with HR service
        { allowDuplicates: false },
        async (error: BleError | null, scannedDevice: Device | null) => {
          if (error) {
            this.log(`Scan error: ${error.message}`);
            clearTimeout(timeout);
            this.isScanning = false;
            resolve(false);
            return;
          }

          if (!scannedDevice) return;

          // Accept WHOOP or any HR broadcasting device
          const name = scannedDevice.name || scannedDevice.localName || '';
          this.log(`Found: ${name || scannedDevice.id}`);

          // Stop scanning
          this.manager.stopDeviceScan();
          this.isScanning = false;
          clearTimeout(timeout);

          try {
            // Connect
            this.log('Connecting...');
            const connected = await scannedDevice.connect({
              autoConnect: true, // Auto-reconnect on iOS
              requestMTU: 512,
            });

            // Discover services
            this.log('Discovering services...');
            this.device = await connected.discoverAllServicesAndCharacteristics();
            this._isConnected = true;

            this.log(`Connected to ${this.device.name || 'WHOOP'}`);
            this.callbacks?.onConnectionChange(true, this.device.name || 'WHOOP');

            // Setup disconnect listener
            this.manager.onDeviceDisconnected(this.device.id, (err, dev) => {
              this._isConnected = false;
              this.log('Disconnected');
              this.callbacks?.onConnectionChange(false);
              this.scheduleReconnect();
            });

            // Subscribe to data
            await this.subscribeToHR();
            await this.readBattery();

            resolve(true);
          } catch (e: any) {
            this.log(`Connect failed: ${e.message}`);
            resolve(false);
          }
        }
      );
    });
  }

  // ---- Subscribe to Heart Rate ----
  private async subscribeToHR() {
    if (!this.device) return;

    try {
      this.device.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_CHARACTERISTIC_UUID,
        (error: BleError | null, characteristic: Characteristic | null) => {
          if (error) {
            this.log(`HR monitor error: ${error.message}`);
            return;
          }
          if (!characteristic?.value) return;

          const reading = this.parseHRData(characteristic.value);
          if (reading && reading.heartRate >= 35 && reading.heartRate <= 220) {
            this.callbacks?.onHRUpdate(reading);
          }
        },
        'hr-monitor' // Transaction ID for iOS background
      );
      this.log('HR monitoring started');
    } catch (e: any) {
      this.log(`HR subscribe error: ${e.message}`);
    }
  }

  // ---- Parse HR BLE Data ----
  private parseHRData(base64Value: string): HRReading | null {
    try {
      const raw = Buffer.from(base64Value, 'base64');
      const flags = raw[0];

      let heartRate: number;
      let offset: number;

      // Bit 0: HR format (0 = UINT8, 1 = UINT16)
      if (flags & 0x01) {
        heartRate = raw[1] | (raw[2] << 8);
        offset = 3;
      } else {
        heartRate = raw[1];
        offset = 2;
      }

      // Bit 3: Energy Expended present
      if (flags & 0x08) {
        offset += 2;
      }

      // Bit 4: RR-Intervals present
      const rrIntervals: number[] = [];
      if (flags & 0x10) {
        while (offset + 1 < raw.length) {
          const rr = raw[offset] | (raw[offset + 1] << 8);
          rrIntervals.push((rr / 1024.0) * 1000); // Convert to ms
          offset += 2;
        }
      }

      return {
        heartRate,
        rrIntervals,
        timestamp: new Date(),
      };
    } catch (e) {
      return null;
    }
  }

  // ---- Battery ----
  private async readBattery() {
    if (!this.device) return;

    try {
      const char = await this.device.readCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_CHARACTERISTIC_UUID
      );
      if (char?.value) {
        const raw = Buffer.from(char.value, 'base64');
        const level = raw[0];
        this.callbacks?.onBatteryUpdate(level);
        this.log(`Battery: ${level}%`);
      }

      // Monitor battery changes
      this.device.monitorCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          const raw = Buffer.from(characteristic.value, 'base64');
          this.callbacks?.onBatteryUpdate(raw[0]);
        },
        'battery-monitor'
      );
    } catch (e: any) {
      this.log(`Battery read failed: ${e.message}`);
    }
  }

  // ---- Haptics ----
  async sendHaptics(): Promise<boolean> {
    if (!this.device) return false;
    try {
      const cmd = Buffer.from([
        0xaa, 0x08, 0x00, 0xa8, 0x23, 0x8c, 0x03, 0x01, 0x7d, 0x5e, 0xc6, 0x27,
      ]);
      await this.device.writeCharacteristicWithResponseForService(
        WHOOP_SERVICE_UUID,
        CMD_TO_STRAP_UUID,
        cmd.toString('base64')
      );
      this.log('Haptics sent!');
      return true;
    } catch (e: any) {
      this.log(`Haptics failed: ${e.message}`);
      return false;
    }
  }

  // ---- Auto Reconnect ----
  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      this.log('Attempting reconnect...');
      const success = await this.connect();
      if (!success) {
        this.scheduleReconnect(); // Try again
      }
    }, 5000); // Retry every 5 seconds
  }

  // ---- Disconnect ----
  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch (e) {}
      this.device = null;
    }
    this._isConnected = false;
    this.callbacks?.onConnectionChange(false);
    this.log('Disconnected');
  }

  // ---- Cleanup ----
  destroy() {
    this.disconnect();
    this.manager.destroy();
  }
}

// Export singleton
export const bleManager = new WhoopBLEManager();
