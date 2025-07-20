-- ===================================================================
-- WORKDAYS SYSTEM - REAL EXAMPLES
-- Show the difference between current and new calculation methods
-- ===================================================================

-- Example User: Maria (User Type 1 - Monthly Salary)
-- Current: days_per_week = 5
-- New: works_monday=true, works_tuesday=true, works_wednesday=false, works_thursday=true, works_friday=true, works_saturday=false, works_sunday=false

-- Example Week Time Entries for Maria:
-- Monday: 8 hours (regular workday)
-- Tuesday: 8 hours (regular workday)  
-- Wednesday: 6 hours (NOT supposed to work - EXTRA DAY)
-- Thursday: 8 hours (regular workday)
-- Friday: 7 hours (regular workday)
-- Saturday: 4 hours (NOT supposed to work - EXTRA DAY)

-- ===================================================================
-- CURRENT SYSTEM CALCULATION (WRONG for Type 1 & 2):
-- ===================================================================
/*
Total Hours: 41 hours
All hours treated as regular work
Total Pay: 41 × hourly_rate = €X
Problem: Maria gets paid twice (monthly salary + weekly calculation)
*/

-- ===================================================================
-- NEW SYSTEM CALCULATION (CORRECT for Type 1 & 2):
-- ===================================================================
/*
Regular Days (Mon, Tue, Thu, Fri): 31 hours → €0 (paid in monthly salary)
Extra Days (Wed, Sat): 10 hours → €Y (overtime pay only)
Total Weekly Pay: €Y (only overtime)
Result: No double payment, overtime properly compensated
*/

-- Example Test Query to Show the Difference:
SELECT 
  'Current System' as calculation_method,
  41 as total_hours,
  41 as billable_hours,
  41 * 15 as weekly_pay_euros,
  'Double payment issue' as notes

UNION ALL

SELECT 
  'New System' as calculation_method,
  41 as total_hours,
  10 as billable_hours,  -- Only extra days
  10 * 20 as weekly_pay_euros,  -- Higher overtime rate
  'Correct - no double payment' as notes;

-- ===================================================================
-- User Type 3 Example (No Change):
-- ===================================================================
/*
User: John (User Type 3 - Hourly/Daily)
All days count as regular work (current system continues)
Monday-Sunday: All hours → calculated as before
*/

-- ===================================================================
-- Visual Example for UI:
-- ===================================================================
/*
CURRENT UI (UserSalarySettingsPanel):
[Days per week: 5]

NEW UI (UserSalarySettingsPanel):
Workdays:
[✓] Mon  [✓] Tue  [✗] Wed  [✓] Thu  [✓] Fri  [✗] Sat  [✗] Sun

PAYROLL REPORT CHANGES:
User Type 1 & 2:
- Regular Hours: 31h → €0.00 (Monthly salary covers this)
- Extra Hours: 10h → €200.00 (Overtime compensation)
- Total: €200.00

User Type 3:
- Total Hours: 41h → €615.00 (Current calculation)
- No change to existing logic
*/

-- ===================================================================
-- Migration Query Example:
-- ===================================================================
/*
Before Migration:
user_id: 50.00.13.1001
days_per_week: 5

After Migration:
user_id: 50.00.13.1001  
days_per_week: 5 (kept for backup)
works_monday: true
works_tuesday: true
works_wednesday: true
works_thursday: true
works_friday: true
works_saturday: false
works_sunday: false
*/ 