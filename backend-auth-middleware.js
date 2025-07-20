// ===================================================================
// AUTHENTICATION & PERMISSION MIDDLEWARE
// For your backend: src/middleware/auth.js
// ===================================================================

const pool = require('../db');

// ===================================================================
// Authentication Middleware - Verify session token
// ===================================================================
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || req.headers['x-session-token'];
    
    if (!sessionToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Verify session token
    const query = `
      SELECT 
        s.user_id,
        s.expires_at,
        u.full_name,
        u.email,
        u.role,
        u.department_id,
        u.is_active,
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
    
    // Attach user info to request
    req.currentUser = {
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role_name,
      department_id: user.department_id,
      department_name: user.department_name,
      session_token: sessionToken
    };
    
    next();
    
  } catch (err) {
    console.error('❌ Authentication middleware error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// ===================================================================
// Role-Based Permission Middleware
// ===================================================================
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(req.currentUser.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
};

// ===================================================================
// Manager Permission Middleware - Check if manager can access specific user
// ===================================================================
const requireManagerAccess = async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Admins have access to everything
    if (req.currentUser.role === 'admin') {
      return next();
    }
    
    // For managers, check department permissions
    if (req.currentUser.role === 'manager') {
      const targetUserId = req.params.user_id || req.body.user_id || req.query.user_id;
      
      if (!targetUserId) {
        // If no specific user is targeted, this might be a general query
        // We'll handle filtering in the route itself
        return next();
      }
      
      // Check if manager can access this user
      const canAccess = await pool.query(
        'SELECT can_manager_access_user($1, $2) as has_access',
        [req.currentUser.id, targetUserId]
      );
      
      if (!canAccess.rows[0].has_access) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only manage users in your assigned departments.' 
        });
      }
      
      return next();
    }
    
    // Other roles not allowed
    return res.status(403).json({ 
      success: false, 
      message: 'Manager or Admin role required' 
    });
    
  } catch (err) {
    console.error('❌ Manager access middleware error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Permission check failed' 
    });
  }
};

// ===================================================================
// Helper function to filter users based on manager permissions
// ===================================================================
const getAccessibleUsers = async (currentUser) => {
  try {
    if (currentUser.role === 'admin') {
      // Admins see all users
      const query = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.department_id,
          d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.is_active = true
        ORDER BY d.name, u.full_name
      `;
      const result = await pool.query(query);
      return result.rows;
    } 
    else if (currentUser.role === 'manager') {
      // Managers see only their department users
      const result = await pool.query(
        'SELECT * FROM get_manager_accessible_users($1)',
        [currentUser.id]
      );
      return result.rows;
    }
    
    return [];
  } catch (err) {
    console.error('❌ Error getting accessible users:', err);
    return [];
  }
};

// ===================================================================
// Helper function to filter time entries based on permissions
// ===================================================================
const filterTimeEntriesByPermissions = async (currentUser, timeEntries) => {
  try {
    if (currentUser.role === 'admin') {
      // Admins see all entries
      return timeEntries;
    }
    
    if (currentUser.role === 'manager') {
      // Get list of users this manager can access
      const accessibleUsers = await getAccessibleUsers(currentUser);
      const accessibleUserIds = accessibleUsers.map(user => user.user_id || user.id);
      
      // Filter entries to only include accessible users
      return timeEntries.filter(entry => 
        accessibleUserIds.includes(entry.user_id)
      );
    }
    
    return [];
  } catch (err) {
    console.error('❌ Error filtering time entries:', err);
    return [];
  }
};

// ===================================================================
// Updated bonus permission middleware
// ===================================================================
const requireBonusAccess = async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Both admin and manager can manage bonuses
    if (!['admin', 'manager'].includes(req.currentUser.role)) {
      return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    
    // For specific bonus operations, check if manager can access the user
    if (req.currentUser.role === 'manager') {
      const bonusId = req.params.id;
      const userId = req.body.user_id;
      
      // If editing existing bonus, check access to that bonus user
      if (bonusId && !userId) {
        const bonusQuery = await pool.query(
          'SELECT user_id FROM user_bonuses WHERE id = $1',
          [bonusId]
        );
        
        if (bonusQuery.rows.length > 0) {
          const bonusUserId = bonusQuery.rows[0].user_id;
          const canAccess = await pool.query(
            'SELECT can_manager_access_user($1, $2) as has_access',
            [req.currentUser.id, bonusUserId]
          );
          
          if (!canAccess.rows[0].has_access) {
            return res.status(403).json({ 
              error: 'Access denied. You can only manage bonuses for users in your departments.' 
            });
          }
        }
      }
      
      // If creating new bonus, check access to target user
      if (userId) {
        const canAccess = await pool.query(
          'SELECT can_manager_access_user($1, $2) as has_access',
          [req.currentUser.id, userId]
        );
        
        if (!canAccess.rows[0].has_access) {
          return res.status(403).json({ 
            error: 'Access denied. You can only create bonuses for users in your departments.' 
          });
        }
      }
    }
    
    // Set current user ID for audit trail
    req.currentUserId = req.currentUser.id;
    next();
    
  } catch (err) {
    console.error('❌ Bonus access middleware error:', err);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

module.exports = {
  authenticateUser,
  requireRole,
  requireManagerAccess,
  requireBonusAccess,
  getAccessibleUsers,
  filterTimeEntriesByPermissions
}; 