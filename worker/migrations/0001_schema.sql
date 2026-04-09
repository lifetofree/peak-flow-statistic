-- D1 Database Schema for PeakFlowStat
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    short_token TEXT UNIQUE NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    click_count INTEGER DEFAULT 0,
    personal_best INTEGER,
    admin_note TEXT,
    deleted_at TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    peak_flow_readings TEXT,
    peak_flow INTEGER NOT NULL,
    spo2 INTEGER,
    medication_timing TEXT,
    period TEXT,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_model TEXT NOT NULL,
    action TEXT NOT NULL,
    diff TEXT,
    timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_short_token ON users(short_token);
CREATE INDEX IF NOT EXISTS idx_users_short_code ON users(short_code);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
