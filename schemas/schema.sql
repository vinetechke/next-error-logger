-- @vinetech/next-error-logger - SQL Schema
-- Choose the appropriate schema for your database

-- ============================================
-- PostgreSQL
-- ============================================
CREATE TABLE error_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  path TEXT,
  method TEXT,
  user_agent TEXT,
  ip TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);

-- ============================================
-- MySQL
-- ============================================
/*
CREATE TABLE error_logs (
  id VARCHAR(36) PRIMARY KEY,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  path VARCHAR(500),
  method VARCHAR(10),
  user_agent TEXT,
  ip VARCHAR(45),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
*/

-- ============================================
-- SQLite
-- ============================================
/*
CREATE TABLE error_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  path TEXT,
  method TEXT,
  user_agent TEXT,
  ip TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
*/
