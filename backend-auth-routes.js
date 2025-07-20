// ===================================================================
// AUTHENTICATION ROUTES - PIN-based login system
// For your backend: src/routes/auth.js
// ===================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// ===================================================================
// POST /auth/login - PIN-based authentication
// ===================================================================
router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt received');
  
  const { pin } = req.body;
  const ip_address = getClientIP(req);
  const user_agent = req.headers['user-agent'];
  
  if (!pin) {
    await logAuthAttempt(null, 'failed_login', ip_address, user_agent, false, 'Missing PIN');
    return res.status(400).json({ 
      success: false, 
      message: 'PIN is required' 
    });
  }

  try {
    // Find user by PIN
    const userQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.pin,
        u.role,
        u.department_id,
        u.is_active,
        d.name as department_name,
        r.name as role_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role = r.id
      WHERE u.pin = $1 AND u.is_active = true
    `;
    
    const userResult = await pool.query(userQuery, [pin]);
    
    if (userResult.rows.length === 0) {
      await logAuthAttempt(null, 'failed_login', ip_address, user_agent, false, 'Invalid PIN');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid PIN' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if user has manager or admin role
    if (!['admin', 'manager'].includes(user.role_name)) {
      await logAuthAttempt(user.id, 'failed_login', ip_address, user_agent, false, 'Insufficient permissions');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Manager or Admin role required.' 
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Create session
    const sessionQuery = `
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    await pool.query(sessionQuery, [user.id, sessionToken, expiresAt, ip_address, user_agent]);
    
    // Get manager permissions if user is manager
    let managerDepartments = [];
    let accessibleUsers = [];
    
    if (user.role_name === 'manager') {
      const deptQuery = `SELECT * FROM get_manager_departments($1)`;
      const deptResult = await pool.query(deptQuery, [user.id]);
      managerDepartments = deptResult.rows;
      
      const usersQuery = `SELECT * FROM get_manager_accessible_users($1)`;
      const usersResult = await pool.query(usersQuery, [user.id]);
      accessibleUsers = usersResult.rows;
    }
    
    // Log successful login
    await logAuthAttempt(user.id, 'login', ip_address, user_agent, true);
    
    console.log(`✅ User ${user.full_name} (${user.role_name}) logged in successfully`);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name,
        department_id: user.department_id,
        department_name: user.department_name,
        session_token: sessionToken,
        expires_at: expiresAt,
        manager_departments: managerDepartments,
        accessible_users: accessibleUsers
      }
    });
    
  } catch (err) {
    console.error('❌ Login error:', err);
    await logAuthAttempt(null, 'failed_login', ip_address, user_agent, false, 'System error');
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// ===================================================================
// POST /auth/logout - End user session
// ===================================================================
router.post('/logout', async (req, res) => {
  const { session_token } = req.body;
  const ip_address = getClientIP(req);
  const user_agent = req.headers['user-agent'];
  
  if (!session_token) {
    return res.status(400).json({ 
      success: false, 
      message: 'Session token required' 
    });
  }

  try {
    // Get user info from session
    const sessionQuery = `
      SELECT user_id FROM user_sessions 
      WHERE session_token = $1 AND is_active = true
    `;
    const sessionResult = await pool.query(sessionQuery, [session_token]);
    
    if (sessionResult.rows.length > 0) {
      const userId = sessionResult.rows[0].user_id;
      
      // Deactivate session
      await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
        [session_token]
      );
      
      // Log logout
      await logAuthAttempt(userId, 'logout', ip_address, user_agent, true);
      
      console.log(`👋 User ${userId} logged out`);
    }
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
});

// ===================================================================
// GET /auth/verify - Verify session token
// ===================================================================
router.get('/verify', async (req, res) => {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'No session token provided' 
    });
  }

  try {
    const query = `
      SELECT 
        s.user_id,
        s.expires_at,
        u.full_name,
        u.email,
        u.role,
        u.department_id,
        d.name as department_name,
        r.name as role_name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role = r.id
      WHERE s.session_token = $1 
        AND s.is_active = true 
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.is_active = true
    `;
    
    const result = await pool.query(query, [sessionToken]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired session' 
      });
    }
    
    const user = result.rows[0];
    
    // Update last activity
    await pool.query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1',
      [sessionToken]
    );
    
    // Get manager permissions if needed
    let managerDepartments = [];
    let accessibleUsers = [];
    
    if (user.role_name === 'manager') {
      const deptResult = await pool.query(`SELECT * FROM get_manager_departments($1)`, [user.user_id]);
      managerDepartments = deptResult.rows;
      
      const usersResult = await pool.query(`SELECT * FROM get_manager_accessible_users($1)`, [user.user_id]);
      accessibleUsers = usersResult.rows;
    }
    
    res.json({
      success: true,
      user: {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name,
        department_id: user.department_id,
        department_name: user.department_name,
        expires_at: user.expires_at,
        manager_departments: managerDepartments,
        accessible_users: accessibleUsers
      }
    });
    
  } catch (err) {
    console.error('❌ Session verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Session verification failed' 
    });
  }
});

// ===================================================================
// Helper function to log authentication attempts
// ===================================================================
async function logAuthAttempt(userId, actionType, ipAddress, userAgent, success, failureReason = null) {
  try {
    await pool.query(
      `INSERT INTO auth_audit_log (user_id, action_type, ip_address, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, actionType, ipAddress, userAgent, success, failureReason]
    );
  } catch (err) {
    console.error('Failed to log auth attempt:', err);
  }
}

// ===================================================================
// Admin route: GET /auth/sessions - View active sessions (Admin only)
// ===================================================================
router.get('/sessions', async (req, res) => {
  // This would need the auth middleware to check if user is admin
  try {
    const query = `
      SELECT 
        s.id,
        s.user_id,
        u.full_name,
        r.name as role_name,
        s.created_at,
        s.last_activity,
        s.expires_at,
        s.ip_address,
        s.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      JOIN roles r ON u.role = r.id
      WHERE s.is_active = true
      ORDER BY s.last_activity DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      sessions: result.rows
    });
    
  } catch (err) {
    console.error('❌ Error fetching sessions:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch sessions' 
    });
  }
});

module.exports = router; 