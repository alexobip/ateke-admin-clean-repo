-- ===================================================================
-- MANAGER ACCESS CONTROL SYSTEM SCHEMA
-- Role-based permissions with department-level access control
-- ===================================================================

-- Manager-Department relationship table (Many-to-Many)
CREATE TABLE manager_departments (
  id SERIAL PRIMARY KEY,
  manager_id TEXT NOT NULL REFERENCES users(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Prevent duplicate assignments
  CONSTRAINT unique_manager_department UNIQUE (manager_id, department_id)
);

-- User sessions table for authentication
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Authentication audit log
CREATE TABLE auth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'failed_login', 'session_expired'
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_manager_departments_manager_id ON manager_departments(manager_id);
CREATE INDEX idx_manager_departments_department_id ON manager_departments(department_id);
CREATE INDEX idx_manager_departments_active ON manager_departments(is_active);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- PERMISSION HELPER FUNCTIONS
-- ===================================================================

-- Function to check if a manager can access a specific user
CREATE OR REPLACE FUNCTION can_manager_access_user(
  manager_user_id TEXT,
  target_user_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  target_department_id INTEGER;
  has_access BOOLEAN := false;
BEGIN
  -- Get the target user's department
  SELECT department_id INTO target_department_id
  FROM users 
  WHERE id = target_user_id AND is_active = true;
  
  -- If target user not found or no department, deny access
  IF target_department_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if manager has access to this department
  SELECT EXISTS(
    SELECT 1 
    FROM manager_departments md
    WHERE md.manager_id = manager_user_id 
      AND md.department_id = target_department_id
      AND md.is_active = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Function to get all users a manager can access
CREATE OR REPLACE FUNCTION get_manager_accessible_users(manager_user_id TEXT)
RETURNS TABLE(
  user_id TEXT,
  full_name TEXT,
  email TEXT,
  department_id INTEGER,
  department_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    u.department_id,
    d.name as department_name
  FROM users u
  JOIN departments d ON u.department_id = d.id
  WHERE u.department_id IN (
    SELECT md.department_id 
    FROM manager_departments md 
    WHERE md.manager_id = manager_user_id 
      AND md.is_active = true
  )
  AND u.is_active = true
  ORDER BY d.name, u.full_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get all departments a manager controls
CREATE OR REPLACE FUNCTION get_manager_departments(manager_user_id TEXT)
RETURNS TABLE(
  department_id INTEGER,
  department_name TEXT,
  assigned_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    md.created_at
  FROM manager_departments md
  JOIN departments d ON md.department_id = d.id
  WHERE md.manager_id = manager_user_id 
    AND md.is_active = true
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SAMPLE DATA INSERTION QUERIES
-- ===================================================================

-- Example: Assign managers to departments
-- (Replace with actual user IDs and department IDs from your system)

-- INSERT INTO manager_departments (manager_id, department_id, created_by) VALUES
-- ('50.00.13.1001', 1, '50.00.13.1000'),  -- Manager 1 → IT Department
-- ('50.00.13.1001', 2, '50.00.13.1000'),  -- Manager 1 → HR Department  
-- ('50.00.13.1002', 2, '50.00.13.1000'),  -- Manager 2 → HR Department
-- ('50.00.13.1002', 3, '50.00.13.1000');  -- Manager 2 → Finance Department

-- ===================================================================
-- USEFUL QUERIES FOR TESTING
-- ===================================================================

-- Check manager permissions
-- SELECT * FROM get_manager_accessible_users('50.00.13.1001');

-- Check if manager can access specific user
-- SELECT can_manager_access_user('50.00.13.1001', '50.00.13.1012');

-- Get all departments for a manager
-- SELECT * FROM get_manager_departments('50.00.13.1001');

-- View all manager-department assignments
-- SELECT 
--   u.full_name as manager_name,
--   d.name as department_name,
--   md.created_at,
--   md.is_active
-- FROM manager_departments md
-- JOIN users u ON md.manager_id = u.id
-- JOIN departments d ON md.department_id = d.id
-- ORDER BY u.full_name, d.name; 