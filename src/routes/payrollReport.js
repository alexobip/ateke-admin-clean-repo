const express = require('express');
const router = express.Router();
const db = require('../db');

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

// Helper function to calculate worked hours and overtime
const calculateHoursAndOvertime = (clockIn, clockOut, normHours = 8) => {
  if (!clockIn || !clockOut) {
    return { worked_hours: 0, overtime: 0 };
  }
  
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const totalMinutes = (end - start) / (1000 * 60);
  const worked_hours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimals
  
  const overtime = Math.max(0, worked_hours - normHours);
  
  return { worked_hours, overtime };
};

// Helper function to get week range based on start day
const getWeekDateRange = (weekStartString) => {
  // Parse the week range string "11/07/2025 - 17/07/2025"
  const [startStr, endStr] = weekStartString.split(' - ');
  const [startDay, startMonth, startYear] = startStr.split('/');
  const [endDay, endMonth, endYear] = endStr.split('/');
  
  const weekStart = new Date(startYear, startMonth - 1, startDay);
  const weekEnd = new Date(endYear, endMonth - 1, endDay);
  
  return { weekStart, weekEnd };
};

// GET payroll report
router.get('/', async (req, res) => {
  try {
    const { year, week_start, week_start_day = 'Πέμπτη' } = req.query;
    
    if (!year || !week_start) {
      return res.status(400).json({ 
        error: 'Year and week_start parameters are required' 
      });
    }

    // Parse week range
    const { weekStart, weekEnd } = getWeekDateRange(week_start, week_start_day);
    
    console.log(`Fetching payroll data for ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    // Get all users with their basic info
    const usersQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.user_type_id,
        ut.title as user_type_title,
        u.department_id,
        d.name as department_name
      FROM users u
      LEFT JOIN user_type ut ON u.user_type_id = ut.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_active = true
    `;
    
    const usersResult = await db.query(usersQuery);
    const users = usersResult.rows;

    const payrollData = [];

    for (const user of users) {
      // Get user's salary settings (all that could apply to this week)
      const salaryQuery = `
        SELECT *
        FROM user_salary_settings 
        WHERE user_id = $1 
        AND effective_from <= $2
        ORDER BY effective_from DESC
      `;
      
      const salaryResult = await db.query(salaryQuery, [user.id, weekEnd]);
      const salarySettings = salaryResult.rows;

      // Get time entries for this user in the selected week
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
      
      const timeEntriesResult = await db.query(timeEntriesQuery, [
        user.id, 
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      ]);
      
      const timeEntries = timeEntriesResult.rows;

      // Skip users with no time entries for this week
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
        
        const { worked_hours } = calculateHoursAndOvertime(
          entry.clock_in_time, 
          entry.clock_out_time, 
          0 // Don't calculate overtime per entry, we'll do it per day
        );
        
        dailyEntries[dateKey].entries.push(entry);
        dailyEntries[dateKey].total_worked_hours += worked_hours;
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
          worked_hours: Math.round(dayData.total_worked_hours * 100) / 100,
          overtime: Math.round(actualOvertime * 100) / 100
        };
      });

      // Add user to payroll data
      payrollData.push({
        user_name: user.full_name,
        user_id: user.id,
        user_type: user.user_type_title,
        days_per_week: 5, // Default, could be made configurable
        week_start: weekStart.toISOString().split('T')[0],
        salary_settings: salarySettings,
        days: days
      });
    }

    console.log(`Returning payroll data for ${payrollData.length} users`);
    res.json(payrollData);

  } catch (err) {
    console.error('Error fetching payroll report:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

module.exports = router; 