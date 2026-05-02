-- ============================================================
-- WHOOP Clone - Supabase Database Schema
-- ============================================================
-- Run this in Supabase SQL Editor to create all tables

-- 1. Heart Rate readings (main data - collected every second)
CREATE TABLE IF NOT EXISTS hr_readings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  heart_rate SMALLINT NOT NULL CHECK (heart_rate BETWEEN 30 AND 250),
  rr_intervals REAL[], -- RR intervals in ms (for HRV calculation)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast time-range queries
CREATE INDEX idx_hr_readings_user_time ON hr_readings(user_id, recorded_at DESC);
CREATE INDEX idx_hr_readings_recorded ON hr_readings(recorded_at DESC);

-- 2. Sessions (workout/activity tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  avg_hr REAL,
  max_hr SMALLINT,
  min_hr SMALLINT,
  strain REAL DEFAULT 0,
  calories_active INTEGER,
  calories_total INTEGER,
  zone_durations JSONB, -- {"zone1": sec, "zone2": sec, ...}
  session_type TEXT DEFAULT 'activity', -- 'activity', 'sleep', 'rest'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_time ON sessions(user_id, started_at DESC);

-- 3. Daily summaries (recovery, strain, sleep)
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Recovery
  recovery_score SMALLINT CHECK (recovery_score BETWEEN 0 AND 100),
  hrv_rmssd REAL, -- HRV in ms
  resting_hr SMALLINT,
  spo2 REAL,
  skin_temp REAL,
  respiratory_rate REAL,
  -- Strain
  day_strain REAL DEFAULT 0,
  calories_active INTEGER DEFAULT 0,
  calories_total INTEGER DEFAULT 0,
  -- Sleep
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  sleep_duration_sec INTEGER,
  sleep_efficiency SMALLINT,
  sleep_rem_sec INTEGER,
  sleep_deep_sec INTEGER,
  sleep_light_sec INTEGER,
  sleep_awake_sec INTEGER,
  sleep_disturbances SMALLINT,
  sleep_need_sec INTEGER,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_user_date ON daily_summaries(user_id, date DESC);

-- 4. Device info
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  device_name TEXT,
  device_id TEXT, -- BLE device identifier
  firmware_version TEXT,
  last_connected_at TIMESTAMPTZ,
  last_battery_level SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  max_hr SMALLINT DEFAULT 200,
  resting_hr_baseline SMALLINT DEFAULT 60,
  hrv_baseline REAL DEFAULT 50,
  weight_kg REAL,
  height_cm REAL,
  birth_date DATE,
  units TEXT DEFAULT 'metric', -- 'metric' or 'imperial'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies (Row Level Security)
-- ============================================================
ALTER TABLE hr_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users read own hr_readings" ON hr_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hr_readings" ON hr_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own daily_summaries" ON daily_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own daily_summaries" ON daily_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own daily_summaries" ON daily_summaries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own devices" ON devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own devices" ON devices FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Functions
-- ============================================================

-- Batch insert HR readings (more efficient than one by one)
CREATE OR REPLACE FUNCTION insert_hr_batch(
  readings JSONB -- [{"hr": 72, "rr": [800, 810], "ts": "2024-01-01T00:00:00Z"}, ...]
)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER := 0;
  reading JSONB;
BEGIN
  FOR reading IN SELECT * FROM jsonb_array_elements(readings)
  LOOP
    INSERT INTO hr_readings (user_id, heart_rate, rr_intervals, recorded_at)
    VALUES (
      auth.uid(),
      (reading->>'hr')::SMALLINT,
      ARRAY(SELECT jsonb_array_elements_text(reading->'rr'))::REAL[],
      (reading->>'ts')::TIMESTAMPTZ
    );
    count := count + 1;
  END LOOP;
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate daily strain from HR readings
CREATE OR REPLACE FUNCTION calc_day_strain(target_date DATE DEFAULT CURRENT_DATE)
RETURNS REAL AS $$
DECLARE
  s REAL := 0;
  r RECORD;
  max_hr SMALLINT;
BEGIN
  SELECT COALESCE(up.max_hr, 200) INTO max_hr
  FROM user_preferences up WHERE up.user_id = auth.uid();

  FOR r IN
    SELECT heart_rate FROM hr_readings
    WHERE user_id = auth.uid()
      AND recorded_at::DATE = target_date
    ORDER BY recorded_at
  LOOP
    s := s + GREATEST(0, (r.heart_rate - 80.0) / (max_hr - 80.0)) * 0.015;
  END LOOP;

  RETURN LEAST(21, ROUND(s::NUMERIC * 10, 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get HR stats for a time range
CREATE OR REPLACE FUNCTION get_hr_stats(
  from_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 hour',
  to_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(avg_hr REAL, min_hr SMALLINT, max_hr SMALLINT, reading_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(heart_rate)::REAL,
    MIN(heart_rate)::SMALLINT,
    MAX(heart_rate)::SMALLINT,
    COUNT(*)
  FROM hr_readings
  WHERE user_id = auth.uid()
    AND recorded_at BETWEEN from_time AND to_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
