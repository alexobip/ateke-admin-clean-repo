const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper function to get Greek day name
const getGreekDayName = (date) => {
  const dayNames = {
    0: 'Κυριακή',    // Sunday
    1: 'Δευτέρα',    // Monday  
    2: 'Τρίτη',      // Tuesday
    3: 'Τετάρτη',    // Wednesday
    4: 'Πέμπτη',     // Thursday
    5: 'Παρασκευή',  // Friday
    6: 'Σάββατο'     // Saturday
  };
  return dayNames[date.getDay()];
};

// GET /payroll-report
router.get('/', async (req, res) => {
  console.log('📊 Payroll report route hit');
  
  const { start_date, end_date } = req.query;

  // Validate required parameters
  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'start_date and end_date are required (YYYY-MM-DD format)'
    });
  }

  try {
    console.log(`🔍 Fetching payroll data for ${start_date} to ${end_date}`);

    // Get all active users with their basic info
    const usersQuery = `
      SELECT 
        u.id,
        u.full_name as user_name,
        u.user_type_id,
        ut.title as user_type,
        u.department_id,
        d.name as department_name
      FROM users u
      LEFT JOIN user_type ut ON u.user_type_id = ut.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_active = true
    `;
    
    const usersResult = await pool.query(usersQuery);
    const users = usersResult.rows;

    const payrollData = [];

    for (const user of users) {
      // Get user's salary settings (all that could apply to this period)
      const salaryQuery = `
        SELECT *
        FROM user_salary_settings 
        WHERE user_id = $1 
        AND effective_from <= $2
        ORDER BY effective_from DESC
      `;
      
      const salaryResult = await pool.query(salaryQuery, [user.id, end_date]);
      const salarySettings = salaryResult.rows;

      // Get time entries for this user in the selected period
      const timeEntriesQuery = `
        SELECT 
          te.*,
          p.title as project_name
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        WHERE te.user_id = $1 
        AND DATE(te.clock_in_time) >= $2
        AND DATE(te.clock_in_time) <= $3
        AND te.clock_out_time IS NOT NULL
        ORDER BY te.clock_in_time
      `;
      
      const timeEntriesResult = await pool.query(timeEntriesQuery, [
        user.id, 
        start_date,
        end_date
      ]);
      
      const timeEntries = timeEntriesResult.rows;

      // Skip users with no time entries for this period
      if (timeEntries.length === 0) {
        continue;
      }

      // Group time entries by date and calculate daily totals
      const dailyEntries = {};
      
      timeEntries.forEach(entry => {
        const entryDate = new Date(entry.clock_in_time);
        const dateKey = entryDate.toISOString().split('T')[0];
        
        if (!dailyEntries[dateKey]) {
          dailyEntries[dateKey] = {
            date: dateKey,
            day: getGreekDayName(entryDate),
            entries: [],
            total_worked_hours: 0,
            norm_hours: 8 // Default, will be overridden by salary settings
          };
        }
        
        // Calculate hours worked for this entry
        const clockIn = new Date(entry.clock_in_time);
        const clockOut = new Date(entry.clock_out_time);
        const hoursWorked = (clockOut - clockIn) / (1000 * 60 * 60);
        
        dailyEntries[dateKey].entries.push(entry);
        dailyEntries[dateKey].total_worked_hours += hoursWorked;
      });

      // Convert daily entries to the expected format
      const days = Object.values(dailyEntries).map(dayData => {
        // Get applicable salary setting for this date
        const applicableSalary = salarySettings.find(s => 
          new Date(s.effective_from) <= new Date(dayData.date)
        ) || salarySettings[0]; // Fallback to most recent

        const normHours = applicableSalary ? 
          parseFloat(applicableSalary.norm_daily_hours || 8) : 8;
        
        // Calculate overtime based on total worked hours vs norm hours
        const actualOvertime = Math.max(0, dayData.total_worked_hours - normHours);

        return {
          date: dayData.date,
          day: dayData.day,
          norm_hours: normHours,
          worked_hours: Math.round(dayData.total_worked_hours * 10) / 10, // Round to 1 decimal
          overtime: Math.round(actualOvertime * 10) / 10 // Round to 1 decimal
        };
      });

      // Add user to payroll data
      payrollData.push({
        user_name: user.user_name,
        user_id: user.id,
        user_type: user.user_type,
        week_start: start_date,
        salary_settings: salarySettings, // Real database records with effective_from
        days: days // Real time entry data
      });
    }

    console.log(`✅ Returning payroll data for ${payrollData.length} users`);
    res.json(payrollData);

  } catch (err) {
    console.error('❌ Error fetching payroll report:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

module.exports = router; 