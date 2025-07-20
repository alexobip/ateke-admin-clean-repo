-- ✅ VERIFIED Database Schema for Payroll Report
-- This schema has been verified against your existing frontend code and matches
-- the actual table structure and field names used in your Azure database

-- Users table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE users (
    id TEXT PRIMARY KEY,                  -- ✅ REAL: TEXT with auto-sequence
    full_name CHARACTER VARYING NOT NULL, -- ✅ REAL: CHARACTER VARYING
    email CHARACTER VARYING NOT NULL,     -- ✅ REAL: CHARACTER VARYING, NOT NULL
    pin TEXT NOT NULL,                    -- ✅ REAL: TEXT, NOT NULL
    user_type_id INTEGER,                 -- ✅ VERIFIED: Links to user_type.id
    department_id INTEGER,                -- ✅ VERIFIED: Links to departments.id
    group_id INTEGER,                     -- ✅ VERIFIED: Links to groups.id
    role INTEGER,                         -- ✅ VERIFIED: Used in frontend
    is_active BOOLEAN DEFAULT true,       -- ✅ VERIFIED: Used in frontend
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- ✅ VERIFIED
);

-- User types table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE user_type (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,                  -- ✅ REAL: TEXT not VARCHAR
    description TEXT,                     -- ✅ REAL: Additional field
    is_active BOOLEAN DEFAULT true       -- ✅ VERIFIED
);

-- Departments table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                   -- ✅ REAL: TEXT not VARCHAR
    code TEXT,                            -- ✅ REAL: Additional field
    description TEXT,                     -- ✅ REAL: Additional field
    created_at TIMESTAMP DEFAULT now(),   -- ✅ REAL: Additional field
    is_active BOOLEAN DEFAULT true       -- ✅ VERIFIED
);

-- User salary settings table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE user_salary_settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id),    -- ✅ REAL: TEXT not VARCHAR(50)
    effective_from DATE NOT NULL,         -- ✅ VERIFIED: Used for salary history
    salary_mon INTEGER,                   -- ✅ REAL: INTEGER (cents/whole euros)
    salary_tue INTEGER,                   -- ✅ REAL: INTEGER
    salary_wed INTEGER,                   -- ✅ REAL: INTEGER  
    salary_thu INTEGER,                   -- ✅ REAL: INTEGER
    salary_fri INTEGER,                   -- ✅ REAL: INTEGER
    salary_sat INTEGER,                   -- ✅ REAL: INTEGER
    salary_sun INTEGER,                   -- ✅ REAL: INTEGER
    overtime_mon INTEGER,                 -- ✅ REAL: INTEGER (cents/whole euros)
    overtime_tue INTEGER,                 -- ✅ REAL: INTEGER
    overtime_wed INTEGER,                 -- ✅ REAL: INTEGER
    overtime_thu INTEGER,                 -- ✅ REAL: INTEGER
    overtime_fri INTEGER,                 -- ✅ REAL: INTEGER
    overtime_sat INTEGER,                 -- ✅ REAL: INTEGER
    overtime_sun INTEGER,                 -- ✅ REAL: INTEGER
    norm_daily_hours NUMERIC,             -- ✅ REAL: NUMERIC (PostgreSQL decimal)
    away_work INTEGER,                    -- ✅ REAL: INTEGER
    is_driver BOOLEAN DEFAULT false,      -- ✅ VERIFIED
    has_monthly_salary BOOLEAN DEFAULT false,  -- ✅ VERIFIED
    monthly_salary INTEGER,               -- ✅ REAL: INTEGER
    monthly_periods INTEGER,              -- ✅ VERIFIED
    days_per_week INTEGER DEFAULT 5,      -- ✅ VERIFIED: Used in payroll calculations
    created_at TIMESTAMP DEFAULT now()   -- ✅ REAL: now() not CURRENT_TIMESTAMP
);

-- Time entries table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- ✅ REAL: TEXT, NOT NULL
    project_id INTEGER NOT NULL,          -- ✅ REAL: INTEGER, NOT NULL
    clock_in_time TIMESTAMP,              -- ✅ REAL: TIMESTAMP (nullable)
    clock_out_time TIMESTAMP,             -- ✅ REAL: TIMESTAMP (nullable)
    is_active BOOLEAN DEFAULT false,      -- ✅ REAL: Additional field
    duration_text TEXT,                   -- ✅ REAL: Additional field
    kiosk_id INTEGER,                     -- ✅ REAL: Additional field
    work_type_id INTEGER DEFAULT 1,       -- ✅ REAL: Additional field
    status TEXT DEFAULT 'pending'         -- ✅ REAL: TEXT not VARCHAR
);

-- Projects table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,               -- ✅ REAL: INTEGER not SERIAL
    title CHARACTER VARYING NOT NULL,     -- ✅ REAL: CHARACTER VARYING
    code CHARACTER VARYING NOT NULL,      -- ✅ REAL: NOT NULL
    is_active BOOLEAN DEFAULT true,       -- ✅ VERIFIED
    created_at TIMESTAMP DEFAULT now()    -- ✅ REAL: now() not CURRENT_TIMESTAMP
);

-- Groups table (✅ VERIFIED with real Azure PostgreSQL schema)
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name CHARACTER VARYING NOT NULL,      -- ✅ REAL: CHARACTER VARYING
    description TEXT,                     -- ✅ REAL: Additional field
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- ✅ VERIFIED
);

-- ✅ Sample data for testing (Greek content as used in your system)
INSERT INTO user_type (id, title) VALUES 
(1, 'Εργατοτεχνίτης'),
(2, 'Υπάλληλος'),
(3, 'Ειδικευμένος');

INSERT INTO departments (id, name) VALUES 
(1, 'Παραγωγή'),
(2, 'Διοίκηση'),
(3, 'Συντήρηση');

-- ✅ BACKEND QUERY NOTES:
-- 1. My payroll route queries exactly these table/field names
-- 2. Field mappings match your frontend expectations:
--    - users.user_type_id → user_type.id → user_type.title (as user_type_title)
--    - users.department_id → departments.id → departments.name (as department_name)
--    - time_entries.clock_in_time/clock_out_time → used for hour calculations
--    - user_salary_settings effective dates → used for salary history 