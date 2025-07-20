const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  const userRole = req.headers['x-user-role']; // Adjust based on your auth system
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  req.currentUserId = userId;
  next();
};

// GET /bonuses/week/:week_start - Get all bonuses for a specific week
router.get('/week/:week_start', requireAdmin, async (req, res) => {
  try {
    const { week_start } = req.params;
    
    console.log(`📊 Fetching bonuses for week: ${week_start}`);
    
    const query = `
      SELECT 
        ub.id,
        ub.user_id,
        u.full_name as user_name,
        ub.bonus_date,
        ub.amount,
        ub.description,
        ub.status,
        admin.full_name as added_by_name,
        approver.full_name as approved_by_name,
        ub.created_at,
        ub.approved_at,
        ub.updated_at
      FROM user_bonuses ub
      JOIN users u ON ub.user_id = u.id
      JOIN users admin ON ub.added_by = admin.id
      LEFT JOIN users approver ON ub.approved_by = approver.id
      WHERE ub.week_start_date = $1
      AND ub.is_active = true
      ORDER BY ub.bonus_date, u.full_name
    `;
    
    const result = await pool.query(query, [week_start]);
    
    console.log(`✅ Found ${result.rows.length} bonuses for week ${week_start}`);
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Error fetching weekly bonuses:', err);
    res.status(500).json({ error: 'Failed to fetch bonuses', message: err.message });
  }
});

// GET /bonuses/user/:user_id/week/:week_start - Get bonuses for specific user and week
router.get('/user/:user_id/week/:week_start', requireAdmin, async (req, res) => {
  try {
    const { user_id, week_start } = req.params;
    
    const query = `
      SELECT 
        ub.*,
        admin.full_name as added_by_name,
        approver.full_name as approved_by_name
      FROM user_bonuses ub
      JOIN users admin ON ub.added_by = admin.id
      LEFT JOIN users approver ON ub.approved_by = approver.id
      WHERE ub.user_id = $1 
      AND ub.week_start_date = $2
      AND ub.is_active = true
      ORDER BY ub.bonus_date
    `;
    
    const result = await pool.query(query, [user_id, week_start]);
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Error fetching user bonuses:', err);
    res.status(500).json({ error: 'Failed to fetch user bonuses', message: err.message });
  }
});

// POST /bonuses - Create new bonus
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { user_id, week_start_date, bonus_date, amount, description } = req.body;
    const added_by = req.currentUserId;
    
    console.log(`🎁 Creating bonus: User ${user_id}, Amount €${amount}`);
    
    // Validation
    if (!user_id || !week_start_date || !bonus_date || !amount || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (amount <= 0 || amount > 200) {
      return res.status(400).json({ error: 'Amount must be between €0.01 and €200.00' });
    }
    
    if (description.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    
    // Check if user exists and is active
    const userCheck = await pool.query(
      'SELECT id, full_name FROM users WHERE id = $1 AND is_active = true',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }
    
    // Insert bonus (audit record will be created automatically by trigger)
    const insertQuery = `
      INSERT INTO user_bonuses (
        user_id, week_start_date, bonus_date, amount, description, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, status, created_at
    `;
    
    const result = await pool.query(insertQuery, [
      user_id, week_start_date, bonus_date, amount, description, added_by
    ]);
    
    const newBonus = result.rows[0];
    
    console.log(`✅ Bonus created with ID: ${newBonus.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Bonus created successfully',
      bonus: {
        id: newBonus.id,
        user_id,
        user_name: userCheck.rows[0].full_name,
        week_start_date,
        bonus_date,
        amount: parseFloat(amount),
        description,
        status: newBonus.status,
        created_at: newBonus.created_at
      }
    });
    
  } catch (err) {
    console.error('❌ Error creating bonus:', err);
    
    if (err.constraint === 'no_duplicate_bonus_per_day') {
      return res.status(409).json({ 
        error: 'Bonus already exists for this user on this date' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create bonus', message: err.message });
  }
});

// PUT /bonuses/:id - Update bonus
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const bonusId = req.params.id;
    const { amount, description, bonus_date } = req.body;
    const changed_by = req.currentUserId;
    
    console.log(`📝 Updating bonus ID: ${bonusId}`);
    
    // Validation
    if (amount && (amount <= 0 || amount > 200)) {
      return res.status(400).json({ error: 'Amount must be between €0.01 and €200.00' });
    }
    
    if (description && description.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    
    // Get current bonus data
    const currentBonus = await pool.query(
      'SELECT * FROM user_bonuses WHERE id = $1 AND is_active = true',
      [bonusId]
    );
    
    if (currentBonus.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (amount !== undefined) {
      updates.push(`amount = $${paramCount++}`);
      values.push(amount);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (bonus_date !== undefined) {
      updates.push(`bonus_date = $${paramCount++}`);
      values.push(bonus_date);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add bonus ID to values
    values.push(bonusId);
    
    const updateQuery = `
      UPDATE user_bonuses 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    const updatedBonus = result.rows[0];
    
    // Manual audit record for updates (with proper changed_by)
    await pool.query(`
      INSERT INTO user_bonus_audit (
        bonus_id, action_type, changed_by,
        old_amount, old_description, old_bonus_date,
        new_amount, new_description, new_bonus_date
      ) VALUES ($1, 'updated', $2, $3, $4, $5, $6, $7, $8)
    `, [
      bonusId, changed_by,
      currentBonus.rows[0].amount, currentBonus.rows[0].description, currentBonus.rows[0].bonus_date,
      updatedBonus.amount, updatedBonus.description, updatedBonus.bonus_date
    ]);
    
    console.log(`✅ Bonus ${bonusId} updated successfully`);
    
    res.json({
      success: true,
      message: 'Bonus updated successfully',
      bonus: updatedBonus
    });
    
  } catch (err) {
    console.error('❌ Error updating bonus:', err);
    res.status(500).json({ error: 'Failed to update bonus', message: err.message });
  }
});

// PUT /bonuses/:id/status - Approve/Reject bonus
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const bonusId = req.params.id;
    const { status } = req.body; // 'approved' or 'rejected'
    const approved_by = req.currentUserId;
    
    console.log(`🔄 Changing bonus ${bonusId} status to: ${status}`);
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }
    
    const updateQuery = `
      UPDATE user_bonuses 
      SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_active = true
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, approved_by, bonusId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus not found' });
    }
    
    // Create audit record for status change
    await pool.query(`
      INSERT INTO user_bonus_audit (
        bonus_id, action_type, changed_by, new_status
      ) VALUES ($1, $2, $3, $4)
    `, [bonusId, status, approved_by, status]);
    
    console.log(`✅ Bonus ${bonusId} ${status}`);
    
    res.json({
      success: true,
      message: `Bonus ${status} successfully`,
      bonus: result.rows[0]
    });
    
  } catch (err) {
    console.error('❌ Error updating bonus status:', err);
    res.status(500).json({ error: 'Failed to update bonus status', message: err.message });
  }
});

// DELETE /bonuses/:id - Soft delete bonus
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const bonusId = req.params.id;
    const deleted_by = req.currentUserId;
    
    console.log(`🗑️ Deleting bonus ID: ${bonusId}`);
    
    const deleteQuery = `
      UPDATE user_bonuses 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [bonusId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus not found' });
    }
    
    // Create audit record for deletion
    await pool.query(`
      INSERT INTO user_bonus_audit (
        bonus_id, action_type, changed_by
      ) VALUES ($1, 'deleted', $2)
    `, [bonusId, deleted_by]);
    
    console.log(`✅ Bonus ${bonusId} deleted`);
    
    res.json({
      success: true,
      message: 'Bonus deleted successfully'
    });
    
  } catch (err) {
    console.error('❌ Error deleting bonus:', err);
    res.status(500).json({ error: 'Failed to delete bonus', message: err.message });
  }
});

// GET /bonuses/:id/audit - Get audit trail for a bonus
router.get('/:id/audit', requireAdmin, async (req, res) => {
  try {
    const bonusId = req.params.id;
    
    const query = `
      SELECT 
        uba.action_type,
        u.full_name as changed_by_name,
        uba.changed_at,
        uba.old_amount,
        uba.new_amount,
        uba.old_description,
        uba.new_description,
        uba.old_status,
        uba.new_status,
        uba.change_reason
      FROM user_bonus_audit uba
      JOIN users u ON uba.changed_by = u.id
      WHERE uba.bonus_id = $1
      ORDER BY uba.changed_at DESC
    `;
    
    const result = await pool.query(query, [bonusId]);
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Error fetching bonus audit:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail', message: err.message });
  }
});

// GET /bonuses/summary/week/:week_start - Get bonus summary for a week
router.get('/summary/week/:week_start', requireAdmin, async (req, res) => {
  try {
    const { week_start } = req.params;
    
    const query = `
      SELECT 
        COUNT(*) as total_bonuses,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_bonuses,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bonuses,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_bonuses,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved_amount,
        COALESCE(SUM(amount), 0) as total_amount
      FROM user_bonuses 
      WHERE week_start_date = $1 
      AND is_active = true
    `;
    
    const result = await pool.query(query, [week_start]);
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('❌ Error fetching bonus summary:', err);
    res.status(500).json({ error: 'Failed to fetch bonus summary', message: err.message });
  }
});

module.exports = router; 