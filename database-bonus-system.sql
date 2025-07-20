-- ===================================================================
-- BONUS SYSTEM DATABASE SCHEMA
-- Professional bonus management with full audit trail
-- ===================================================================

-- Main bonuses table
CREATE TABLE user_bonuses (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  week_start_date DATE NOT NULL,
  bonus_date DATE NOT NULL, -- Which specific day of the week
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0 AND amount <= 200), -- Max €200
  description TEXT NOT NULL CHECK (length(description) >= 10), -- Minimum description length
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Admin tracking
  added_by TEXT NOT NULL REFERENCES users(id), -- Admin who added
  approved_by TEXT REFERENCES users(id), -- Admin who approved/rejected
  approved_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT valid_bonus_date CHECK (bonus_date >= week_start_date AND bonus_date <= week_start_date + INTERVAL '6 days'),
  CONSTRAINT no_duplicate_bonus_per_day UNIQUE (user_id, bonus_date, week_start_date)
);

-- Audit trail table - tracks ALL changes
CREATE TABLE user_bonus_audit (
  id SERIAL PRIMARY KEY,
  bonus_id INTEGER NOT NULL REFERENCES user_bonuses(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('created', 'updated', 'approved', 'rejected', 'deleted')),
  changed_by TEXT NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Old values (before change)
  old_amount DECIMAL(10,2),
  old_description TEXT,
  old_status VARCHAR(20),
  old_bonus_date DATE,
  
  -- New values (after change)
  new_amount DECIMAL(10,2),
  new_description TEXT,
  new_status VARCHAR(20),
  new_bonus_date DATE,
  
  -- Additional context
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_user_bonuses_user_id ON user_bonuses(user_id);
CREATE INDEX idx_user_bonuses_week_start ON user_bonuses(week_start_date);
CREATE INDEX idx_user_bonuses_status ON user_bonuses(status);
CREATE INDEX idx_user_bonuses_active ON user_bonuses(is_active);
CREATE INDEX idx_bonus_audit_bonus_id ON user_bonus_audit(bonus_id);
CREATE INDEX idx_bonus_audit_changed_by ON user_bonus_audit(changed_by);
CREATE INDEX idx_bonus_audit_changed_at ON user_bonus_audit(changed_at);

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_bonus_updated_at
    BEFORE UPDATE ON user_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION update_bonus_updated_at();

-- Audit trigger function - automatically creates audit records
CREATE OR REPLACE FUNCTION create_bonus_audit_record()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_bonus_audit (
            bonus_id, action_type, changed_by,
            new_amount, new_description, new_status, new_bonus_date
        ) VALUES (
            NEW.id, 'created', NEW.added_by,
            NEW.amount, NEW.description, NEW.status, NEW.bonus_date
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO user_bonus_audit (
            bonus_id, action_type, changed_by,
            old_amount, old_description, old_status, old_bonus_date,
            new_amount, new_description, new_status, new_bonus_date
        ) VALUES (
            NEW.id, 'updated', NEW.added_by, -- Note: You'll need to pass the current admin user
            OLD.amount, OLD.description, OLD.status, OLD.bonus_date,
            NEW.amount, NEW.description, NEW.status, NEW.bonus_date
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_bonus_audit (
            bonus_id, action_type, changed_by,
            old_amount, old_description, old_status, old_bonus_date
        ) VALUES (
            OLD.id, 'deleted', OLD.added_by, -- Note: You'll need to pass the current admin user
            OLD.amount, OLD.description, OLD.status, OLD.bonus_date
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers
CREATE TRIGGER trigger_bonus_audit_insert
    AFTER INSERT ON user_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION create_bonus_audit_record();

CREATE TRIGGER trigger_bonus_audit_update
    AFTER UPDATE ON user_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION create_bonus_audit_record();

CREATE TRIGGER trigger_bonus_audit_delete
    AFTER DELETE ON user_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION create_bonus_audit_record();

-- ===================================================================
-- SAMPLE DATA FOR TESTING
-- ===================================================================

-- Insert some sample bonuses (you'll need real user IDs from your system)
-- INSERT INTO user_bonuses (user_id, week_start_date, bonus_date, amount, description, added_by) 
-- VALUES 
-- ('50.00.01.0001', '2025-01-13', '2025-01-15', 50.00, 'Excellent performance on Project Alpha', 'admin_user_id'),
-- ('50.00.01.0002', '2025-01-13', '2025-01-17', 75.00, 'Overtime compensation for weekend work', 'admin_user_id');

-- ===================================================================
-- USEFUL QUERIES FOR BONUS MANAGEMENT
-- ===================================================================

-- Get all bonuses for a specific week with user details
-- SELECT 
--     ub.id,
--     u.full_name,
--     ub.bonus_date,
--     ub.amount,
--     ub.description,
--     ub.status,
--     admin.full_name as added_by_name,
--     ub.created_at
-- FROM user_bonuses ub
-- JOIN users u ON ub.user_id = u.id
-- JOIN users admin ON ub.added_by = admin.id
-- WHERE ub.week_start_date = '2025-01-13'
-- AND ub.is_active = true
-- ORDER BY ub.bonus_date, u.full_name;

-- Get audit trail for a specific bonus
-- SELECT 
--     uba.action_type,
--     u.full_name as changed_by_name,
--     uba.changed_at,
--     uba.old_amount,
--     uba.new_amount,
--     uba.old_description,
--     uba.new_description,
--     uba.old_status,
--     uba.new_status
-- FROM user_bonus_audit uba
-- JOIN users u ON uba.changed_by = u.id
-- WHERE uba.bonus_id = 1
-- ORDER BY uba.changed_at DESC;

-- Calculate total approved bonuses for a user in a week
-- SELECT 
--     user_id,
--     SUM(amount) as total_approved_bonuses
-- FROM user_bonuses 
-- WHERE user_id = '50.00.01.0001' 
-- AND week_start_date = '2025-01-13'
-- AND status = 'approved'
-- AND is_active = true
-- GROUP BY user_id; 