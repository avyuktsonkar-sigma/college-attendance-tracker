-- ====================================================================
-- COLLEGE ATTENDANCE TRACKER - DATABASE RELATIONAL SCHEMA
-- Database Engine: PostgreSQL 14+ / Supabase / Neon
-- ====================================================================

-- 1. Enable UUID Extension (Optional for enterprise ID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SUBJECTS TABLE (Stores Course Metadata)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    target_percentage INT NOT NULL DEFAULT 75,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Target must be between 1% and 100%
    CONSTRAINT chk_target_percentage CHECK (target_percentage >= 1 AND target_percentage <= 100)
);

-- 3. ATTENDANCE LOGS TABLE (Stores Date-Wise Attendance Entries)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL,
    status VARCHAR(10) NOT NULL,
    marked_date DATE NOT NULL DEFAULT CURRENT_DATE,
    marked_time TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraint (Cascade Delete: If subject is deleted, logs are cleared)
    CONSTRAINT fk_subject 
        FOREIGN KEY (subject_id) 
        REFERENCES subjects(id) 
        ON DELETE CASCADE,

    -- Constraint: Status can strictly be PRESENT or ABSENT
    CONSTRAINT chk_attendance_status 
        CHECK (status IN ('PRESENT', 'ABSENT'))
);

-- 4. PERFORMANCE INDEXES (Optimizes query speeds for large university batches)
CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance_logs(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_date ON attendance_logs(marked_date);

-- ====================================================================
-- 5. RELATIONAL VIEW: Real-time Attendance Aggregates (Analytics)
-- ====================================================================
CREATE OR REPLACE VIEW view_subject_attendance_stats AS
SELECT 
    s.id AS subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    s.target_percentage,
    COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::INT AS attended_lectures,
    COUNT(a.id)::INT AS total_lectures,
    CASE 
        WHEN COUNT(a.id) = 0 THEN 0.0
        ELSE ROUND((COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::DECIMAL / COUNT(a.id)::DECIMAL) * 100, 2)
    END AS current_percentage
FROM subjects s
LEFT JOIN attendance_logs a ON s.id = a.subject_id
GROUP BY s.id, s.name, s.code, s.target_percentage;
